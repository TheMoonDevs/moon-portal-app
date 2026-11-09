import { createHash, randomBytes } from 'crypto';

import { db } from '@/lib/mongodb/db-client';
import { DOC_LABEL, todayIst } from '@/lib/onboarding/meta';
import { isAllowedInCompany } from '@/lib/permissions/company';
import type { SessionUser } from '@/lib/permissions/server';
import { getCompanyAccess, nowIso } from '@/lib/workspace/server';
import {
  type Agreement,
  AGREEMENT_CATEGORY,
  AGREEMENT_STATUS,
  type AgreementEvent,
  type AgreementSigner,
  type AgreementTemplate,
  SIGNER_STATUS,
} from '@/models/agreements';
import type { Onboarding } from '@/models/onboarding';
import { ONBOARDING_STEP } from '@/models/onboarding';
import type { Company } from '@/models/workspace';

import { type AgreementEmailKind, sendAgreementEmail } from './emails';
import {
  fieldLabel,
  fillAgreement,
  isCategory,
  MAX_AGREEMENT_BODY,
  MAX_AGREEMENT_MESSAGE,
  MAX_AGREEMENT_TITLE,
  MAX_SIGNERS,
  signerVariables,
  STARTER_TEMPLATES,
  templateFields,
} from './templates';

/*
 * Agreements, server side: sending one out, each signer's link, signing and
 * declining, reminders, withdrawing, and the audit trail behind all of it.
 * The onboarding flow keeps its own Trial Policy, NDA and offer documents;
 * they show up here too, read-only, so every signed agreement is in one list.
 */

export class AgreementError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const SIGN_TOKEN_PATTERN = /^[a-f0-9]{40}$/;

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isDay = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const sameName = (a: string, b: string) =>
  a.trim().replace(/\s+/g, ' ').toLowerCase() ===
  b.trim().replace(/\s+/g, ' ').toLowerCase();

const newId = () => randomBytes(6).toString('hex');
const newToken = () => randomBytes(20).toString('hex');

const OPEN_SIGNER = [
  SIGNER_STATUS.WAITING,
  SIGNER_STATUS.PENDING,
  SIGNER_STATUS.VIEWED,
];

/* --------------------------------- access --------------------------------- */

export async function requireAgreements(
  actor: SessionUser,
  companyId: string,
  permission: string,
) {
  const access = await getCompanyAccess(actor.id, companyId);
  if (!access?.member && !actor.isAdmin)
    throw new AgreementError(404, 'Company not found.');
  if (!isAllowedInCompany(actor, access, permission))
    throw new AgreementError(
      403,
      `This needs the ${permission} permission in the company.`,
    );
  return access;
}

export async function loadAgreement(
  actor: SessionUser,
  id: string,
  permission: string,
): Promise<Agreement> {
  if (!/^[a-f0-9]{24}$/i.test(id))
    throw new AgreementError(404, 'Agreement not found.');
  const agreement: Agreement | null = await db.agreement.findFirst({
    where: { id },
  });
  if (!agreement) throw new AgreementError(404, 'Agreement not found.');
  await requireAgreements(actor, agreement.companyId, permission);
  return expireIfDue(agreement);
}

/* -------------------------------- writing --------------------------------- */

type Change = {
  patch: Partial<Agreement>;
  events: Array<Omit<AgreementEvent, 'at'> & { at?: string }>;
};

/**
 * Applies a change made from the latest copy. Two signers signing at the same
 * moment can't overwrite each other: a write only lands on the revision it
 * was made from, and a clash is retried from the fresh copy.
 */
async function mutate(
  id: string,
  change: (agreement: Agreement) => Change | Promise<Change>,
): Promise<Agreement> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const current: Agreement | null = await db.agreement.findFirst({
      where: { id },
    });
    if (!current) throw new AgreementError(404, 'Agreement not found.');
    const { patch, events } = await change(current);
    const at = nowIso();
    const revision = current.revision ?? 0;
    const { count } = await db.agreement.updateMany({
      where: { id, revision },
      data: {
        ...patch,
        history: [
          ...(current.history ?? []),
          ...events.map((e) => ({ ...e, at: e.at ?? at })),
        ],
        revision: revision + 1,
        updatedAt: at,
      },
    });
    if (count) return (await db.agreement.findFirst({ where: { id } }))!;
  }
  throw new AgreementError(
    409,
    'This agreement changed while saving. Reload and try again.',
  );
}

