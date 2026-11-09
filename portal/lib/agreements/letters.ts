import { db } from '@/lib/mongodb/db-client';
import { ensureNotificationsReset } from '@/lib/notifications/server';
import { formatDay, todayIst } from '@/lib/onboarding/meta';
import { isAllowedInCompany } from '@/lib/permissions/company';
import type { SessionUser } from '@/lib/permissions/server';
import { getCompanyAccess, nowIso } from '@/lib/workspace/server';
import {
  type Agreement,
  AGREEMENT_CATEGORY,
  AGREEMENT_STATUS,
  type LetterKind,
  type LetterRequest,
} from '@/models/agreements';
import { NotificationType } from '@/models/shared/enums';
import type { Company, CompanyMember } from '@/models/workspace';

import { personFacts } from './autofill';
import { sendAgreementEmail } from './emails';
import {
  AgreementError,
  type AgreementInput,
  approveAgreement,
  isDay,
  type Meta,
  pdfUrlFor,
  renderAgreement,
  requireAgreements,
  sendAgreement,
  text,
} from './server';
import { getSavedSignature, getSettings, signatoryFor } from './signers';
import { fillAgreement, templateFields } from './templates';

/*
 * Letters on request: someone asks for an experience, relieving, salary or
 * address letter (or an employment certificate). HR or an owner checks the
 * draft, filled from what the Portal knows, and approves it; the company's
 * signatory signs it (one click with their saved signature), and the
 * signed PDF is emailed to the person and kept in their documents.
 */

export interface LetterKindDef {
  kind: LetterKind;
  label: string;
  /** What it is for, under the choice. */
  hint: string;
  /** Pay in it: HR and owners only. */
  confidential: boolean;
  body: string;
}

const FOR_PURPOSE = '{{forPurpose}}';

export const LETTER_KINDS: LetterKindDef[] = [
  {
    kind: 'experience',
    label: 'Experience letter',
    hint: 'Your role and how long you worked here.',
    confidential: false,
    body: `# Experience Letter

{{today}}

**{{addressedTo}}**

This is to certify that **{{name}}** worked with {{companyName}} as **{{title}}** from {{joiningDate}} to {{lastDay}}.

We thank {{firstName}} for the work done with us and wish them every success in the future.`,
  },
  {
    kind: 'relieving',
    label: 'Relieving letter',
    hint: 'Confirms you were relieved of your duties on your last day.',
    confidential: false,
    body: `# Relieving Letter

{{today}}

Dear {{name}},

This is to confirm that your resignation from the position of **{{title}}** has been accepted, and that you are relieved of your duties at {{companyName}} at the close of business on **{{lastDay}}**.

You joined us on {{joiningDate}}. We thank you for your time with us and wish you every success.`,
  },
  {
    kind: 'salary',
    label: 'Salary certificate',
    hint: 'Your current pay, for a bank, a loan or a visa.',
    confidential: true,
    body: `# Salary Certificate

{{today}}

**{{addressedTo}}**

This is to certify that **{{name}}** has been working with {{companyName}} as **{{title}}** since {{joiningDate}}, and that their current pay is **{{pay}}**.

This certificate is issued at their request${FOR_PURPOSE}.`,
  },
  {
    kind: 'address',
    label: 'Address proof letter',
    hint: 'Your address as the company has it on record.',
    confidential: false,
    body: `# Address Proof Letter

{{today}}

**{{addressedTo}}**

This is to certify that **{{name}}**, working with {{companyName}} as **{{title}}** since {{joiningDate}}, lives at the following address, as recorded with us:

{{address}}

This letter is issued at their request${FOR_PURPOSE}.`,
  },
  {
    kind: 'employment',
    label: 'Employment certificate',
    hint: 'Confirms you work here now, with your role and joining day.',
    confidential: false,
    body: `# Employment Certificate

{{today}}

**{{addressedTo}}**

This is to certify that **{{name}}** is working with {{companyName}} as **{{title}}**, and has been with us since {{joiningDate}}.

This certificate is issued at their request${FOR_PURPOSE}.`,
  },
];

export const LETTER_KEYS = LETTER_KINDS.map((k) => k.kind);
export const letterKind = (kind: string) =>
  LETTER_KINDS.find((k) => k.kind === kind) ?? null;

