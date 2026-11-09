import { db } from '@/lib/mongodb/db-client';
import { todayIst } from '@/lib/onboarding/meta';
import {
  type SessionUser,
  sessionUserFromRecord,
} from '@/lib/permissions/server';
import { nowIso } from '@/lib/workspace/server';
import {
  type Agreement,
  AGREEMENT_CATEGORY,
  AGREEMENT_STATUS,
  type AgreementTemplate,
  type PolicyRollout,
  type RolloutAudience,
} from '@/models/agreements';
import {
  type CompanyMember,
  MEMBER_STATUS,
  type Project,
} from '@/models/workspace';

import { isSendable } from './required';
import {
  AgreementError,
  parseAgreementInput,
  remindSigners,
  renderAgreement,
  requireAgreements,
  sendAgreement,
  text,
} from './server';
import { getSettings } from './signers';
import {
  fieldLabel,
  isPersonKey,
  MAX_AGREEMENT_BODY,
  MAX_AGREEMENT_MESSAGE,
  MAX_AGREEMENT_TITLE,
  STARTER_TEMPLATES,
  templateFields,
} from './templates';
import { requiredChecklist } from './vault';

/*
 * Policy rollouts: one policy (a code of conduct, a leave policy update)
 * sent to everyone, a project's team or a role, as one acknowledgement each.
 * The rollout tracks who acknowledged it and chases the rest. While it is
 * open, people who join the audience later get it too (daily, and whenever
 * someone presses Send to new people). Nobody countersigns an
 * acknowledgement: it would be one more click per person for the owner.
 */

/** Sent per request; the rest follow in the next calls or the daily run. */
export const ROLLOUT_BATCH = 40;

type Recipient = { userId: string; name: string; email: string };

function parseAudience(raw: any): RolloutAudience {
  if (raw?.kind === 'project' && typeof raw.projectId === 'string')
    return { kind: 'project', projectId: raw.projectId };
  if (raw?.kind === 'role' && typeof raw.roleKey === 'string' && raw.roleKey)
    return { kind: 'role', roleKey: raw.roleKey.slice(0, 40) };
  return { kind: 'everyone' };
}

/** Everyone the rollout is for right now, with an email to send to. */
async function audienceOf(
  companyId: string,
  audience: RolloutAudience,
  joinedBy: string | null,
): Promise<Recipient[]> {
  const members: CompanyMember[] = await db.companyMember.findMany({
    where: { companyId, status: MEMBER_STATUS.ACTIVE },
  });
  const joined = (m: CompanyMember) =>
    m.joinedAt instanceof Date
      ? m.joinedAt.toISOString()
      : m.joinedAt
        ? String(m.joinedAt)
        : '';
  let ids = members
    .filter((m) => !joinedBy || !joined(m) || joined(m) <= joinedBy)
    .filter(
      (m) =>
        audience.kind !== 'role' ||
        (m.roleKeys ?? []).includes(audience.roleKey),
    )
    .map((m) => m.userId);
  if (audience.kind === 'project') {
    const project: Project | null = await db.project.findFirst({
      where: { id: audience.projectId, companyId },
    });
    const team = new Set([
      ...((project?.memberIds as string[] | undefined) ?? []),
      ...((project?.leadIds as string[] | undefined) ?? []),
    ]);
    ids = ids.filter((id) => team.has(id));
  }
  if (!ids.length) return [];
  const users = await db.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true },
  });
  return users
    .filter((u: { email?: string | null }) => !!u.email)
    .map((u: { id: string; name?: string; email: string }) => ({
      userId: u.id,
      name: u.name || u.email,
      email: u.email.toLowerCase(),
    }));
}

const rolloutAgreements = (rolloutId: string): Promise<Agreement[]> =>
  db.agreement.findMany({ where: { rolloutId }, take: 5000 });

const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000)
    .toISOString()
    .slice(0, 10);