/** Marks an agreement expired once its last signing day has passed. */
export async function expireIfDue(agreement: Agreement): Promise<Agreement> {
  if (
    agreement.status !== AGREEMENT_STATUS.SENT ||
    !agreement.expiresOn ||
    todayIst() <= agreement.expiresOn
  )
    return agreement;
  return mutate(agreement.id, (a) =>
    a.status !== AGREEMENT_STATUS.SENT
      ? { patch: {}, events: [] }
      : {
          patch: { status: AGREEMENT_STATUS.EXPIRED },
          events: [{ text: 'Expired before everyone signed' }],
        },
  );
}

/* --------------------------------- turns ---------------------------------- */

/** Signers whose turn it is: everyone left, or the next step when in order. */
export function signersUp(agreement: Agreement): AgreementSigner[] {
  const open = agreement.signers.filter((s) => OPEN_SIGNER.includes(s.status));
  if (!agreement.ordered || !open.length) return open;
  const next = Math.min(...open.map((s) => s.order));
  return open.filter((s) => s.order === next);
}

/* ---------------------------------- input --------------------------------- */

export interface SignerInput {
  name: string;
  email: string;
  role: string | null;
  order: number;
}

export function parseSigners(raw: unknown, ordered: boolean): SignerInput[] {
  if (!Array.isArray(raw) || !raw.length)
    throw new AgreementError(400, 'Add at least one person to sign.');
  if (raw.length > MAX_SIGNERS)
    throw new AgreementError(400, `Up to ${MAX_SIGNERS} people can sign.`);
  const seen = new Set<string>();
  return raw.map((r: any, i) => {
    const name = text(r?.name, 120);
    const email = text(r?.email, 200).toLowerCase();
    if (!name) throw new AgreementError(400, `Signer ${i + 1} needs a name.`);
    if (!isEmail(email))
      throw new AgreementError(400, `Signer ${i + 1} needs a valid email.`);
    if (seen.has(email))
      throw new AgreementError(400, `${email} is on the list twice.`);
    seen.add(email);
    const order = Number(r?.order);
    return {
      name,
      email,
      role: text(r?.role, 60) || null,
      order: ordered
        ? Number.isInteger(order) && order > 0 && order <= MAX_SIGNERS
          ? order
          : i + 1
        : 1,
    };
  });
}

export interface AgreementInput {
  companyId: string;
  title: string;
  body: string;
  category: AGREEMENT_CATEGORY;
  message: string | null;
  templateId: string | null;
  ordered: boolean;
  expiresOn: string | null;
  signers: SignerInput[];
  ccEmails: string[];
  /** Values for the template's blanks. */
  values: Record<string, string>;
  /** The company's name as it reads in the agreement. */
  companyName: string | null;
}

/** An agreement to send, from an untrusted body, with every field checked. */
export function parseAgreementInput(raw: any): AgreementInput {
  const companyId = text(raw?.companyId, 40);
  if (!companyId) throw new AgreementError(400, 'companyId is required.');
  const title = text(raw?.title, MAX_AGREEMENT_TITLE);
  const body =
    typeof raw?.body === 'string' ? raw.body.slice(0, MAX_AGREEMENT_BODY) : '';
  if (!title || !body.trim())
    throw new AgreementError(400, 'Add a title and the agreement text.');
  const ordered = raw?.ordered === true;
  const expiresOn = isDay(raw?.expiresOn) ? raw.expiresOn : null;
  if (expiresOn && expiresOn < todayIst())
    throw new AgreementError(400, 'The signing deadline is in the past.');
  const values: Record<string, string> = {};
  if (raw?.values && typeof raw.values === 'object')
    for (const [k, v] of Object.entries(raw.values))
      if (/^\w{1,60}$/.test(k) && typeof v === 'string')
        values[k] = v.trim().slice(0, 4000);
  const ccEmails = Array.isArray(raw?.ccEmails)
    ? Array.from(
        new Set(
          raw.ccEmails
            .map((e: unknown) => text(e, 200).toLowerCase())
            .filter(isEmail),
        ),
      ).slice(0, 10)
    : [];
  return {
    companyId,
    title,
    body,
    category: isCategory(raw?.category)
      ? raw.category
      : AGREEMENT_CATEGORY.OTHER,
    message: text(raw?.message, MAX_AGREEMENT_MESSAGE) || null,
    templateId: text(raw?.templateId, 60) || null,
    ordered,
    expiresOn,
    signers: parseSigners(raw?.signers, ordered),
    ccEmails: ccEmails as string[],
    values,
    companyName: text(raw?.companyName, 120) || null,
  };
}