/** The blanks a letter can have, with how they read in the form. */
export const LETTER_BLANKS: Record<string, string> = {
  name: 'Full name',
  firstName: 'First name',
  title: 'Role',
  joiningDate: 'Joining date',
  lastDay: 'Last working day',
  pay: 'Pay',
  address: 'Address',
  addressedTo: 'Addressed to',
  forPurpose: 'Purpose',
};

const MAX_OPEN = 3;

/* ---------------------------------- views --------------------------------- */

export type LetterStatus =
  | 'REQUESTED'
  | 'SIGNING'
  | 'READY'
  | 'NOT_SIGNED'
  | 'DECLINED'
  | 'CANCELLED';

export interface LetterView {
  id: string;
  companyId: string;
  companyName: string;
  person: { id: string; name: string; email: string | null };
  kind: LetterKind;
  label: string;
  purpose: string | null;
  addressedTo: string | null;
  neededBy: string | null;
  note: string | null;
  status: LetterStatus;
  requestedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  declineReason: string | null;
  agreementId: string | null;
  /** Who it's waiting on while it's being signed. */
  waitingOn: string | null;
  pdfUrl: string | null;
}

async function viewsOf(requests: LetterRequest[]): Promise<LetterView[]> {
  if (!requests.length) return [];
  const [people, companies, agreements] = await Promise.all([
    db.user.findMany({
      where: {
        id: {
          in: Array.from(
            new Set(
              requests.flatMap((r) => [r.userId, r.decidedById ?? r.userId]),
            ),
          ),
        },
      },
      select: { id: true, name: true, email: true },
    }),
    db.company.findMany({
      where: {
        id: { in: Array.from(new Set(requests.map((r) => r.companyId))) },
      },
    }) as Promise<Company[]>,
    db.agreement.findMany({
      where: {
        id: {
          in: requests.map((r) => r.agreementId).filter(Boolean) as string[],
        },
      },
    }) as Promise<Agreement[]>,
  ]);
  const person = (id: string) =>
    (people as Array<{ id: string; name?: string; email?: string }>).find(
      (u) => u.id === id,
    );
  return requests
    .map((r) => {
      const a = agreements.find((x) => x.id === r.agreementId) ?? null;
      const status: LetterStatus =
        r.status !== 'SENT'
          ? r.status
          : !a
            ? 'NOT_SIGNED'
            : a.status === AGREEMENT_STATUS.COMPLETED
              ? 'READY'
              : a.status === AGREEMENT_STATUS.SENT
                ? 'SIGNING'
                : 'NOT_SIGNED';
      const who = person(r.userId);
      return {
        id: r.id,
        companyId: r.companyId,
        companyName:
          companies.find((c) => c.id === r.companyId)?.name || 'Company',
        person: {
          id: r.userId,
          name: who?.name || 'Someone',
          email: who?.email ?? null,
        },
        kind: r.kind,
        label: letterKind(r.kind)?.label ?? 'Letter',
        purpose: r.purpose ?? null,
        addressedTo: r.addressedTo ?? null,
        neededBy: r.neededBy ?? null,
        note: r.note ?? null,
        status,
        requestedAt: r.createdAt as unknown as string,
        decidedAt: r.decidedAt ?? null,
        decidedBy: r.decidedById ? (person(r.decidedById)?.name ?? null) : null,
        declineReason: r.declineReason ?? null,
        agreementId: r.agreementId ?? null,
        waitingOn:
          status === 'SIGNING'
            ? (a!.signers.find((s) => !s.signature)?.name ?? null)
            : null,
        pdfUrl: status === 'READY' && a ? pdfUrlFor(a.id) : null,
      };
    })
    .sort((x, y) => String(y.requestedAt).localeCompare(String(x.requestedAt)));
}

/* ------------------------------ the requester ----------------------------- */

/** The companies someone can ask for a letter in: the ones they're in. */
async function memberships(userId: string) {
  const members: CompanyMember[] = await db.companyMember.findMany({
    where: { userId, status: 'ACTIVE' },
  });
  const companies: Company[] = members.length
    ? await db.company.findMany({
        where: { id: { in: members.map((m) => m.companyId) } },
      })
    : [];
  return companies.map((c) => ({ id: c.id, name: c.name }));
}

/** Someone's own letter requests, and where they can ask. */
export async function myLetters(user: SessionUser) {
  const requests: LetterRequest[] = await db.letterRequest.findMany({
    where: { userId: user.id },
    take: 100,
  });
  return {
    requests: await viewsOf(requests),
    companies: await memberships(user.id),
    kinds: LETTER_KINDS.map(({ kind, label, hint }) => ({ kind, label, hint })),
  };
}