/** The template a rollout starts from: the company's own, or a starter. */
async function templateFor(companyId: string, templateId: string | null) {
  if (!templateId) return null;
  if (templateId.startsWith('starter:')) {
    const s = STARTER_TEMPLATES.find((t) => `starter:${t.key}` === templateId);
    return s ? { id: null, version: null } : null;
  }
  const t: AgreementTemplate | null = await db.agreementTemplate.findFirst({
    where: { id: templateId, companyId },
  });
  return t ? { id: t.id, version: t.version ?? 1 } : null;
}

/** One person's acknowledgement of a rollout. */
function sendRolloutTo(
  actor: SessionUser,
  rollout: PolicyRollout,
  p: { name: string; email: string },
  origin: string,
  blocking?: boolean,
) {
  return sendAgreement(
    actor,
    parseAgreementInput({
      companyId: rollout.companyId,
      title: rollout.title,
      body: rollout.body,
      category: AGREEMENT_CATEGORY.POLICY,
      companySigner: 'none',
      confidential: false,
      message: rollout.message,
      templateId: rollout.templateId,
      signers: [{ name: p.name, email: p.email, role: 'Team member' }],
      values: rollout.values ?? {},
      blocking: blocking ?? rollout.blocking,
      expiresOn: rollout.daysToSign
        ? addDays(todayIst(), rollout.daysToSign)
        : null,
    }),
    origin,
    { rolloutId: rollout.id, templateVersion: rollout.templateVersion },
  );
}

/**
 * Sends a required document to everyone who is missing it (or the people
 * named), a batch at a time: from its rollout, or from its template with the
 * blanks filled once for everyone and each person's own filled from their
 * records.
 */
export async function sendMissing(
  actor: SessionUser,
  companyId: string,
  requirementId: string,
  raw: any,
  origin: string,
) {
  await requireAgreements(actor, companyId, 'agreements:create');
  const [settings, checklist] = await Promise.all([
    getSettings(companyId),
    requiredChecklist(actor, companyId, origin),
  ]);
  const req = settings.required.find((r) => r.id === requirementId);
  if (!req) throw new AgreementError(404, 'That requirement is gone.');
  if (!isSendable(req))
    throw new AgreementError(
      409,
      `${req.label} comes from onboarding. Send it from the hire's onboarding.`,
    );
  const only = Array.isArray(raw?.userIds)
    ? new Set(raw.userIds.filter((x: unknown) => typeof x === 'string'))
    : null;
  const todo = checklist.people.filter(
    (p) =>
      p.items[req.id]?.state === 'missing' &&
      p.email &&
      (!only || only.has(p.userId)),
  );
  const rollout: PolicyRollout | null = req.rolloutId
    ? await db.policyRollout.findFirst({
        where: { id: req.rolloutId, companyId },
      })
    : null;
  let template: {
    id: string | null;
    title: string;
    body: string;
    category: AGREEMENT_CATEGORY;
    fields: unknown[];
  } | null = null;
  if (!rollout && req.templateId) {
    const starter = req.templateId.startsWith('starter:')
      ? STARTER_TEMPLATES.find((t) => `starter:${t.key}` === req.templateId)
      : null;
    const own: AgreementTemplate | null = starter
      ? null
      : await db.agreementTemplate.findFirst({
          where: { id: req.templateId, companyId },
        });
    const t = starter ?? own;
    if (t)
      template = {
        id: own?.id ?? null,
        title: t.title,
        body: t.body,
        category: t.category,
        fields: t.fields ?? [],
      };
  }
  if (!rollout && !template)
    throw new AgreementError(404, 'Its template or rollout is gone.');
  const values: Record<string, string> = {};
  if (raw?.values && typeof raw.values === 'object')
    for (const [k, v] of Object.entries(raw.values))
      if (/^\w{1,60}$/.test(k) && typeof v === 'string')
        values[k] = v.trim().slice(0, 4000);
  // Blanks that are the same for everyone are asked for once, up front.
  if (template) {
    const blank = templateFields(template.title, template.body).filter(
      (k) => !isPersonKey(k) && !values[k],
    );
    if (blank.length)
      throw new AgreementError(
        400,
        `Fill in: ${blank.map(fieldLabel).join(', ')}.`,
      );
  }
  const sent: string[] = [];
  const failed: Array<{ name: string; error: string }> = [];
  const limit = ROLLOUT_BATCH;
  for (const p of todo.slice(0, limit)) {
    try {
      if (rollout)
        await sendRolloutTo(
          actor,
          rollout,
          { name: p.name, email: p.email! },
          origin,
          req.blocking || rollout.blocking,
        );
      else
        await sendAgreement(
          actor,
          parseAgreementInput({
            companyId,
            title: template!.title,
            body: template!.body,
            category: template!.category,
            fields: template!.fields,
            templateId: template!.id,
            signers: [{ name: p.name, email: p.email }],
            values,
            message: raw?.message,
            expiresOn: raw?.expiresOn,
            blocking: req.blocking,
          }),
          origin,
        );
      sent.push(p.name);
    } catch (e) {
      failed.push({ name: p.name, error: (e as Error).message });
    }
  }
  return {
    sent,
    failed,
    remaining: Math.max(0, todo.length - sent.length - failed.length),
  };
}

