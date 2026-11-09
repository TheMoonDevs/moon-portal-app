import { createHash, randomBytes } from 'crypto';

import { db } from '@/lib/mongodb/db-client';
import { ensureNotificationsReset } from '@/lib/notifications/server';
import { DOC_LABEL, todayIst } from '@/lib/onboarding/meta';
import { isAllowedInCompany } from '@/lib/permissions/company';
import type { SessionUser } from '@/lib/permissions/server';
import { getCompanyAccess, nowIso } from '@/lib/workspace/server';
import {
  type Agreement,
  AGREEMENT_CATEGORY,
  AGREEMENT_STATUS,
  type AgreementEvent,
  type AgreementField,
  type AgreementSignature,
  type AgreementSigner,
  type AgreementTemplate,
  type AgreementTemplateVersion,
  type CompanySignerRule,
  SIGNER_STATUS,
} from '@/models/agreements';
import type { Onboarding } from '@/models/onboarding';
import { ONBOARDING_STEP } from '@/models/onboarding';
import { NotificationType } from '@/models/shared/enums';
import type { Company } from '@/models/workspace';

import { signerFacts } from './autofill';
import { docTypeLabel, isSignerRule, onboardingTypeKey } from './docTypes';
import {
  type AgreementEmailContext,
  type AgreementEmailKind,
  sendAgreementEmail,
} from './emails';
import {
  checkValues,
  fieldsFor,
  fieldText,
  isSensitiveField,
  parseFields,
  partiesOf,
} from './fields';
import { buildAgreementPdf, pdfFileName } from './pdf';
import {
  checkSignatureImage,
  companySignerFor,
  getSavedSignature,
  getSettings,
  saveSignature,
  SignerError,
} from './signers';
import {
  fieldLabel,
  fillAgreement,
  isCategory,
  isPersonKey,
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

export const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

/**
 * A short id for one signature, printed beside it on the page and in the
 * PDF so a signature can be matched to its line in the audit trail.
 */
export const signatureIdOf = (
  agreementId: string,
  signerId: string,
  at: string,
) => sha256(`${agreementId}:${signerId}:${at}`).slice(0, 16).toUpperCase();

export const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const isDay = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const sameName = (a: string, b: string) =>
  a.trim().replace(/\s+/g, ' ').toLowerCase() ===
  b.trim().replace(/\s+/g, ' ').toLowerCase();

export const newId = () => randomBytes(6).toString('hex');
export const newToken = () => randomBytes(20).toString('hex');

export const OPEN_SIGNER = [
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

/** Whether someone may see confidential documents (pay letters) in a company. */
export async function seesConfidential(actor: SessionUser, companyId: string) {
  const access = await getCompanyAccess(actor.id, companyId);
  return isAllowedInCompany(actor, access, 'confidential:read');
}

/** The addresses someone signs as: their email and any linked ones. */
export async function emailsOf(userId: string): Promise<string[]> {
  const u = await db.user.findFirst({
    where: { id: userId },
    select: { email: true, linkedEmails: true },
  });
  return Array.from(
    new Set(
      [u?.email, ...(u?.linkedEmails ?? [])]
        .filter((e): e is string => typeof e === 'string' && !!e)
        .map((e) => e.toLowerCase()),
    ),
  );
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
  // Confidential ones (pay letters) are for HR and owners, and the people
  // who sign them.
  if (
    agreement.confidential &&
    !(await seesConfidential(actor, agreement.companyId)) &&
    !agreement.signers.some((s) => s.userId === actor.id)
  )
    throw new AgreementError(404, 'Agreement not found.');
  return expireIfDue(agreement);
}

/* -------------------------------- writing --------------------------------- */

export type Change = {
  patch: Partial<Agreement>;
  events: Array<Omit<AgreementEvent, 'at'> & { at?: string }>;
};

/**
 * Applies a change made from the latest copy. Two signers signing at the same
 * moment can't overwrite each other: a write only lands on the revision it
 * was made from, and a clash is retried from the fresh copy.
 */
export async function mutate(
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
  /**
   * Who signs for the company: by the type's rule when null, else the owner,
   * the sender (`lead`), or nobody.
   */
  companySigner: CompanySignerRule | null;
  /** The company signs before the other parties (an offer), not after. */
  companyFirst: boolean;
  /** Only HR and owners see it; null takes the type's default. */
  confidential: boolean | null;
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
  /** What the signers fill in before they sign. */
  fields: AgreementField[];
  /** When the contract or NDA term ends (YYYY-MM-DD), for the alerts. */
  endsOn: string | null;
  /** The agreement this one renews, amends or sends again. */
  previousId: string | null;
  linkKind: 'renewal' | 'amendment' | 'resend' | null;
  /** The signers can't use the Portal until they sign it. */
  blocking: boolean;
}

const LINK_KINDS = ['renewal', 'amendment', 'resend'] as const;

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
  const signers = parseSigners(raw?.signers, ordered);
  const endsOn = isDay(raw?.endsOn) ? raw.endsOn : null;
  const previousId =
    typeof raw?.previousId === 'string' &&
    /^[a-f0-9]{24}$/i.test(raw.previousId)
      ? raw.previousId
      : null;
  return {
    companyId,
    title,
    body,
    category: isCategory(raw?.category)
      ? raw.category
      : AGREEMENT_CATEGORY.OTHER,
    fields: parseFields(raw?.fields, signers.length),
    endsOn,
    previousId,
    linkKind: previousId
      ? LINK_KINDS.includes(raw?.linkKind)
        ? raw.linkKind
        : 'renewal'
      : null,
    blocking: raw?.blocking === true,
    companySigner: isSignerRule(raw?.companySigner) ? raw.companySigner : null,
    companyFirst: raw?.companyFirst === true,
    confidential:
      typeof raw?.confidential === 'boolean' ? raw.confidential : null,
    message: text(raw?.message, MAX_AGREEMENT_MESSAGE) || null,
    templateId: text(raw?.templateId, 60) || null,
    ordered,
    expiresOn,
    signers,
    ccEmails: ccEmails as string[],
    values,
    companyName: text(raw?.companyName, 120) || null,
  };
}

/**
 * The title and text as the signers will read them, every blank filled.
 * Blanks about a signer (`{{signer1Address}}`) the sender left empty are
 * filled from what the Portal knows about them; pay only with `pay`.
 */
export async function renderAgreement(
  input: AgreementInput,
  opts: { pay: boolean } = { pay: false },
) {
  const company: Company | null = await db.company.findFirst({
    where: { id: input.companyId },
  });
  const blanks = templateFields(input.title, input.body);
  const known = blanks.some((k) => isPersonKey(k) && !input.values[k])
    ? await signerFacts(input.companyId, input.signers, opts)
    : {};
  const values = { ...known, ...input.values };
  const vars: Record<string, string> = {
    ...values,
    companyName: input.companyName || company?.name || 'The company',
    today: new Date(`${todayIst()}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
    ...signerVariables(input.signers),
  };
  const missing = blanks.filter((k) => !values[k]);
  return {
    title: fillAgreement(input.title, vars).trim(),
    body: fillAgreement(input.body, vars).trim(),
    missing: missing.map((key) => ({ key, label: fieldLabel(key) })),
    /** Blanks the Portal filled from the signers' records. */
    filled: Object.keys(known).filter(
      (k) => !input.values[k] && blanks.includes(k),
    ),
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

const teamLink = (origin: string, agreement: Agreement) =>
  `${origin}/admin?tab=agreements&companyId=${agreement.companyId}&agreement=${agreement.id}`;

export type EmailExtra = Partial<
  Pick<
    AgreementEmailContext,
    | 'reason'
    | 'declinedBy'
    | 'justSigned'
    | 'waitingOn'
    | 'partiesSigned'
    | 'pdf'
    | 'handedOverTo'
  >
>;

/** Emails the given signers; returns the ones that failed, with why. */
export async function emailSigners(
  agreement: Agreement,
  signers: AgreementSigner[],
  kind: AgreementEmailKind,
  origin: string,
  extra: EmailExtra = {},
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
    // The company's signer is asked to countersign, not to sign as a party.
    const k: AgreementEmailKind =
      s.company && kind === 'request' ? 'countersign' : kind;
    const error = await sendAgreementEmail(
      {
        kind: k,
        to: s.email,
        firstName: firstName(s.name),
        companyName: company.name,
        title: agreement.title,
        signUrl: signUrl(origin, s),
        sender,
        message: agreement.message,
        expiresOn: agreement.expiresOn,
        reference: agreement.id,
        companyLogo: company.logo,
        signedBy,
        partiesSigned: agreement.signers
          .filter((x) => x.signature && !x.company)
          .map((x) => x.name),
        stillToSign: kind === 'signed' && OPEN_SIGNER.includes(s.status),
        ...extra,
      },
      `agreement-${agreement.id}-${s.id}-${k}-${k === 'reminder' || k === 'due' ? Date.now() : agreement.revision}`,
    );
    if (error) failed.push({ email: s.email, error });
  }
  return failed;
}

/** The sender and anyone on copy, when it isn't one of the signers. */
export async function emailTeam(
  agreement: Agreement,
  kind: 'completed' | 'declined' | 'signed' | 'handedOver',
  origin: string,
  extra: EmailExtra = {},
) {
  const [sender, company] = await Promise.all([
    personById(agreement.createdById),
    companyOf(agreement.companyId),
  ]);
  // Signers hear about it in their own email.
  const signerEmails = new Set(agreement.signers.map((s) => s.email));
  const to = Array.from(
    new Set(
      [
        sender.email,
        ...(kind === 'signed' || kind === 'handedOver'
          ? []
          : (agreement.ccEmails ?? [])),
      ]
        .filter(Boolean)
        .map((e) => e!.toLowerCase()),
    ),
  ).filter((e) => !signerEmails.has(e));
  for (const email of to)
    await sendAgreementEmail(
      {
        kind,
        to: email,
        firstName: email === sender.email ? firstName(sender.name) : 'there',
        companyName: company.name,
        title: agreement.title,
        signUrl: teamLink(origin, agreement),
        sender,
        reference: agreement.id,
        companyLogo: company.logo,
        signedBy: agreement.signers
          .filter((s) => s.signature)
          .map((s) => s.name),
        forTeam: true,
        ...extra,
      },
      `agreement-${agreement.id}-team-${kind}-${email}-${agreement.revision}`,
    );
}

/** An in-portal notification for signers with a portal account. */
export async function notifySigners(
  agreement: Agreement,
  signers: AgreementSigner[],
  origin: string,
) {
  const people = signers.filter((s) => s.userId);
  if (!people.length) return;
  const company = await companyOf(agreement.companyId);
  await ensureNotificationsReset();
  const at = new Date();
  await db.notification.createMany({
    data: people.map((s) => ({
      userId: s.userId,
      title: s.company
        ? 'Countersign for the company'
        : 'Waiting for your signature',
      description: `${agreement.title} · ${company.name}`,
      matchId: agreement.id,
      matchType: 'Agreement',
      notificationType: NotificationType.SELF_GENERATED,
      notificationData: {
        kind: 'agreement',
        actions: [
          {
            title: s.company ? 'Review and approve' : 'Review and sign',
            trigger_type: 'link',
            trigger: `/sign/${s.token}`,
          },
        ],
      },
      isRead: false,
      createdAt: at,
      updatedAt: at,
    })),
  });
  void origin;
}

/** The signed PDF of a completed agreement, as an email attachment. */
async function pdfAttachment(agreement: Agreement) {
  try {
    const bytes = await agreementPdf(agreement);
    return {
      filename: pdfFileName(agreement.title),
      base64: Buffer.from(bytes).toString('base64'),
    };
  } catch (e) {
    console.error('[agreements] pdf', e);
    return null;
  }
}

export async function agreementPdf(agreement: Agreement) {
  const company = await companyOf(agreement.companyId);
  return buildAgreementPdf({
    reference: agreement.id,
    title: agreement.title,
    companyName: company.name,
    body: agreement.body,
    hash: agreement.hash,
    sentAt: agreement.sentAt,
    completedAt: agreement.completedAt ?? null,
    status: agreement.status,
    signers: agreement.signers
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        name: s.name,
        email: s.email,
        role: s.role ?? null,
        company: !!s.company,
        status: s.status,
        signature: s.signature
          ? {
              name: s.signature.name,
              method: s.signature.method,
              image: s.signature.image ?? null,
              at: s.signature.at,
              ip: s.signature.ip ?? null,
              saved: !!s.signature.saved,
              signatureId: signatureIdOf(agreement.id, s.id, s.signature.at),
            }
          : null,
        details: s.signature
          ? fieldsFor(agreement.fields, agreement.signers, s.id).map((f) => ({
              label: f.label,
              text: fieldText(f, s.values?.[f.id]),
            }))
          : [],
      })),
    history: agreement.history.map((e) => ({
      at: e.at,
      text: e.text,
      ip: e.ip ?? null,
    })),
  });
}

/* ---------------------------------- send ---------------------------------- */

export async function sendAgreement(
  actor: SessionUser,
  input: AgreementInput,
  origin: string,
  opts: { rolloutId?: string | null; templateVersion?: number | null } = {},
) {
  await requireAgreements(actor, input.companyId, 'agreements:create');
  const rendered = await renderAgreement(input, {
    pay: await seesConfidential(actor, input.companyId),
  });
  if (rendered.missing.length)
    throw new AgreementError(
      400,
      `Fill in: ${rendered.missing.map((m) => m.label).join(', ')}.`,
    );
  const at = nowIso();
  const previous: Agreement | null = input.previousId
    ? await db.agreement.findFirst({
        where: { id: input.previousId, companyId: input.companyId },
      })
    : null;
  if (input.previousId && !previous)
    throw new AgreementError(404, 'The agreement it follows was not found.');
  const template = input.templateId
    ? await db.agreementTemplate.findFirst({
        where: { id: input.templateId, companyId: input.companyId },
      })
    : null;
  const templateVersion =
    opts.templateVersion ?? (template ? (template.version ?? 1) : null);

  // Who signs for the company, by the document type's rule.
  const [companySigner, settings] = await Promise.all([
    companySignerFor(
      input.companyId,
      input.category,
      { leadId: actor.id },
      input.companySigner,
    ),
    getSettings(input.companyId),
  ]);
  let parties: Array<SignerInput & { company?: boolean; userId?: string }> =
    input.signers.map((s) => ({ ...s }));
  if (companySigner) {
    if (!companySigner.email)
      throw new AgreementError(
        409,
        `${companySigner.name} signs for the company but has no email.`,
      );
    const email = companySigner.email.toLowerCase();
    const companyName = rendered.company?.name || 'the company';
    const saved = await getSavedSignature(companySigner.id);
    const existing = parties.find((p) => p.email === email);
    if (existing) {
      existing.company = true;
      existing.userId = companySigner.id;
      existing.role = existing.role || `For ${companyName}`;
    } else {
      if (parties.length >= MAX_SIGNERS)
        throw new AgreementError(
          400,
          `Up to ${MAX_SIGNERS - 1} people can sign besides the company.`,
        );
      const last = Math.max(...parties.map((p) => p.order));
      if (input.ordered && input.companyFirst)
        parties = parties.map((p) => ({ ...p, order: p.order + 1 }));
      parties.push({
        name: saved?.name || companySigner.name,
        email,
        role: `For ${companyName}`,
        order: !input.ordered ? 1 : input.companyFirst ? 1 : last + 1,
        company: true,
        userId: companySigner.id,
      });
    }
  }

  const users = await db.user.findMany({
    where: { email: { in: parties.map((s) => s.email) } },
    select: { id: true, email: true },
  });
  const draft = {
    ordered: input.ordered,
    signers: parties.map(
      (s): AgreementSigner => ({
        id: newId(),
        name: s.name,
        email: s.email,
        role: s.role,
        order: s.order,
        token: newToken(),
        userId:
          s.userId ??
          users.find(
            (u: { email?: string }) => u.email?.toLowerCase() === s.email,
          )?.id ??
          null,
        status: SIGNER_STATUS.WAITING,
        notifiedAt: null,
        viewedAt: null,
        signature: null,
        company: !!s.company,
      }),
    ),
  } as Agreement;
  const up = new Set(signersUp(draft).map((s) => s.id));
  const signers = draft.signers.map((s) =>
    up.has(s.id) ? { ...s, status: SIGNER_STATUS.PENDING, notifiedAt: at } : s,
  );
  // Pay letters, and anything asking for bank or ID details, by default.
  const confidential =
    input.confidential ??
    (!!settings.types[input.category]?.confidential ||
      !!previous?.confidential ||
      input.fields.some(isSensitiveField));
  const countersigner = signers.find((s) => s.company);
  const partyCount = partiesOf(signers).length;
  const fields = input.fields.filter((f) => f.signer <= partyCount);
  const linkText = previous
    ? `. ${
        input.linkKind === 'amendment'
          ? 'Amends'
          : input.linkKind === 'resend'
            ? 'Sent again in place of'
            : 'Renews'
      } “${previous.title}”`
    : '';

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
      confidential,
      sentAt: at,
      completedAt: null,
      createdById: actor.id,
      fields,
      templateVersion,
      endsOn: input.endsOn,
      endAlerts: [],
      previousId: previous?.id ?? null,
      linkKind: previous ? input.linkKind : null,
      rolloutId: opts.rolloutId ?? null,
      blocking: input.blocking,
      corrections: [],
      history: [
        {
          at,
          byUserId: actor.id,
          text: `${actor.name || 'Someone'} sent it to ${signers
            .filter((s) => !s.company)
            .map((s) => s.name)
            .join(', ')} to sign${input.ordered ? ', in order' : ''}${
            countersigner ? `; ${countersigner.name} signs for the company` : ''
          }${confidential ? '. Marked confidential' : ''}${linkText}${
            templateVersion && template
              ? `. From the template “${template.name}”, version ${templateVersion}`
              : ''
          }`,
        },
      ],
      revision: 0,
      createdAt: at,
      updatedAt: at,
    },
  });
  const upNow = signers.filter((s) => up.has(s.id));
  const failed = await emailSigners(created, upNow, 'request', origin);
  await notifySigners(created, upNow, origin).catch((e) =>
    console.error('[agreements] notify', e),
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

export type Meta = { ip: string | null; userAgent: string | null };

export const metaOf = (meta: Meta) => ({
  ip: meta.ip,
  userAgent: meta.userAgent?.slice(0, 300) ?? null,
});

/** Whether a signed-in person is this signer: their account or their email. */
export async function isSignerUser(
  user: { id: string } | null | undefined,
  signer: AgreementSigner,
) {
  if (!user) return false;
  if (signer.userId) return signer.userId === user.id;
  return (await emailsOf(user.id)).includes(signer.email);
}

/** The signer's own copy of the agreement, for their /sign page. */
export async function signingState(
  agreement: Agreement,
  token: string,
  viewer?: { id: string } | null,
) {
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
  // Signed in as this signer: they can save their signature, or approve with
  // the one they saved.
  const isMe = await isSignerUser(viewer, signer);
  const saved = isMe && viewer ? await getSavedSignature(viewer.id) : null;
  const fields = agreement.fields ?? [];
  const lastFix = (agreement.corrections ?? [])
    .filter((c) => c.kind === 'text')
    .at(-1);
  // What each signer filled in shows to everyone once they signed, like the
  // signature; the company's signer sees it before countersigning.
  const detailsOf = (s: AgreementSigner) =>
    s.signature && (done || s.id === signer.id || signer.company)
      ? fieldsFor(fields, agreement.signers, s.id).map((f) => ({
          label: f.label,
          text: fieldText(f, s.values?.[f.id]),
        }))
      : [];
  return {
    token,
    reference: agreement.id,
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
    pdfUrl: done ? `/api/sign/${token}/pdf` : null,
    viewer: isMe
      ? {
          signedIn: true,
          savedSignature: saved
            ? {
                name: saved.name,
                method: saved.method,
                image: saved.image ?? null,
              }
            : null,
        }
      : { signedIn: false, savedSignature: null },
    you: {
      id: signer.id,
      name: signer.name,
      email: signer.email,
      role: signer.role ?? null,
      company: !!signer.company,
      status: signer.status,
      canSign: myTurn,
      /** What they fill in before signing. */
      fields: fieldsFor(fields, agreement.signers, signer.id),
      values: signer.values ?? {},
      handedOverFrom: signer.handedOverFrom ?? null,
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
        company: !!s.company,
        // Everyone's email and the full trail once it's complete: the
        // certificate every signer keeps.
        email: done || s.id === signer.id ? s.email : null,
        signature: s.signature
          ? {
              name: s.signature.name,
              method: s.signature.method,
              image: s.signature.image ?? null,
              at: s.signature.at,
              saved: !!s.signature.saved,
              ip: done ? (s.signature.ip ?? null) : null,
              signatureId: signatureIdOf(agreement.id, s.id, s.signature.at),
            }
          : null,
        declinedAt: s.declinedAt ?? null,
        details: detailsOf(s),
      })),
    ordered: agreement.ordered,
    correctedAt: lastFix?.at ?? null,
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

/**
 * Puts one signer's signature on the agreement. When the last one signs, it
 * is complete and everyone gets the signed PDF; when signing in order, the
 * next people get their link; everyone else hears who signed.
 */
async function recordSignature(
  agreementId: string,
  signerId: string,
  signature: Omit<AgreementSignature, 'at' | 'ip' | 'userAgent' | 'provider'>,
  meta: Meta,
  origin: string,
  check: { hash?: unknown; typed?: string; values?: unknown } = {},
) {
  let notify: AgreementSigner[] = [];
  let justSigned = '';
  const updated = await mutate(agreementId, (a) => {
    const s = a.signers.find((x) => x.id === signerId)!;
    if (a.status !== AGREEMENT_STATUS.SENT)
      throw new AgreementError(409, 'This agreement is no longer open.');
    if (s.signature) throw new AgreementError(409, 'You already signed.');
    if (!signersUp(a).some((x) => x.id === s.id))
      throw new AgreementError(409, 'It isn’t your turn to sign yet.');
    if (a.hash !== sha256(a.body) || (check.hash && check.hash !== a.hash))
      throw new AgreementError(409, 'This agreement changed. Reload the page.');
    if (
      check.typed !== undefined &&
      (!check.typed || !sameName(check.typed, s.name))
    )
      throw new AgreementError(
        400,
        `Type your full name exactly as it reads here: ${s.name}`,
      );
    // What they fill in before signing.
    const mine = fieldsFor(a.fields, a.signers, s.id);
    if (check.values === undefined && mine.some((f) => f.required))
      throw new AgreementError(
        409,
        'This one asks you to fill in some details first. Open it to sign.',
      );
    let values: Record<string, string> = {};
    try {
      values = mine.length ? checkValues(mine, check.values) : {};
    } catch (e) {
      throw new AgreementError(400, (e as Error).message);
    }
    const filled = Object.keys(values).length;
    justSigned = s.name;
    const at = nowIso();
    let signers = a.signers.map((x) =>
      x.id === s.id
        ? {
            ...x,
            status: SIGNER_STATUS.SIGNED,
            viewedAt: x.viewedAt ?? at,
            ...(mine.length ? { values } : {}),
            signature: {
              ...signature,
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
        text: `${
          signature.saved
            ? `${s.name} approved with their saved signature${s.company ? ', for the company' : ''}`
            : `${s.name} signed${signature.method === 'drawn' ? ' (drawn signature)' : ''}${s.company ? ', for the company' : ''}`
        }${filled ? `, filling in ${filled} ${filled === 1 ? 'detail' : 'details'}` : ''}`,
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
    const pdf = await pdfAttachment(updated);
    await emailSigners(updated, updated.signers, 'completed', origin, { pdf });
    await emailTeam(updated, 'completed', origin, { pdf });
  } else {
    const nextIds = new Set(notify.map((x) => x.id));
    if (notify.length) {
      await emailSigners(updated, notify, 'request', origin);
      await notifySigners(updated, notify, origin).catch((e) =>
        console.error('[agreements] notify', e),
      );
    }
    // Everyone already in it hears who signed, and who it waits on now.
    const waitingOn = signersUp(updated).map((x) => x.name);
    const others = updated.signers.filter(
      (x) =>
        x.id !== signerId &&
        !nextIds.has(x.id) &&
        x.status !== SIGNER_STATUS.WAITING &&
        x.status !== SIGNER_STATUS.DECLINED,
    );
    await emailSigners(updated, others, 'signed', origin, {
      justSigned,
      waitingOn,
    });
    await emailTeam(updated, 'signed', origin, { justSigned, waitingOn });
  }
  return updated;
}

/**
 * One signer signs from their link, by typing their full name (and drawing,
 * if they want). Signed in as that signer, they can also save the signature
 * so their next documents take one click.
 */
export async function signAgreement(
  token: string,
  input: {
    name: unknown;
    agree: unknown;
    image?: unknown;
    hash?: unknown;
    save?: unknown;
    values?: unknown;
  },
  meta: Meta,
  origin: string,
  viewer?: { id: string } | null,
) {
  const found = await agreementByToken(token);
  if (!found) throw new AgreementError(404, 'This link does not exist.');
  const typed = text(input.name, 120);
  let image: string | null;
  try {
    image = checkSignatureImage(input.image);
  } catch (e) {
    throw new AgreementError(400, (e as Error).message);
  }
  if (input.agree !== true)
    throw new AgreementError(400, 'Tick the box to agree first.');
  const updated = await recordSignature(
    found.agreement.id,
    found.signer.id,
    {
      name: typed,
      method: image ? 'drawn' : 'typed',
      image,
    },
    meta,
    origin,
    { hash: input.hash, typed, values: input.values ?? {} },
  );
  if (
    input.save === true &&
    viewer &&
    (await isSignerUser(viewer, found.signer))
  )
    await saveSignature(viewer.id, { name: typed, image }).catch((e) =>
      console.error('[agreements] save signature', e),
    );
  return updated;
}

/**
 * Signs with the signer's saved signature, one click from the portal: the
 * owner countersigning after their first signature. Only while signed in as
 * that signer.
 */
export async function approveAgreement(
  actor: { id: string },
  agreement: Agreement,
  meta: Meta,
  origin: string,
  signerId?: string | null,
  /** What they filled in, from the signing page; none from Home. */
  values?: unknown,
) {
  const candidates: AgreementSigner[] = [];
  for (const s of agreement.signers)
    if ((!signerId || s.id === signerId) && (await isSignerUser(actor, s)))
      candidates.push(s);
  const up = new Set(signersUp(agreement).map((s) => s.id));
  const signer =
    candidates.find((s) => up.has(s.id) && !s.signature) ?? candidates[0];
  if (!signer)
    throw new AgreementError(403, 'You aren’t one of the people signing this.');
  const saved = await getSavedSignature(actor.id);
  if (!saved)
    throw new AgreementError(
      409,
      'Sign it by hand once to save your signature; after that it’s one click.',
    );
  return recordSignature(
    agreement.id,
    signer.id,
    {
      name: signer.name,
      method: saved.method,
      image: saved.image ?? null,
      saved: true,
    },
    meta,
    origin,
    { values },
  );
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
  // Every party already in it hears, as does the team.
  await emailSigners(
    updated,
    updated.signers.filter(
      (s) => s.token !== token && (s.notifiedAt || s.signature),
    ),
    'declined',
    origin,
    { declinedBy, reason },
  );
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

/** The daily reminders (lib/agreements/reminders) for one agreement. */
export async function remindSignersAutomatically(
  agreement: Agreement,
  today: string,
  origin: string,
  opts: {
    dryRun: boolean;
    due: (
      s: AgreementSigner,
      a: Agreement,
      today: string,
    ) => 'due' | 'd5' | 'd2' | null;
  },
) {
  const fresh = await expireIfDue(agreement);
  if (fresh.status !== AGREEMENT_STATUS.SENT)
    return { expired: fresh.status === AGREEMENT_STATUS.EXPIRED, reminded: [] };
  const targets = signersUp(fresh)
    .map((s) => ({ signer: s, kind: opts.due(s, fresh, today) }))
    .filter(
      (t): t is { signer: AgreementSigner; kind: 'due' | 'd5' | 'd2' } =>
        !!t.kind,
    );
  if (opts.dryRun || !targets.length)
    return {
      expired: false,
      reminded: targets.map((t) => ({ name: t.signer.name, kind: t.kind })),
    };
  const sent: typeof targets = [];
  for (const t of targets) {
    const failed = await emailSigners(
      fresh,
      [t.signer],
      t.kind === 'due' ? 'due' : 'reminder',
      origin,
    );
    if (!failed.length) sent.push(t);
  }
  if (sent.length) {
    const at = nowIso();
    await mutate(fresh.id, (a) => ({
      patch: {
        signers: a.signers.map((x) => {
          const t = sent.find((y) => y.signer.id === x.id);
          return t
            ? {
                ...x,
                remindedAt: at,
                autoReminders: Array.from(
                  new Set([...(x.autoReminders ?? []), t.kind]),
                ),
              }
            : x;
        }),
      },
      events: [
        {
          at,
          text: `Reminded ${sent
            .map(
              (t) =>
                `${t.signer.name}${t.kind === 'due' ? ' (due tomorrow)' : ''}`,
            )
            .join(', ')} automatically`,
        },
      ],
    }));
  }
  return {
    expired: false,
    reminded: sent.map((t) => ({ name: t.signer.name, kind: t.kind })),
  };
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

export const pdfUrlFor = (ref: string) =>
  `/api/documents/pdf?ref=${encodeURIComponent(ref)}`;

/** One agreement as the team sees it: signers, their links and progress. */
export async function agreementView(agreement: Agreement, origin: string) {
  const sender = await personById(agreement.createdById);
  const signed = agreement.signers.filter((s) => s.signature).length;
  return {
    id: agreement.id,
    source: 'portal' as 'portal' | 'onboarding' | 'imported',
    companyId: agreement.companyId,
    title: agreement.title,
    category: agreement.category,
    typeKey: agreement.category as string,
    typeLabel: docTypeLabel(agreement.category),
    status: agreement.status,
    confidential: !!agreement.confidential,
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
        userId: s.userId ?? null,
        role: s.role ?? null,
        order: s.order,
        company: !!s.company,
        status: s.status,
        viewedAt: s.viewedAt ?? null,
        notifiedAt: s.notifiedAt ?? null,
        remindedAt: s.remindedAt ?? null,
        signedAt: s.signature?.at ?? null,
        saved: !!s.signature?.saved,
        declinedAt: s.declinedAt ?? null,
        declineReason: s.declineReason ?? null,
        signUrl: signUrl(origin, s) as string | null,
      })),
    link: null as string | null,
    pdfUrl:
      agreement.status === AGREEMENT_STATUS.COMPLETED
        ? pdfUrlFor(agreement.id)
        : null,
    endsOn: agreement.endsOn ?? null,
    previousId: agreement.previousId ?? null,
    linkKind: agreement.linkKind ?? null,
    rolloutId: agreement.rolloutId ?? null,
    templateId: agreement.templateId ?? null,
    templateVersion: agreement.templateVersion ?? null,
    blocking: !!agreement.blocking,
    fieldCount: (agreement.fields ?? []).length,
    corrected: (agreement.corrections ?? []).length > 0,
  };
}

export type AgreementView = Awaited<ReturnType<typeof agreementView>>;

/** The full record: the text, signatures and the audit trail. */
export async function agreementDetail(agreement: Agreement, origin: string) {
  const view = await agreementView(agreement, origin);
  const [previous, next, template] = await Promise.all([
    agreement.previousId
      ? db.agreement.findFirst({
          where: { id: agreement.previousId, companyId: agreement.companyId },
          select: { id: true, title: true, status: true, completedAt: true },
        })
      : null,
    db.agreement.findMany({
      where: { previousId: agreement.id, companyId: agreement.companyId },
      select: {
        id: true,
        title: true,
        status: true,
        linkKind: true,
        sentAt: true,
      },
    }),
    agreement.templateId
      ? db.agreementTemplate.findFirst({
          where: { id: agreement.templateId },
          select: { id: true, name: true, version: true },
        })
      : null,
  ]);
  const fields = agreement.fields ?? [];
  const parties = partiesOf(agreement.signers);
  return {
    ...view,
    fields: fields.map((f) => ({
      ...f,
      signerName: parties[f.signer - 1]?.name ?? null,
    })),
    details: agreement.signers
      .filter((s) => s.values && Object.keys(s.values).length)
      .map((s) => ({
        signerId: s.id,
        name: s.name,
        values: fieldsFor(fields, agreement.signers, s.id).map((f) => ({
          label: f.label,
          text: fieldText(f, s.values?.[f.id]),
        })),
      })),
    corrections: (agreement.corrections ?? []).map((c) => ({
      at: c.at,
      kind: c.kind,
      note: c.note ?? null,
      previousTitle: c.previous?.title ?? null,
      previousHash: c.previous?.hash ?? null,
      signer: c.signer ?? null,
    })),
    previous: previous
      ? {
          id: previous.id as string,
          title: previous.title as string,
          status: previous.status as AGREEMENT_STATUS,
        }
      : null,
    next: (next as Agreement[]).map((n) => ({
      id: n.id,
      title: n.title,
      status: n.status,
      linkKind: n.linkKind ?? null,
      sentAt: n.sentAt,
    })),
    template: template
      ? {
          id: template.id as string,
          name: template.name as string,
          currentVersion: (template.version as number) ?? 1,
        }
      : null,
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
        saved: !!s.signature!.saved,
        at: s.signature!.at,
        ip: s.signature!.ip ?? null,
        userAgent: s.signature!.userAgent ?? null,
      })),
    history: agreement.history,
  };
}

export type AgreementDetail = Awaited<ReturnType<typeof agreementDetail>>;

export const onboardingRef = (onboardingId: string, docId: string) =>
  `onboarding:${onboardingId}:${docId}`;

export const parseOnboardingRef = (ref: string) => {
  const m = /^onboarding:([a-f0-9]{24}):([\w-]{1,40})$/i.exec(ref);
  return m ? { onboardingId: m[1], docId: m[2] } : null;
};

/**
 * The documents new hires signed through onboarding, as rows like any other
 * agreement: the hire signs first, then the company countersigns.
 */
export async function onboardingRows(
  companyId: string,
  origin: string,
  hires?: Onboarding[],
): Promise<Array<AgreementView & { body: string }>> {
  const list: Onboarding[] =
    hires ??
    (await db.onboarding.findMany({
      where: { companyId },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    }));
  const settings = await getSettings(companyId);
  const counterIds = Array.from(
    new Set(
      list.flatMap((o) =>
        (o.documents ?? [])
          .map((d) => d.countersign?.userId)
          .filter((x): x is string => !!x),
      ),
    ),
  );
  const counterUsers = counterIds.length
    ? await db.user.findMany({
        where: { id: { in: counterIds } },
        select: { id: true, email: true },
      })
    : [];
  const emailOf = (id: string) =>
    counterUsers.find((u: { id: string }) => u.id === id)?.email ?? '';
  return list.flatMap((o) =>
    (o.documents ?? []).map((d) => {
      const name = o.details?.legalName || o.name;
      const typeKey = onboardingTypeKey(d.kind);
      const cs = d.countersign;
      const fullySigned = !!d.signature && (!cs || !!cs.signature);
      const status = fullySigned
        ? AGREEMENT_STATUS.COMPLETED
        : o.step === ONBOARDING_STEP.ENDED && !d.signature
          ? AGREEMENT_STATUS.VOIDED
          : AGREEMENT_STATUS.SENT;
      const ref = onboardingRef(o.id, d.id);
      const signers: AgreementView['signers'] = [
        {
          id: o.id,
          name,
          email: o.email,
          userId: o.userId ?? null,
          role: 'New hire',
          order: 1,
          company: false,
          status: d.signature
            ? SIGNER_STATUS.SIGNED
            : d.viewedAt
              ? SIGNER_STATUS.VIEWED
              : SIGNER_STATUS.PENDING,
          viewedAt: d.viewedAt ?? null,
          notifiedAt: d.sentAt,
          remindedAt: null,
          signedAt: d.signature?.at ?? null,
          saved: false,
          declinedAt: null,
          declineReason: null,
          signUrl: `${origin}/join/${o.token}`,
        },
      ];
      if (cs)
        signers.push({
          id: `${o.id}:company`,
          name: cs.name,
          email: emailOf(cs.userId),
          userId: cs.userId,
          role:
            cs.as === 'lead'
              ? 'Hiring lead, for the company'
              : 'For the company',
          order: 2,
          company: true,
          status: cs.signature
            ? SIGNER_STATUS.SIGNED
            : d.signature
              ? SIGNER_STATUS.PENDING
              : SIGNER_STATUS.WAITING,
          viewedAt: null,
          notifiedAt: cs.requestedAt,
          remindedAt: null,
          signedAt: cs.signature?.at ?? null,
          saved: !!cs.signature?.saved,
          declinedAt: null,
          declineReason: null,
          signUrl: null,
        });
      const done = signers.filter((s) => s.signedAt).length;
      return {
        id: ref,
        source: 'onboarding' as const,
        companyId,
        title: d.title || DOC_LABEL[d.kind],
        category: AGREEMENT_CATEGORY.EMPLOYMENT,
        typeKey,
        typeLabel: docTypeLabel(typeKey),
        status,
        confidential: !!settings.types[typeKey]?.confidential,
        message: null,
        ordered: true,
        sentAt: d.sentAt,
        completedAt: fullySigned
          ? [d.signature?.at, cs?.signature?.at].filter(Boolean).sort().at(-1)!
          : null,
        expiresOn: null,
        voidReason: null,
        sender: { id: o.createdById, name: 'Onboarding' },
        progress: { signed: done, total: signers.length },
        signers,
        link: `${origin}/hiring?view=onboarding&company=${companyId}&hire=${o.id}`,
        pdfUrl: d.signature ? pdfUrlFor(ref) : null,
        endsOn: null,
        previousId: null,
        linkKind: null,
        rolloutId: null,
        templateId: null,
        templateVersion: null,
        blocking: false,
        fieldCount: 0,
        corrected: false,
        body: d.body,
      };
    }),
  );
}

/**
 * Every agreement of a company, newest first, onboarding documents included.
 * Confidential ones only for people who may see them.
 */
export async function listAgreements(
  companyId: string,
  origin: string,
  opts: { confidential: boolean },
) {
  const rows: Agreement[] = await db.agreement.findMany({
    where: { companyId },
    orderBy: { sentAt: 'desc' },
    take: 1000,
  });
  const fresh = await Promise.all(rows.map(expireIfDue));
  const [own, onboarding] = await Promise.all([
    Promise.all(fresh.map((a) => agreementView(a, origin))),
    onboardingRows(companyId, origin),
  ]);
  return [...own, ...onboarding.map(({ body: _b, ...r }) => r)]
    .filter((r) => opts.confidential || !r.confidential)
    .sort((a, b) => String(b.sentAt).localeCompare(String(a.sentAt)));
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
    /** The blanks the sender fills in. */
    blanks: templateFields(t.title, t.body).map((key) => ({
      key,
      label: fieldLabel(key),
    })),
    /** What the signers fill in before signing. */
    fields: t.fields ?? [],
    version: t.version ?? 1,
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
      fields: s.fields ?? [],
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
    fields: parseFields(raw?.fields, MAX_SIGNERS),
  };
}

const sameWording = (
  a: { name: string; title: string; body: string; fields?: AgreementField[] },
  b: { name: string; title: string; body: string; fields?: AgreementField[] },
) =>
  a.title === b.title &&
  a.body === b.body &&
  JSON.stringify(a.fields ?? []) === JSON.stringify(b.fields ?? []);

export async function saveTemplate(
  actor: SessionUser,
  companyId: string,
  id: string | null,
  raw: unknown,
) {
  await requireAgreements(actor, companyId, 'agreements:edit');
  const input = parseTemplateInput(raw);
  const at = nowIso();
  // Every change of wording is a new version; the old ones are kept, so an
  // agreement always shows the wording it was sent from.
  const snapshot = (t: AgreementTemplate, version: number) =>
    db.agreementTemplateVersion.create({
      data: {
        templateId: t.id,
        companyId,
        version,
        name: t.name,
        title: t.title,
        body: t.body,
        fields: t.fields ?? [],
        savedById: actor.id,
        createdAt: at,
        updatedAt: at,
      },
    });
  if (id) {
    const found: AgreementTemplate | null =
      await db.agreementTemplate.findFirst({ where: { id, companyId } });
    if (!found) throw new AgreementError(404, 'Template not found.');
    const current = found.version ?? 1;
    const changed = !sameWording(found, input);
    const updated: AgreementTemplate = await db.agreementTemplate.update({
      where: { id },
      data: {
        ...input,
        version: changed ? current + 1 : current,
        updatedById: actor.id,
        updatedAt: at,
      },
    });
    if (changed) await snapshot(updated, current + 1);
    return templateView(updated);
  }
  const created: AgreementTemplate = await db.agreementTemplate.create({
    data: {
      ...input,
      version: 1,
      companyId,
      createdById: actor.id,
      createdAt: at,
      updatedAt: at,
    },
  });
  await snapshot(created, 1);
  return templateView(created);
}

/**
 * Every saved wording of a template, newest first, with how many agreements
 * went out with each. Templates saved before versions existed start at 1.
 */
export async function templateVersions(
  actor: SessionUser,
  companyId: string,
  templateId: string,
) {
  await requireAgreements(actor, companyId, 'agreements:read');
  const t: AgreementTemplate | null = await db.agreementTemplate.findFirst({
    where: { id: templateId, companyId },
  });
  if (!t) throw new AgreementError(404, 'Template not found.');
  const [saved, sent]: [AgreementTemplateVersion[], Agreement[]] =
    await Promise.all([
      db.agreementTemplateVersion.findMany({
        where: { templateId, companyId },
        orderBy: { version: 'desc' },
      }),
      db.agreement.findMany({
        where: { templateId, companyId },
        select: { id: true, templateVersion: true },
      }),
    ]);
  const versions = saved.length
    ? saved
    : [
        {
          id: `${t.id}:1`,
          templateId,
          companyId,
          version: t.version ?? 1,
          name: t.name,
          title: t.title,
          body: t.body,
          fields: t.fields ?? [],
          savedById: t.updatedById ?? t.createdById,
          createdAt: t.updatedAt ?? t.createdAt,
        } as AgreementTemplateVersion,
      ];
  const savers = await db.user.findMany({
    where: {
      id: { in: Array.from(new Set(versions.map((v) => v.savedById))) },
    },
    select: { id: true, name: true },
  });
  return versions
    .slice()
    .sort((a, b) => b.version - a.version)
    .map((v) => ({
      version: v.version,
      current: v.version === (t.version ?? 1),
      title: v.title,
      body: v.body,
      fields: v.fields ?? [],
      savedAt: String(v.createdAt ?? ''),
      savedBy:
        savers.find((u: { id: string }) => u.id === v.savedById)?.name ??
        'Someone',
      sent: sent.filter((a) => (a.templateVersion ?? 1) === v.version).length,
    }));
}

export type TemplateVersionView = Awaited<
  ReturnType<typeof templateVersions>
>[number];

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
  if (e instanceof AgreementError || e instanceof SignerError)
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