/** Who hears about a new request: HR and owners. */
async function lettersTeam(companyId: string) {
  const members: CompanyMember[] = await db.companyMember.findMany({
    where: { companyId, status: 'ACTIVE' },
    take: 500,
  });
  const out: string[] = [];
  for (const m of members) {
    const access = await getCompanyAccess(m.userId, companyId);
    if (
      isAllowedInCompany(
        { id: m.userId } as SessionUser,
        access,
        'confidential:read',
      ) &&
      isAllowedInCompany(
        { id: m.userId } as SessionUser,
        access,
        'agreements:create',
      )
    )
      out.push(m.userId);
  }
  return out;
}

const lettersLink = (origin: string, companyId: string, id?: string) =>
  `${origin}/admin?tab=agreements&companyId=${companyId}&view=letters${id ? `&letter=${id}` : ''}`;

/** Asks for a letter. HR and owners hear about it. */
export async function requestLetter(
  user: SessionUser,
  raw: any,
  origin: string,
) {
  const companyId = text(raw?.companyId, 40);
  const companies = await memberships(user.id);
  const company = companies.find((c) => c.id === companyId);
  if (!company) throw new AgreementError(404, 'Company not found.');
  const def = letterKind(raw?.kind);
  if (!def) throw new AgreementError(400, 'Pick the letter you need.');
  const open: LetterRequest[] = await db.letterRequest.findMany({
    where: { userId: user.id, companyId, kind: def.kind, status: 'REQUESTED' },
  });
  if (open.length >= MAX_OPEN)
    throw new AgreementError(
      409,
      `You already asked for this letter. It's with ${company.name}'s HR.`,
    );
  const neededBy = isDay(raw?.neededBy) ? raw.neededBy : null;
  if (neededBy && neededBy < todayIst())
    throw new AgreementError(400, 'The day you need it by is in the past.');
  const at = nowIso();
  const created: LetterRequest = await db.letterRequest.create({
    data: {
      companyId,
      userId: user.id,
      kind: def.kind,
      purpose: text(raw?.purpose, 160) || null,
      addressedTo: text(raw?.addressedTo, 160) || null,
      neededBy,
      note: text(raw?.note, 1000) || null,
      status: 'REQUESTED',
      agreementId: null,
      createdAt: at,
      updatedAt: at,
    },
  });
  // HR and owners: in the Portal and by email.
  const team = (await lettersTeam(companyId)).filter((id) => id !== user.id);
  if (team.length) {
    await ensureNotificationsReset();
    const now = new Date();
    await db.notification.createMany({
      data: team.map((userId) => ({
        userId,
        title: 'Letter requested',
        description: `${user.name || 'Someone'} · ${def.label}`,
        matchId: created.id,
        matchType: 'LetterRequest',
        notificationType: NotificationType.SELF_GENERATED,
        notificationData: {
          kind: 'agreement',
          actions: [
            {
              title: 'Review',
              trigger_type: 'link',
              trigger: lettersLink('', companyId, created.id),
            },
          ],
        },
        isRead: false,
        createdAt: now,
        updatedAt: now,
      })),
    });
    const people = await db.user.findMany({
      where: { id: { in: team } },
      select: { id: true, name: true, email: true },
    });
    for (const p of people as Array<{
      id: string;
      name?: string;
      email?: string;
    }>)
      if (p.email)
        await sendAgreementEmail(
          {
            kind: 'letterRequested',
            to: p.email,
            firstName: (p.name || '').split(/\s+/)[0] || 'there',
            companyName: company.name,
            title: def.label,
            signUrl: lettersLink(origin, companyId, created.id),
            sender: { name: user.name || 'Someone', email: user.email ?? null },
            requestedBy: user.name || 'Someone',
            purpose: created.purpose ?? null,
            message: created.note ?? null,
            forTeam: true,
          },
          `letter-${created.id}-requested-${p.id}`,
        ).catch((e) => console.error('[letters] email', e));
  }
  return (await viewsOf([created]))[0];
}

/** Withdraws one's own request before HR acts on it. */
export async function cancelLetter(user: SessionUser, id: string) {
  const r: LetterRequest | null = await db.letterRequest.findFirst({
    where: { id, userId: user.id },
  });
  if (!r) throw new AgreementError(404, 'Request not found.');
  if (r.status !== 'REQUESTED')
    throw new AgreementError(409, 'HR already acted on this request.');
  await db.letterRequest.update({
    where: { id },
    data: { status: 'CANCELLED', updatedAt: nowIso() },
  });
}