/**
 * Sends the rollout to people in its audience who don't have it yet, up to
 * `limit` of them. Returns who it went to and how many are still to go.
 */
export async function syncRollout(
  actor: SessionUser,
  rollout: PolicyRollout,
  origin: string,
  limit = ROLLOUT_BATCH,
) {
  if (rollout.status !== 'OPEN') return { sent: [], remaining: 0, failed: [] };
  const [people, existing] = await Promise.all([
    audienceOf(
      rollout.companyId,
      rollout.audience,
      rollout.includeNewPeople ? null : rollout.sentAt,
    ),
    rolloutAgreements(rollout.id),
  ]);
  const have = new Set(
    existing.flatMap((a) => a.signers.map((s) => s.userId ?? s.email)),
  );
  const haveEmail = new Set(
    existing.flatMap((a) => a.signers.map((s) => s.email)),
  );
  const todo = people.filter(
    (p) => !have.has(p.userId) && !haveEmail.has(p.email),
  );
  const sent: string[] = [];
  const failed: Array<{ name: string; error: string }> = [];
  for (const p of todo.slice(0, limit)) {
    try {
      await sendRolloutTo(actor, rollout, p, origin);
      sent.push(p.name);
    } catch (e) {
      failed.push({ name: p.name, error: (e as Error).message });
    }
  }
  return {
    sent,
    failed,
    remaining: Math.max(0, todo.length - sent.length - failed.length),
  };
}

/** Checks a rollout before it starts: the text, the blanks, who it's for. */
async function prepareRollout(actor: SessionUser, raw: any) {
  const companyId = text(raw?.companyId, 40);
  await requireAgreements(actor, companyId, 'agreements:create');
  const title = text(raw?.title, MAX_AGREEMENT_TITLE);
  const body =
    typeof raw?.body === 'string' ? raw.body.slice(0, MAX_AGREEMENT_BODY) : '';
  if (!title || !body.trim())
    throw new AgreementError(400, 'Add a title and the policy text.');
  const values: Record<string, string> = {};
  if (raw?.values && typeof raw.values === 'object')
    for (const [k, v] of Object.entries(raw.values))
      if (/^\w{1,60}$/.test(k) && typeof v === 'string')
        values[k] = v.trim().slice(0, 4000);
  const audience = parseAudience(raw?.audience);
  const people = await audienceOf(companyId, audience, null);
  // Every blank but the person's own is filled once, for everyone.
  const sample = people[0] ?? { name: 'Someone', email: 'someone@example.com' };
  const check = await renderAgreement(
    parseAgreementInput({
      companyId,
      title,
      body,
      signers: [{ name: sample.name, email: sample.email }],
      values,
    }),
  );
  // Blanks about the person are filled for each of them as it goes out.
  const missing = check.missing.filter((m) => !isPersonKey(m.key));
  return { companyId, title, body, values, audience, people, check, missing };
}