/** The title and text as the signers will read them, every blank filled. */
export async function renderAgreement(input: AgreementInput) {
  const company: Company | null = await db.company.findFirst({
    where: { id: input.companyId },
  });
  const vars: Record<string, string> = {
    ...input.values,
    companyName: input.companyName || company?.name || 'The company',
    today: new Date(`${todayIst()}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
    ...signerVariables(input.signers),
  };
  const missing = templateFields(input.title, input.body).filter(
    (k) => !input.values[k],
  );
  return {
    title: fillAgreement(input.title, vars).trim(),
    body: fillAgreement(input.body, vars).trim(),
    missing: missing.map((key) => ({ key, label: fieldLabel(key) })),
    company,
  };
}

/* --------------------------------- people --------------------------------- */

type Person = { id: string | null; name: string; email: string | null };

async function personById(userId: string | null | undefined): Promise<Person> {
  const user = userId
    ? await db.user.findFirst({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      })
    : null;
  return {
    id: user?.id ?? null,
    name: user?.name || 'The team',
    email: user?.email ?? null,
  };
}

async function companyOf(companyId: string) {
  const company: Company | null = await db.company.findFirst({
    where: { id: companyId },
  });
  return {
    name: company?.name || 'The team',
    logo: (company?.logo as string | null) ?? null,
  };
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

export const signUrl = (origin: string, signer: { token: string }) =>
  `${origin}/sign/${signer.token}`;

/* --------------------------------- emails --------------------------------- */

/** Emails the given signers; returns the ones that failed, with why. */
async function emailSigners(
  agreement: Agreement,
  signers: AgreementSigner[],
  kind: AgreementEmailKind,
  origin: string,
  extra: { reason?: string | null } = {},
) {
  const [sender, company] = await Promise.all([
    personById(agreement.createdById),
    companyOf(agreement.companyId),
  ]);
  const signedBy = agreement.signers
    .filter((s) => s.signature)
    .map((s) => s.name);
  const failed: Array<{ email: string; error: string }> = [];
  for (const s of signers) {
    const error = await sendAgreementEmail(
      {
        kind,
        to: s.email,
        firstName: firstName(s.name),
        companyName: company.name,
        title: agreement.title,
        signUrl: signUrl(origin, s),
        sender,
        message: agreement.message,
        expiresOn: agreement.expiresOn,
        signedBy,
        reason: extra.reason,
      },
      `agreement-${agreement.id}-${s.id}-${kind}-${kind === 'reminder' ? Date.now() : agreement.revision}`,
    );
    if (error) failed.push({ email: s.email, error });
  }
  return failed;
}

/** The completed copy to the sender and anyone on copy. */
async function emailTeam(
  agreement: Agreement,
  kind: 'completed' | 'declined',
  origin: string,
  extra: { declinedBy?: string; reason?: string | null } = {},
) {
  const [sender, company] = await Promise.all([
    personById(agreement.createdById),
    companyOf(agreement.companyId),
  ]);
  // Signers already get the signed copy; a decline only reaches the team.
  const signerEmails = new Set(
    kind === 'completed' ? agreement.signers.map((s) => s.email) : [],
  );
  const to = Array.from(
    new Set([sender.email, ...(agreement.ccEmails ?? [])].filter(Boolean)),
  ).filter((e) => !signerEmails.has(e!)) as string[];
  const link = `${origin}/admin?tab=agreements&companyId=${agreement.companyId}&agreement=${agreement.id}`;
  for (const email of to)
    await sendAgreementEmail(
      {
        kind,
        to: email,
        firstName: email === sender.email ? firstName(sender.name) : 'there',
        companyName: company.name,
        title: agreement.title,
        signUrl: link,
        sender,
        signedBy: agreement.signers
          .filter((s) => s.signature)
          .map((s) => s.name),
        declinedBy: extra.declinedBy,
        reason: extra.reason,
      },
      `agreement-${agreement.id}-team-${kind}-${email}`,
    );
}

/* ---------------------------------- send ---------------------------------- */

export async function sendAgreement(
  actor: SessionUser,
  input: AgreementInput,
  origin: string,
) {
  await requireAgreements(actor, input.companyId, 'agreements:create');
  const rendered = await renderAgreement(input);
  if (rendered.missing.length)
    throw new AgreementError(
      400,
      `Fill in: ${rendered.missing.map((m) => m.label).join(', ')}.`,
    );
  const at = nowIso();
  const users = await db.user.findMany({
    where: { email: { in: input.signers.map((s) => s.email) } },
    select: { id: true, email: true },
  });
  const draft = {
    ordered: input.ordered,
    signers: input.signers.map(
      (s): AgreementSigner => ({
        id: newId(),
        name: s.name,
        email: s.email,
        role: s.role,
        order: s.order,
        token: newToken(),
        userId:
          users.find(
            (u: { email?: string }) => u.email?.toLowerCase() === s.email,
          )?.id ?? null,
        status: SIGNER_STATUS.WAITING,
        notifiedAt: null,
        viewedAt: null,
        signature: null,
      }),
    ),
  } as Agreement;
  const up = new Set(signersUp(draft).map((s) => s.id));
  const signers = draft.signers.map((s) =>
    up.has(s.id) ? { ...s, status: SIGNER_STATUS.PENDING, notifiedAt: at } : s,
  );

  const created: Agreement = await db.agreement.create({
    data: {
      companyId: input.companyId,
      title: rendered.title || input.title,
      category: input.category,
      body: rendered.body,
      hash: sha256(rendered.body),
      message: input.message,
      templateId: input.templateId,
      ordered: input.ordered,
      signers,
      signerTokens: signers.map((s) => s.token),
      status: AGREEMENT_STATUS.SENT,
      expiresOn: input.expiresOn,
      ccEmails: input.ccEmails,
      sentAt: at,
      completedAt: null,
      createdById: actor.id,
      history: [
        {
          at,
          byUserId: actor.id,
          text: `${actor.name || 'Someone'} sent it to ${signers
            .map((s) => s.name)
            .join(', ')} to sign${input.ordered ? ', in order' : ''}`,
        },
      ],
      revision: 0,
      createdAt: at,
      updatedAt: at,
    },
  });
  const failed = await emailSigners(
    created,
    signers.filter((s) => up.has(s.id)),
    'request',
    origin,
  );
  return { agreement: created, emailErrors: failed };
}

/* -------------------------------- signing --------------------------------- */

export async function agreementByToken(token: string) {
  if (!SIGN_TOKEN_PATTERN.test(token)) return null;
  const found: Agreement | null = await db.agreement.findFirst({
    where: { signerTokens: token },
  });
  if (!found) return null;
  const agreement = await expireIfDue(found);
  const signer = agreement.signers.find((s) => s.token === token);
  return signer ? { agreement, signer } : null;
}

type Meta = { ip: string | null; userAgent: string | null };

const metaOf = (meta: Meta) => ({
  ip: meta.ip,
  userAgent: meta.userAgent?.slice(0, 300) ?? null,
});

/** The signer's own copy of the agreement, for their /sign page. */
export async function signingState(agreement: Agreement, token: string) {
  const signer = agreement.signers.find((s) => s.token === token)!;
  const [company, sender] = await Promise.all([
    companyOf(agreement.companyId),
    personById(agreement.createdById),
  ]);
  const up = signersUp(agreement);
  const myTurn =
    agreement.status === AGREEMENT_STATUS.SENT &&
    up.some((s) => s.id === signer.id);
  const done = agreement.status === AGREEMENT_STATUS.COMPLETED;
  return {
    token,
    title: agreement.title,
    body: agreement.body,
    hash: agreement.hash,
    message: agreement.message ?? null,
    status: agreement.status,
    sentAt: agreement.sentAt,
    completedAt: agreement.completedAt ?? null,
    expiresOn: agreement.expiresOn ?? null,
    voidReason: agreement.voidReason ?? null,
    companyName: company.name,
    companyLogo: company.logo,
    sender: { name: sender.name, email: sender.email },
    you: {
      id: signer.id,
      name: signer.name,
      email: signer.email,
      role: signer.role ?? null,
      status: signer.status,
      canSign: myTurn,
      waitingOn:
        agreement.status === AGREEMENT_STATUS.SENT && !myTurn
          ? up.map((s) => s.name)
          : [],
    },
    signers: agreement.signers
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role ?? null,
        order: s.order,
        status: s.status,
        // Everyone's email and the full trail once it's complete: the
        // certificate every signer keeps.
        email: done || s.id === signer.id ? s.email : null,
        signature: s.signature
          ? {
              name: s.signature.name,
              method: s.signature.method,
              image: s.signature.image ?? null,
              at: s.signature.at,
              ip: done ? (s.signature.ip ?? null) : null,
            }
          : null,
        declinedAt: s.declinedAt ?? null,
      })),
    ordered: agreement.ordered,
    history: done
      ? agreement.history.map((e) => ({ at: e.at, text: e.text, ip: e.ip }))
      : [],
  };
}

export type SigningState = Awaited<ReturnType<typeof signingState>>;

/** The signer opened their link. Logged once, for the audit trail. */
export async function markViewed(token: string, meta: Meta) {
  const found = await agreementByToken(token);
  if (!found) return;
  const { agreement, signer } = found;
  if (signer.viewedAt || agreement.status !== AGREEMENT_STATUS.SENT) return;
  await mutate(agreement.id, (a) => {
    const s = a.signers.find((x) => x.token === token)!;
    if (s.viewedAt) return { patch: {}, events: [] };
    const at = nowIso();
    return {
      patch: {
        signers: a.signers.map((x) =>
          x.id === s.id
            ? {
                ...x,
                viewedAt: at,
                status:
                  x.status === SIGNER_STATUS.PENDING
                    ? SIGNER_STATUS.VIEWED
                    : x.status,
              }
            : x,
        ),
      },
      events: [
        {
          at,
          signerId: s.id,
          text: `${s.name} opened it`,
          ...metaOf(meta),
        },
      ],
    };
  });
}

const SIGNATURE_IMAGE = /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/;
const MAX_SIGNATURE_IMAGE = 200_000;

/**
 * One signer signs, by typing their full name (and drawing, if they want).
 * When the last one signs, the agreement is complete and everyone gets the
 * signed copy; when signing in order, the next person gets their link.
 */
export async function signAgreement(
  token: string,
  input: { name: unknown; agree: unknown; image?: unknown; hash?: unknown },
  meta: Meta,
  origin: string,
) {
  const found = await agreementByToken(token);
  if (!found) throw new AgreementError(404, 'This link does not exist.');
  const typed = text(input.name, 120);
  const image =
    typeof input.image === 'string' && input.image ? input.image : null;
  if (
    image &&
    (image.length > MAX_SIGNATURE_IMAGE || !SIGNATURE_IMAGE.test(image))
  )
    throw new AgreementError(400, 'The drawn signature could not be read.');
  if (input.agree !== true)
    throw new AgreementError(400, 'Tick the box to agree first.');

  let notify: AgreementSigner[] = [];
  const updated = await mutate(found.agreement.id, (a) => {
    const s = a.signers.find((x) => x.token === token)!;
    if (a.status !== AGREEMENT_STATUS.SENT)
      throw new AgreementError(409, 'This agreement is no longer open.');
    if (s.signature) throw new AgreementError(409, 'You already signed.');
    if (!signersUp(a).some((x) => x.id === s.id))
      throw new AgreementError(409, 'It isn’t your turn to sign yet.');
    if (a.hash !== sha256(a.body) || (input.hash && input.hash !== a.hash))
      throw new AgreementError(409, 'This agreement changed. Reload the page.');
    if (!typed || !sameName(typed, s.name))
      throw new AgreementError(
        400,
        `Type your full name exactly as it reads here: ${s.name}`,
      );
    const at = nowIso();
    let signers = a.signers.map((x) =>
      x.id === s.id
        ? {
            ...x,
            status: SIGNER_STATUS.SIGNED,
            viewedAt: x.viewedAt ?? at,
            signature: {
              name: typed,
              method: image ? ('drawn' as const) : ('typed' as const),
              image,
              at,
              ...metaOf(meta),
              provider: 'portal',
            },
          }
        : x,
    );
    const events: Change['events'] = [
      {
        at,
        signerId: s.id,
        text: `${s.name} signed${image ? ' (drawn signature)' : ''}`,
        ...metaOf(meta),
      },
    ];
    const allSigned = signers.every((x) => x.status === SIGNER_STATUS.SIGNED);
    notify = [];
    if (!allSigned) {
      const next = signersUp({ ...a, signers } as Agreement).filter(
        (x) => x.status === SIGNER_STATUS.WAITING,
      );
      if (next.length) {
        const ids = new Set(next.map((x) => x.id));
        signers = signers.map((x) =>
          ids.has(x.id)
            ? { ...x, status: SIGNER_STATUS.PENDING, notifiedAt: at }
            : x,
        );
        notify = signers.filter((x) => ids.has(x.id));
        events.push({
          at,
          text: `Sent to ${notify.map((x) => x.name).join(', ')}, next to sign`,
        });
      }
    } else
      events.push({
        at,
        text: 'Signed by everyone; the agreement is complete',
      });
    return {
      patch: {
        signers,
        ...(allSigned && {
          status: AGREEMENT_STATUS.COMPLETED,
          completedAt: at,
        }),
      },
      events,
    };
  });

  if (updated.status === AGREEMENT_STATUS.COMPLETED) {
    await emailSigners(updated, updated.signers, 'completed', origin);
    await emailTeam(updated, 'completed', origin);
  } else if (notify.length)
    await emailSigners(updated, notify, 'request', origin);
  return updated;
}

/** A signer declines. Nobody else can sign it after that. */
export async function declineAgreement(
  token: string,
  rawReason: unknown,
  meta: Meta,
  origin: string,
) {
  const found = await agreementByToken(token);
  if (!found) throw new AgreementError(404, 'This link does not exist.');
  const reason = text(rawReason, 1000) || null;
  let declinedBy = '';
  const updated = await mutate(found.agreement.id, (a) => {
    const s = a.signers.find((x) => x.token === token)!;
    if (a.status !== AGREEMENT_STATUS.SENT)
      throw new AgreementError(409, 'This agreement is no longer open.');
    if (s.signature) throw new AgreementError(409, 'You already signed.');
    declinedBy = s.name;
    const at = nowIso();
    return {
      patch: {
        status: AGREEMENT_STATUS.DECLINED,
        signers: a.signers.map((x) =>
          x.id === s.id
            ? {
                ...x,
                status: SIGNER_STATUS.DECLINED,
                declinedAt: at,
                declineReason: reason,
              }
            : x,
        ),
      },
      events: [
        {
          at,
          signerId: s.id,
          text: `${s.name} declined to sign${reason ? `: ${reason}` : ''}`,
          ...metaOf(meta),
        },
      ],
    };
  });
  await emailTeam(updated, 'declined', origin, { declinedBy, reason });
  return updated;
}

/* ----------------------------- sender actions ----------------------------- */

/** Emails the signers whose turn it is (or one of them) their link again. */
export async function remindSigners(
  actor: SessionUser,
  agreement: Agreement,
  signerId: string | null,
  origin: string,
) {
  await requireAgreements(actor, agreement.companyId, 'agreements:edit');
  if (agreement.status !== AGREEMENT_STATUS.SENT)
    throw new AgreementError(409, 'Only an agreement out for signing.');
  const targets = signersUp(agreement).filter(
    (s) => !signerId || s.id === signerId,
  );
  if (!targets.length)
    throw new AgreementError(409, 'Nobody is waiting to sign right now.');
  const failed = await emailSigners(agreement, targets, 'reminder', origin);
  const sent = targets.filter((t) => !failed.some((f) => f.email === t.email));
  const at = nowIso();
  const updated = sent.length
    ? await mutate(agreement.id, (a) => ({
        patch: {
          signers: a.signers.map((x) =>
            sent.some((t) => t.id === x.id) ? { ...x, remindedAt: at } : x,
          ),
        },
        events: [
          {
            at,
            byUserId: actor.id,
            text: `Reminded ${sent.map((s) => s.name).join(', ')}`,
          },
        ],
      }))
    : agreement;
  return { agreement: updated, emailErrors: failed };
}

/** The sender withdraws it. Signers who were sent it are told. */
export async function voidAgreement(
  actor: SessionUser,
  agreement: Agreement,
  rawReason: unknown,
  origin: string,
) {
  await requireAgreements(actor, agreement.companyId, 'agreements:edit');
  if (agreement.status !== AGREEMENT_STATUS.SENT)
    throw new AgreementError(409, 'Only an agreement out for signing.');
  const reason = text(rawReason, 1000) || null;
  const updated = await mutate(agreement.id, (a) => {
    if (a.status !== AGREEMENT_STATUS.SENT)
      throw new AgreementError(409, 'Only an agreement out for signing.');
    return {
      patch: {
        status: AGREEMENT_STATUS.VOIDED,
        voidedAt: nowIso(),
        voidReason: reason,
      },
      events: [
        {
          byUserId: actor.id,
          text: `${actor.name || 'Someone'} withdrew it${reason ? `: ${reason}` : ''}`,
        },
      ],
    };
  });
  await emailSigners(
    updated,
    updated.signers.filter((s) => s.notifiedAt && !s.declinedAt),
    'voided',
    origin,
    { reason },
  );
  return updated;
}

/** Deletes a withdrawn, declined or expired agreement. Signed ones stay. */
export async function deleteAgreement(
  actor: SessionUser,
  agreement: Agreement,
) {
  await requireAgreements(actor, agreement.companyId, 'agreements:delete');
  if (
    agreement.status === AGREEMENT_STATUS.SENT ||
    agreement.status === AGREEMENT_STATUS.COMPLETED
  )
    throw new AgreementError(
      409,
      'Withdraw it first. Signed agreements are kept for the record.',
    );
  await db.agreement.delete({ where: { id: agreement.id } });
}

/* --------------------------------- views ---------------------------------- */

/** One agreement as the team sees it: signers, their links and progress. */
export async function agreementView(agreement: Agreement, origin: string) {
  const sender = await personById(agreement.createdById);
  const signed = agreement.signers.filter((s) => s.signature).length;
  return {
    id: agreement.id,
    source: 'portal' as 'portal' | 'onboarding',
    companyId: agreement.companyId,
    title: agreement.title,
    category: agreement.category,
    status: agreement.status,
    message: agreement.message ?? null,
    ordered: agreement.ordered,
    sentAt: agreement.sentAt,
    completedAt: agreement.completedAt ?? null,
    expiresOn: agreement.expiresOn ?? null,
    voidReason: agreement.voidReason ?? null,
    sender: { id: sender.id, name: sender.name },
    progress: { signed, total: agreement.signers.length },
    signers: agreement.signers
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        role: s.role ?? null,
        order: s.order,
        status: s.status,
        viewedAt: s.viewedAt ?? null,
        notifiedAt: s.notifiedAt ?? null,
        remindedAt: s.remindedAt ?? null,
        signedAt: s.signature?.at ?? null,
        declinedAt: s.declinedAt ?? null,
        declineReason: s.declineReason ?? null,
        signUrl: signUrl(origin, s),
      })),
    link: null as string | null,
  };
}

export type AgreementView = Awaited<ReturnType<typeof agreementView>>;

/** The full record: the text, signatures and the audit trail. */
export async function agreementDetail(agreement: Agreement, origin: string) {
  const view = await agreementView(agreement, origin);
  return {
    ...view,
    body: agreement.body,
    hash: agreement.hash,
    hashOk: agreement.hash === sha256(agreement.body),
    ccEmails: agreement.ccEmails ?? [],
    signatures: agreement.signers
      .filter((s) => s.signature)
      .map((s) => ({
        signerId: s.id,
        name: s.signature!.name,
        method: s.signature!.method,
        image: s.signature!.image ?? null,
        at: s.signature!.at,
        ip: s.signature!.ip ?? null,
        userAgent: s.signature!.userAgent ?? null,
      })),
    history: agreement.history,
  };
}

export type AgreementDetail = Awaited<ReturnType<typeof agreementDetail>>;

/**
 * The documents new hires signed through onboarding, as read-only rows, so
 * every agreement the company has out or signed is in one list.
 */
async function onboardingRows(
  companyId: string,
  origin: string,
): Promise<AgreementView[]> {
  const hires: Onboarding[] = await db.onboarding.findMany({
    where: { companyId },
    orderBy: { updatedAt: 'desc' },
    take: 300,
  });
  return hires.flatMap((o) =>
    (o.documents ?? []).map((d): AgreementView => {
      const name = o.details?.legalName || o.name;
      const status = d.signature
        ? AGREEMENT_STATUS.COMPLETED
        : o.step === ONBOARDING_STEP.ENDED
          ? AGREEMENT_STATUS.VOIDED
          : AGREEMENT_STATUS.SENT;
      return {
        id: `onboarding:${o.id}:${d.id}`,
        source: 'onboarding',
        companyId,
        title: d.title || DOC_LABEL[d.kind],
        category: AGREEMENT_CATEGORY.EMPLOYMENT,
        status,
        message: null,
        ordered: false,
        sentAt: d.sentAt,
        completedAt: d.signature?.at ?? null,
        expiresOn: null,
        voidReason: null,
        sender: { id: o.createdById, name: 'Onboarding' },
        progress: { signed: d.signature ? 1 : 0, total: 1 },
        signers: [
          {
            id: o.id,
            name,
            email: o.email,
            role: 'New hire',
            order: 1,
            status: d.signature
              ? SIGNER_STATUS.SIGNED
              : d.viewedAt
                ? SIGNER_STATUS.VIEWED
                : SIGNER_STATUS.PENDING,
            viewedAt: d.viewedAt ?? null,
            notifiedAt: d.sentAt,
            remindedAt: null,
            signedAt: d.signature?.at ?? null,
            declinedAt: null,
            declineReason: null,
            signUrl: `${origin}/join/${o.token}`,
          },
        ],
        link: `${origin}/admin?tab=onboarding&companyId=${companyId}&hire=${o.id}`,
      };
    }),
  );
}

/** Every agreement of a company, newest first, onboarding documents included. */
export async function listAgreements(companyId: string, origin: string) {
  const rows: Agreement[] = await db.agreement.findMany({
    where: { companyId },
    orderBy: { sentAt: 'desc' },
    take: 500,
  });
  const fresh = await Promise.all(rows.map(expireIfDue));
  const [own, onboarding] = await Promise.all([
    Promise.all(fresh.map((a) => agreementView(a, origin))),
    onboardingRows(companyId, origin),
  ]);
  return [...own, ...onboarding].sort((a, b) =>
    String(b.sentAt).localeCompare(String(a.sentAt)),
  );
}

/* -------------------------------- templates ------------------------------- */

export function templateView(t: AgreementTemplate) {
  return {
    id: t.id,
    builtIn: false,
    name: t.name,
    category: t.category,
    title: t.title,
    body: t.body,
    signerRoles: t.signerRoles ?? [],
    fields: templateFields(t.title, t.body).map((key) => ({
      key,
      label: fieldLabel(key),
    })),
    updatedAt: (t.updatedAt as string) ?? null,
  };
}

export type TemplateView = ReturnType<typeof templateView>;

/** A company's own templates, then the starter drafts. */
export async function listTemplates(
  companyId: string,
): Promise<TemplateView[]> {
  const own: AgreementTemplate[] = await db.agreementTemplate.findMany({
    where: { companyId },
    orderBy: { name: 'asc' },
  });
  const starters = STARTER_TEMPLATES.map((s) => ({
    ...templateView({
      id: `starter:${s.key}`,
      companyId,
      name: s.name,
      category: s.category,
      title: s.title,
      body: s.body,
      signerRoles: s.signerRoles,
      createdById: '',
    }),
    builtIn: true,
  }));
  return [...own.map(templateView), ...starters];
}

export function parseTemplateInput(raw: any) {
  const name = text(raw?.name, 80);
  const title = text(raw?.title, MAX_AGREEMENT_TITLE);
  const body =
    typeof raw?.body === 'string' ? raw.body.slice(0, MAX_AGREEMENT_BODY) : '';
  if (!name || !title || !body.trim())
    throw new AgreementError(400, 'Add a name, a title and the text.');
  const signerRoles = Array.isArray(raw?.signerRoles)
    ? raw.signerRoles
        .map((r: unknown) => text(r, 60))
        .filter(Boolean)
        .slice(0, MAX_SIGNERS)
    : [];
  return {
    name,
    title,
    body,
    category: isCategory(raw?.category)
      ? raw.category
      : AGREEMENT_CATEGORY.OTHER,
    signerRoles: signerRoles as string[],
  };
}

export async function saveTemplate(
  actor: SessionUser,
  companyId: string,
  id: string | null,
  raw: unknown,
) {
  await requireAgreements(actor, companyId, 'agreements:edit');
  const input = parseTemplateInput(raw);
  const at = nowIso();
  if (id) {
    const found: AgreementTemplate | null =
      await db.agreementTemplate.findFirst({ where: { id, companyId } });
    if (!found) throw new AgreementError(404, 'Template not found.');
    return templateView(
      await db.agreementTemplate.update({
        where: { id },
        data: { ...input, updatedById: actor.id, updatedAt: at },
      }),
    );
  }
  return templateView(
    await db.agreementTemplate.create({
      data: {
        ...input,
        companyId,
        createdById: actor.id,
        createdAt: at,
        updatedAt: at,
      },
    }),
  );
}

export async function deleteTemplate(
  actor: SessionUser,
  companyId: string,
  id: string,
) {
  await requireAgreements(actor, companyId, 'agreements:edit');
  const { count } = await db.agreementTemplate.deleteMany({
    where: { id, companyId },
  });
  if (!count) throw new AgreementError(404, 'Template not found.');
}

/* --------------------------------- errors --------------------------------- */

export function agreementFailure(e: unknown) {
  if (e instanceof AgreementError)
    return Response.json(
      { status: 'fail', error: e.message },
      { status: e.status },
    );
  console.error('[agreements]', e);
  return Response.json(
    { status: 'fail', error: 'Something went wrong. Try again.' },
    { status: 500 },
  );
}