/* ---------------------------------- HR ------------------------------------ */

/** HR and owners: agreements and confidential documents. */
async function requireLetters(actor: SessionUser, companyId: string) {
  await requireAgreements(actor, companyId, 'agreements:create');
  const access = await getCompanyAccess(actor.id, companyId);
  if (!isAllowedInCompany(actor, access, 'confidential:read'))
    throw new AgreementError(403, 'Letters are handled by HR and owners.');
}

export async function companyLetters(actor: SessionUser, companyId: string) {
  await requireLetters(actor, companyId);
  const requests: LetterRequest[] = await db.letterRequest.findMany({
    where: { companyId },
    take: 500,
  });
  const views = await viewsOf(requests.filter((r) => r.status !== 'CANCELLED'));
  return {
    requests: views,
    open: views.filter((v) => v.status === 'REQUESTED').length,
    kinds: LETTER_KINDS.map(({ kind, label, hint }) => ({ kind, label, hint })),
  };
}

async function loadRequest(actor: SessionUser, id: string) {
  const r: LetterRequest | null = /^[a-f0-9]{24}$/i.test(id)
    ? await db.letterRequest.findFirst({ where: { id } })
    : null;
  if (!r) throw new AgreementError(404, 'Request not found.');
  await requireLetters(actor, r.companyId);
  return r;
}

const firstOf = (name: string) => name.trim().split(/\s+/)[0] || name;

/** "Sun, 1 Feb 2026" → "1 Feb 2026": a letter doesn't name the weekday. */
const letterDay = (day: string) => day.replace(/^[A-Za-z]{3},\s*/, '');

/**
 * The letter as it would go out: the wording, and each blank filled from
 * the person's record (role, joining day, pay, address), which HR checks.
 */
export async function draftLetter(actor: SessionUser, id: string) {
  const r = await loadRequest(actor, id);
  const def = letterKind(r.kind)!;
  const person: { name?: string; email?: string } | null =
    await db.user.findFirst({
      where: { id: r.userId },
      select: { name: true, email: true },
    });
  const facts = person?.email
    ? await personFacts(r.companyId, person.email, { pay: true })
    : {};
  const member: CompanyMember | null = await db.companyMember.findFirst({
    where: { companyId: r.companyId, userId: r.userId },
  });
  const name = facts.LegalName || person?.name || '';
  const left = (member as { leftAt?: string } | null)?.leftAt;
  const values: Record<string, string> = {
    name,
    firstName: firstOf(name),
    title: facts.Title || '',
    joiningDate: letterDay(facts.JoiningDate || ''),
    lastDay: left ? letterDay(formatDay(String(left).slice(0, 10))) : '',
    pay: facts.Pay || '',
    address: facts.Address || '',
    addressedTo: r.addressedTo || 'To whom it may concern',
    forPurpose: r.purpose ? `for ${r.purpose.replace(/^for\s+/i, '')}` : '',
  };
  const blanks = templateFields(def.label, def.body).filter(
    (k) => k in LETTER_BLANKS,
  );
  return {
    request: (await viewsOf([r]))[0],
    title: def.label,
    body: def.body,
    confidential: def.confidential,
    blanks: blanks.map((key) => ({
      key,
      label: LETTER_BLANKS[key],
      value: values[key] ?? '',
      // The purpose may be empty; everything else must be filled.
      optional: key === 'forPurpose',
    })),
    signatory: await signatoryFor(r.companyId),
    canSignNow: await canSignNow(actor, r.companyId),
  };
}

/** Whether the person approving signs for the company and saved a signature. */
async function canSignNow(actor: SessionUser, companyId: string) {
  const [signatory, saved, settings] = await Promise.all([
    signatoryFor(companyId),
    getSavedSignature(actor.id),
    getSettings(companyId),
  ]);
  const rule = settings.types[AGREEMENT_CATEGORY.LETTER]?.signer ?? 'owner';
  return (
    !!saved &&
    (rule === 'lead' || (rule !== 'none' && signatory?.id === actor.id))
  );
}

/** "…at their request{{forPurpose}}." with or without a purpose. */
export const withPurposeText = (body: string, purpose?: string | null) =>
  body.replaceAll(FOR_PURPOSE, purpose?.trim() ? ` ${purpose.trim()}` : '');