/** What a rollout would send, and to whom, without sending it. */
export async function previewRollout(actor: SessionUser, raw: any) {
  const p = await prepareRollout(actor, raw);
  return {
    title: p.check.title,
    text: p.check.body,
    exampleFor: p.people[0]?.name ?? null,
    stillBlank: p.missing,
    people: p.people.map((x) => ({ name: x.name, email: x.email })),
  };
}

/** Starts a rollout and sends the first batch. */
export async function createRollout(
  actor: SessionUser,
  raw: any,
  origin: string,
) {
  const { companyId, title, body, values, audience, missing } =
    await prepareRollout(actor, raw);
  if (missing.length)
    throw new AgreementError(
      400,
      `Fill in: ${missing.map((m) => m.label).join(', ')}.`,
    );
  const template = await templateFor(
    companyId,
    typeof raw?.templateId === 'string' ? raw.templateId : null,
  );
  const days = Number(raw?.daysToSign);
  const at = nowIso();
  const rollout: PolicyRollout = await db.policyRollout.create({
    data: {
      companyId,
      title,
      body,
      values,
      message: text(raw?.message, MAX_AGREEMENT_MESSAGE) || null,
      templateId: template?.id ?? null,
      templateVersion: template?.version ?? null,
      audience,
      includeNewPeople: raw?.includeNewPeople !== false,
      blocking: raw?.blocking === true,
      daysToSign:
        Number.isInteger(days) && days > 0 && days <= 90 ? days : null,
      status: 'OPEN',
      sentAt: at,
      closedAt: null,
      createdById: actor.id,
      createdAt: at,
      updatedAt: at,
    },
  });
  const first = await syncRollout(actor, rollout, origin);
  return { rollout: await rolloutView(rollout), ...first };
}

export async function loadRollout(
  actor: SessionUser,
  id: string,
  permission: string,
) {
  if (!/^[a-f0-9]{24}$/i.test(id))
    throw new AgreementError(404, 'Rollout not found.');
  const r: PolicyRollout | null = await db.policyRollout.findFirst({
    where: { id },
  });
  if (!r) throw new AgreementError(404, 'Rollout not found.');
  await requireAgreements(actor, r.companyId, permission);
  return r;
}

const audienceText = async (r: PolicyRollout) => {
  if (r.audience.kind === 'everyone') return 'Everyone';
  if (r.audience.kind === 'role') {
    const role = await db.companyRole.findFirst({
      where: { companyId: r.companyId, key: r.audience.roleKey },
    });
    return `Everyone with the ${role?.name ?? r.audience.roleKey} role`;
  }
  const project = await db.project.findFirst({
    where: { id: r.audience.projectId },
    select: { name: true },
  });
  return `The ${project?.name ?? 'project'} team`;
};

/** A rollout with where everyone stands. */
export async function rolloutView(r: PolicyRollout, withPeople = false) {
  const [agreements, people, creator] = await Promise.all([
    rolloutAgreements(r.id),
    r.status === 'OPEN'
      ? audienceOf(
          r.companyId,
          r.audience,
          r.includeNewPeople ? null : r.sentAt,
        )
      : Promise.resolve([] as Recipient[]),
    db.user.findFirst({ where: { id: r.createdById }, select: { name: true } }),
  ]);
  const rows = agreements.map((a) => {
    const s = a.signers.find((x) => !x.company) ?? a.signers[0];
    return {
      agreementId: a.id,
      userId: s?.userId ?? null,
      name: s?.name ?? 'Someone',
      email: s?.email ?? '',
      status: a.status,
      sentAt: a.sentAt,
      signedAt: s?.signature?.at ?? null,
      remindedAt: s?.remindedAt ?? null,
    };
  });
  const sentTo = new Set(rows.flatMap((x) => [x.userId, x.email]));
  const notYet = people.filter(
    (p) => !sentTo.has(p.userId) && !sentTo.has(p.email),
  );
  const count = (st: AGREEMENT_STATUS) =>
    rows.filter((x) => x.status === st).length;
  return {
    id: r.id,
    companyId: r.companyId,
    // "{{policyName}}: acknowledgement" reads as the policy's name.
    title: r.title.replace(
      /\{\{\s*(\w+)\s*\}\}/g,
      (m, k: string) => r.values?.[k] || m,
    ),
    status: r.status,
    audience: r.audience,
    audienceText: await audienceText(r),
    includeNewPeople: r.includeNewPeople,
    blocking: !!r.blocking,
    daysToSign: r.daysToSign ?? null,
    templateId: r.templateId ?? null,
    templateVersion: r.templateVersion ?? null,
    sentAt: r.sentAt,
    closedAt: r.closedAt ?? null,
    createdBy: creator?.name ?? 'Someone',
    counts: {
      total: rows.length + notYet.length,
      acknowledged: count(AGREEMENT_STATUS.COMPLETED),
      waiting: count(AGREEMENT_STATUS.SENT),
      declined: count(AGREEMENT_STATUS.DECLINED),
      closed: count(AGREEMENT_STATUS.EXPIRED) + count(AGREEMENT_STATUS.VOIDED),
      notSent: notYet.length,
    },
    ...(withPeople
      ? {
          people: [
            ...rows,
            ...notYet.map((p) => ({
              agreementId: null,
              userId: p.userId,
              name: p.name,
              email: p.email,
              status: 'NOT_SENT' as const,
              sentAt: null,
              signedAt: null,
              remindedAt: null,
            })),
          ].sort((a, b) => a.name.localeCompare(b.name)),
        }
      : {}),
  };
}