const cleanValues = (raw: unknown) => {
  const out: Record<string, string> = {};
  if (raw && typeof raw === 'object')
    for (const [k, v] of Object.entries(raw))
      if (k in LETTER_BLANKS && typeof v === 'string')
        out[k] = v.replace(/[{}]/g, '').trim().slice(0, 1000);
  return out;
};

/**
 * Approves a request: the letter goes to the company's signatory to sign,
 * or, when that is the person approving and they saved their signature,
 * is signed there and then.
 */
export async function approveLetter(
  actor: SessionUser,
  id: string,
  raw: { values?: unknown; body?: unknown; sign?: unknown },
  meta: Meta,
  origin: string,
) {
  const r = await loadRequest(actor, id);
  if (r.status === 'DECLINED' || r.status === 'CANCELLED')
    throw new AgreementError(409, 'This request is closed.');
  if (r.status === 'SENT' && r.agreementId) {
    const a: Agreement | null = await db.agreement.findFirst({
      where: { id: r.agreementId },
    });
    if (
      a &&
      [AGREEMENT_STATUS.SENT, AGREEMENT_STATUS.COMPLETED].includes(a.status)
    )
      throw new AgreementError(409, 'This letter is already out for signing.');
  }
  const def = letterKind(r.kind)!;
  const values = cleanValues(raw.values);
  if (!values.forPurpose) values.forPurpose = '';
  const body =
    typeof raw.body === 'string' && raw.body.trim()
      ? raw.body.slice(0, 20_000)
      : def.body;
  // `{{forPurpose}}` may be blank: fill it before the rest is checked.
  const withPurpose = withPurposeText(body, values.forPurpose);
  delete values.forPurpose;
  const settings = await getSettings(r.companyId);
  const rule = settings.types[AGREEMENT_CATEGORY.LETTER]?.signer ?? 'owner';
  const input: AgreementInput = {
    companyId: r.companyId,
    title: def.label,
    body: withPurpose,
    category: AGREEMENT_CATEGORY.LETTER,
    // A letter is always signed for the company.
    companySigner: rule === 'none' ? 'owner' : null,
    companyFirst: false,
    confidential: def.confidential ? true : null,
    message: null,
    templateId: null,
    ordered: false,
    expiresOn: null,
    signers: [],
    ccEmails: [],
    values,
    companyName: null,
    fields: [],
    endsOn: null,
    previousId: null,
    linkKind: null,
    blocking: false,
    source: null,
    placements: null,
    emailCode: false,
    forUserId: r.userId,
    letterRequestId: r.id,
  };
  const preview = await renderAgreement(input, { pay: true });
  if (preview.missing.length)
    throw new AgreementError(
      400,
      `Fill in: ${preview.missing.map((m) => LETTER_BLANKS[m.key] ?? m.label).join(', ')}.`,
    );
  const { agreement } = await sendAgreement(actor, input, origin);
  await db.letterRequest.update({
    where: { id: r.id },
    data: {
      status: 'SENT',
      agreementId: agreement.id,
      decidedById: actor.id,
      decidedAt: nowIso(),
      updatedAt: nowIso(),
    },
  });
  let signed = false;
  if (raw.sign === true && (await canSignNow(actor, r.companyId))) {
    const up = agreement.signers.find((s) => s.company);
    if (up?.userId === actor.id) {
      await approveAgreement(actor, agreement, meta, origin, up.id);
      signed = true;
    }
  }
  const [view] = await viewsOf([
    (await db.letterRequest.findFirst({ where: { id: r.id } }))!,
  ]);
  return { request: view, agreementId: agreement.id, signed };
}

/** Declines a request, with a reason the person reads. */
export async function declineLetter(
  actor: SessionUser,
  id: string,
  rawReason: unknown,
  origin: string,
) {
  const r = await loadRequest(actor, id);
  if (r.status !== 'REQUESTED')
    throw new AgreementError(409, 'Only a request waiting for HR.');
  const reason = text(rawReason, 1000) || null;
  await db.letterRequest.update({
    where: { id: r.id },
    data: {
      status: 'DECLINED',
      declineReason: reason,
      decidedById: actor.id,
      decidedAt: nowIso(),
      updatedAt: nowIso(),
    },
  });
  const def = letterKind(r.kind)!;
  const [person, company] = await Promise.all([
    db.user.findFirst({
      where: { id: r.userId },
      select: { name: true, email: true },
    }) as Promise<{ name?: string; email?: string } | null>,
    db.company.findFirst({
      where: { id: r.companyId },
    }) as Promise<Company | null>,
  ]);
  if (person?.email)
    await sendAgreementEmail(
      {
        kind: 'letterDeclined',
        to: person.email,
        firstName: firstOf(person.name || 'there'),
        companyName: company?.name || 'The team',
        title: def.label,
        signUrl: '',
        sender: { name: actor.name || 'HR', email: actor.email ?? null },
        reason,
      },
      `letter-${r.id}-declined`,
    ).catch((e) => console.error('[letters] email', e));
  await notifyPerson(r.userId, r.id, 'Letter request declined', def.label);
  const [view] = await viewsOf([
    (await db.letterRequest.findFirst({ where: { id: r.id } }))!,
  ]);
  return view;
}

/** HR writes a letter for someone who didn't ask in the Portal. */
export async function startLetter(actor: SessionUser, raw: any) {
  const companyId = text(raw?.companyId, 40);
  await requireLetters(actor, companyId);
  const def = letterKind(raw?.kind);
  if (!def) throw new AgreementError(400, 'Pick a letter.');
  const userId = text(raw?.userId, 40);
  const member = await db.companyMember.findFirst({
    where: { companyId, userId },
  });
  if (!member)
    throw new AgreementError(404, 'That person isn’t in this company.');
  const at = nowIso();
  const created: LetterRequest = await db.letterRequest.create({
    data: {
      companyId,
      userId,
      kind: def.kind,
      purpose: text(raw?.purpose, 160) || null,
      addressedTo: text(raw?.addressedTo, 160) || null,
      neededBy: null,
      note: `Started by ${actor.name || 'HR'}`,
      status: 'REQUESTED',
      agreementId: null,
      createdAt: at,
      updatedAt: at,
    },
  });
  return draftLetter(actor, created.id);
}

async function notifyPerson(
  userId: string,
  matchId: string,
  title: string,
  description: string,
) {
  await ensureNotificationsReset();
  const now = new Date();
  await db.notification.createMany({
    data: [
      {
        userId,
        title,
        description,
        matchId,
        matchType: 'LetterRequest',
        notificationType: NotificationType.SELF_GENERATED,
        notificationData: {
          kind: 'agreement',
          actions: [
            {
              title: 'Open my documents',
              trigger_type: 'link',
              trigger: '/user?tab=documents',
            },
          ],
        },
        isRead: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
  });
}

/** The letter is signed: the person gets it by email and in the Portal. */
export async function letterSigned(
  agreement: Agreement,
  origin: string,
  pdf: { filename: string; base64: string } | null,
) {
  if (!agreement.forUserId) return;
  const [person, company, signatory] = await Promise.all([
    db.user.findFirst({
      where: { id: agreement.forUserId },
      select: { name: true, email: true },
    }) as Promise<{ name?: string; email?: string } | null>,
    db.company.findFirst({
      where: { id: agreement.companyId },
    }) as Promise<Company | null>,
    Promise.resolve(agreement.signers.find((s) => s.company) ?? null),
  ]);
  if (person?.email)
    await sendAgreementEmail(
      {
        kind: 'letterReady',
        to: person.email,
        firstName: firstOf(person.name || 'there'),
        companyName: company?.name || 'The team',
        title: agreement.title,
        signUrl: `${origin}/user?tab=documents`,
        sender: {
          name: signatory?.name || company?.name || 'The team',
          email: signatory?.email ?? null,
        },
        reference: agreement.id,
        companyLogo: (company?.logo as string | null) ?? null,
        pdf: pdf ?? null,
      },
      `letter-${agreement.id}-ready`,
    ).catch((e) => console.error('[letters] email', e));
  await notifyPerson(
    agreement.forUserId,
    agreement.letterRequestId ?? agreement.id,
    'Your letter is ready',
    `${agreement.title} · ${company?.name ?? ''}`.trim(),
  ).catch((e) => console.error('[letters] notify', e));
}

/** The filled title and text of a letter, for a preview. */
export function previewLetterText(
  body: string,
  values: Record<string, string>,
) {
  const v = cleanValues(values);
  const withPurpose = withPurposeText(body, v.forPurpose);
  return fillAgreement(withPurpose, v);
}