export type RolloutView = Awaited<ReturnType<typeof rolloutView>>;

export async function listRollouts(actor: SessionUser, companyId: string) {
  await requireAgreements(actor, companyId, 'agreements:read');
  const list: PolicyRollout[] = await db.policyRollout.findMany({
    where: { companyId },
    orderBy: { sentAt: 'desc' },
    take: 100,
  });
  return Promise.all(list.map((r) => rolloutView(r)));
}

/** Reminds everyone who hasn't acknowledged it yet, a batch at a time. */
export async function remindRollout(
  actor: SessionUser,
  r: PolicyRollout,
  origin: string,
  limit = 60,
) {
  await requireAgreements(actor, r.companyId, 'agreements:edit');
  const open = (await rolloutAgreements(r.id)).filter(
    (a) => a.status === AGREEMENT_STATUS.SENT,
  );
  // Those not reminded today first.
  const today = todayIst();
  const due = open.filter((a) =>
    a.signers.some(
      (s) => !s.signature && String(s.remindedAt ?? '').slice(0, 10) !== today,
    ),
  );
  let reminded = 0;
  const failed: string[] = [];
  for (const a of due.slice(0, limit)) {
    try {
      const res = await remindSigners(actor, a, null, origin);
      if (res.emailErrors.length) failed.push(a.signers[0]?.name ?? a.id);
      else reminded++;
    } catch {
      failed.push(a.signers[0]?.name ?? a.id);
    }
  }
  return { reminded, failed, remaining: Math.max(0, due.length - limit) };
}

export async function closeRollout(actor: SessionUser, r: PolicyRollout) {
  await requireAgreements(actor, r.companyId, 'agreements:edit');
  const at = nowIso();
  await db.policyRollout.update({
    where: { id: r.id },
    data: { status: 'CLOSED', closedAt: at, updatedAt: at },
  });
  return rolloutView({ ...r, status: 'CLOSED', closedAt: at });
}

/** The daily run: open rollouts go out to people who joined since. */
export async function syncOpenRollouts(origin: string, dryRun = false) {
  const open: PolicyRollout[] = await db.policyRollout.findMany({
    where: { status: 'OPEN' },
    take: 200,
  });
  let sent = 0;
  for (const r of open) {
    const record = await db.user.findFirst({ where: { id: r.createdById } });
    const actor = await sessionUserFromRecord(record);
    if (!actor) continue;
    if (dryRun) continue;
    const res = await syncRollout(actor, r, origin, 100).catch((e) => {
      console.error('[agreements] rollout', r.id, e);
      return { sent: [] as string[] };
    });
    sent += res.sent.length;
  }
  return { rollouts: open.length, sent };
}
