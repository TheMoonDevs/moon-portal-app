import { createHash, randomBytes, randomInt } from 'crypto';

import { requestOnboardingCountersign } from '@/lib/agreements/countersign';
import { ensureIntroCourse } from '@/lib/courses/server';
import { moveApplication } from '@/lib/hiring/server';
import { db } from '@/lib/mongodb/db-client';
import { ensureNotificationsReset } from '@/lib/notifications/server';
import {
  DEFAULT_MEMBER_ROLE_KEY,
  isAllowedInCompany,
} from '@/lib/permissions/company';
import { isAllowed } from '@/lib/permissions/defaults';
import type { SessionUser } from '@/lib/permissions/server';
import {
  ensureUserAccounts,
  signInCodeTaken,
  suggestUsername,
} from '@/lib/users/server';
import { getCompanyAccess, nowIso } from '@/lib/workspace/server';
import type { JobApplication, JobOpening } from '@/models/hiring';
import { APPLICATION_STAGE } from '@/models/hiring';
import type { ONBOARDING_DOC_KIND } from '@/models/onboarding';
import {
  type HireDetails,
  type OfferTerms,
  type Onboarding,
  ONBOARDING_STEP,
  type OnboardingDocument,
  type OnboardingEvent,
  type OnboardingTemplate,
  type OnboardingTerms,
} from '@/models/onboarding';
import { NotificationType } from '@/models/shared/enums';
import type { Company, CompanyMember, Project } from '@/models/workspace';
import { MEMBER_STATUS } from '@/models/workspace';
import { APP_BASE_URL } from '@/utils/constants/appInfo';
import { s3FileUploadSdk } from '@/utils/services/s3FileUploadSdk';

import {
  DEFAULT_DOCUMENTS,
  type DocVariables,
  fillDocument,
} from './documents';
import { type OnboardingEmailKind, sendOnboardingEmail } from './emails';
import {
  addDays,
  AGREEMENT_DOCS,
  CURRENCIES,
  DOC_LABEL,
  formatDay,
  formatMoney,
  HIRE_TYPE_LABEL,
  isDay,
  isHireType,
  OFFER_DOCS,
  todayIst,
  trialEndFor,
  trialLength,
  trialPayFor,
} from './meta';

/*
 * The onboarding flow, step by step. Each function checks the step it is
 * allowed at, so the API, the /join page and the Claude tools share one set
 * of rules. See models/onboarding.ts for the steps.
 */

export class OnboardingError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const JOIN_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,64}$/;
const newToken = () => randomBytes(24).toString('base64url');
const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isEmail = (value: unknown): value is string =>
  typeof value === 'string' && EMAIL_PATTERN.test(value.trim());

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export const joinUrl = (origin: string, token: string) =>
  `${origin}/join/${token}`;

const event = (text: string, byUserId: string | null = null) =>
  ({ at: nowIso(), byUserId, text }) satisfies OnboardingEvent;

/* --------------------------------- access --------------------------------- */

/** Loads an onboarding record and checks `permission` in its company. */
export async function onboardingForActor(
  actor: SessionUser,
  id: string,
  permission: string,
): Promise<Onboarding> {
  const onboarding: Onboarding | null = await db.onboarding.findFirst({
    where: { id },
  });
  if (!onboarding) throw new OnboardingError(404, 'Onboarding not found.');
  await requireInCompany(actor, onboarding.companyId, permission);
  return onboarding;
}

export async function requireInCompany(
  actor: SessionUser,
  companyId: string,
  permission: string,
) {
  const access = await getCompanyAccess(actor.id, companyId);
  if (!access?.member && !actor.isAdmin)
    throw new OnboardingError(404, 'Company not found.');
  if (!isAllowedInCompany(actor, access, permission))
    throw new OnboardingError(
      403,
      `This needs the ${permission} permission in the company.`,
    );
  return access;
}

const isOwner = (member: CompanyMember | null | undefined) =>
  !!member && (member.roleKeys ?? []).includes('owner');

/**
 * Who may confirm or end a trial: the hire's hiring manager, their buddy,
 * the opening's hiring lead, a company owner, or a portal admin.
 */
export async function canDecideTrial(
  actor: SessionUser,
  onboarding: Onboarding,
): Promise<boolean> {
  if (actor.isAdmin || isAllowed(actor, '*')) return true;
  const ids = [onboarding.terms?.leadId, onboarding.terms?.buddyId];
  if (onboarding.openingId) {
    const opening: JobOpening | null = await db.jobOpening.findFirst({
      where: { id: onboarding.openingId },
    });
    ids.push(opening?.hiringLeadId);
  }
  if (ids.includes(actor.id)) return true;
  const access = await getCompanyAccess(actor.id, onboarding.companyId);
  return isOwner(access?.member);
}

/* --------------------------------- people --------------------------------- */

export interface Contact {
  id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
}

/**
 * The person a hire can turn to: their hiring manager, or a company owner
 * when no manager is set.
 */
export async function contactFor(onboarding: Onboarding): Promise<Contact> {
  let userId = onboarding.terms?.leadId ?? null;
  let role = 'Hiring manager';
  if (!userId && onboarding.openingId) {
    const opening: JobOpening | null = await db.jobOpening.findFirst({
      where: { id: onboarding.openingId },
    });
    userId = opening?.hiringLeadId ?? null;
  }
  if (!userId) {
    const owners: CompanyMember[] = await db.companyMember.findMany({
      where: {
        companyId: onboarding.companyId,
        status: MEMBER_STATUS.ACTIVE,
        roleKeys: { has: 'owner' },
      },
    });
    userId = owners[0]?.userId ?? onboarding.createdById;
    role = 'Company owner';
  }
  const user = userId
    ? await db.user.findFirst({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      })
    : null;
  // A phone number, when they gave one on their own onboarding.
  const own: Onboarding | null = userId
    ? await db.onboarding.findFirst({ where: { userId } })
    : null;
  const member: CompanyMember | null = userId
    ? await db.companyMember.findFirst({
        where: { companyId: onboarding.companyId, userId },
      })
    : null;
  return {
    id: user?.id ?? null,
    name: user?.name || 'The hiring team',
    email: user?.email ?? null,
    phone: own?.details?.phone ?? null,
    role: member?.title || role,
  };
}

async function companyOf(companyId: string): Promise<Company> {
  const company: Company | null = await db.company.findFirst({
    where: { id: companyId },
  });
  if (!company) throw new OnboardingError(404, 'Company not found.');
  return company;
}

/* ------------------------------- documents -------------------------------- */

/** The company's wording for a document, or the built-in draft. */
export async function templateFor(
  companyId: string,
  kind: ONBOARDING_DOC_KIND,
) {
  const own: OnboardingTemplate | null = await db.onboardingTemplate.findFirst({
    where: { companyId, kind },
  });
  return own
    ? { title: own.title, body: own.body, custom: true }
    : { ...DEFAULT_DOCUMENTS[kind], custom: false };
}

async function docVariables(
  onboarding: Onboarding,
  terms: OnboardingTerms,
  offer: OfferTerms | null,
): Promise<DocVariables> {
  const contact = await contactFor({ ...onboarding, terms });
  const project: Project | null = terms.projectId
    ? await db.project.findFirst({ where: { id: terms.projectId } })
    : null;
  const pay = trialPayFor(terms.monthlyPay, terms.hireType, terms.currency);
  const start = onboarding.trialStartsOn ?? terms.startDate;
  const end = onboarding.trialEndsOn ?? trialEndFor(start, terms.hireType);
  const details = onboarding.details;
  const address = [details?.address, details?.city, details?.country]
    .filter(Boolean)
    .join(', ');
  return {
    companyName: terms.companyName,
    hireName: details?.legalName || onboarding.name,
    hireEmail: onboarding.email,
    hireAddress: address || 'address on file',
    role: terms.role,
    hireType: HIRE_TYPE_LABEL[terms.hireType],
    trialLength: trialLength(terms.hireType),
    trialDays: String(pay.days),
    trialStart: formatDay(start),
    trialEnd: formatDay(end),
    monthlyPay: formatMoney(terms.monthlyPay, terms.currency),
    trialPayFull: formatMoney(pay.full, pay.currency),
    trialPayHalf: formatMoney(pay.half, pay.currency),
    projectName: project?.name ?? 'the projects you are given',
    location: terms.location || 'Remote',
    contactName: contact.name,
    contactRole: contact.role,
    contactEmail: contact.email ?? '',
    contactPhone: contact.phone ? `· ${contact.phone}` : '',
    today: formatDay(todayIst()),
    offerRole: offer?.role ?? terms.role,
    offerType: HIRE_TYPE_LABEL[offer?.hireType ?? terms.hireType],
    offerPay: offer ? formatMoney(offer.monthlyPay, offer.currency) : '',
    joiningDate: offer ? formatDay(offer.joiningDate) : '',
    noticeDays: offer ? String(offer.noticeDays) : '',
    offerNote: offer?.note ?? '',
  };
}

/** The documents of one round, written for this hire. */
export async function renderDocuments(
  onboarding: Onboarding,
  kinds: ONBOARDING_DOC_KIND[],
  terms: OnboardingTerms,
  offer: OfferTerms | null = null,
): Promise<OnboardingDocument[]> {
  const vars = await docVariables(onboarding, terms, offer);
  const at = nowIso();
  return Promise.all(
    kinds.map(async (kind) => {
      const template = await templateFor(onboarding.companyId, kind);
      const body = fillDocument(template.body, vars)
        // Lines left empty by a blank placeholder.
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      return {
        id: randomBytes(6).toString('hex'),
        kind,
        title: fillDocument(template.title, vars).trim() || DOC_LABEL[kind],
        body,
        hash: sha256(body),
        sentAt: at,
        viewedAt: null,
        signature: null,
      };
    }),
  );
}

/* --------------------------------- terms ---------------------------------- */

/** Terms from an untrusted body, with every field checked. */
export async function parseTerms(
  companyId: string,
  raw: Record<string, unknown>,
): Promise<OnboardingTerms> {
  const fail = (message: string) => {
    throw new OnboardingError(400, message);
  };
  // The agreements name the company; its portal name unless the lead gives
  // the legal one (e.g. "The Moon Devs Pvt. Ltd.").
  const companyName =
    text(raw.companyName, 120) ||
    ((await db.company.findFirst({ where: { id: companyId } }))?.name as
      | string
      | undefined) ||
    '';
  if (!companyName) fail('Add the company name for the agreements.');
  const role = text(raw.role, 120);
  if (!role) fail('Add their role.');
  if (!isHireType(raw.hireType)) fail('Choose Intern or Full-time.');
  const monthlyPay = Number(raw.monthlyPay);
  if (!Number.isFinite(monthlyPay) || monthlyPay <= 0)
    fail('Add their monthly pay, so the trial payment can be worked out.');
  const currency = text(raw.currency, 3).toUpperCase() || 'INR';
  if (!CURRENCIES.includes(currency)) fail('Unknown currency.');
  const startDate = isDay(raw.startDate) ? raw.startDate : todayIst();

  const memberIn = async (id: unknown, label: string) => {
    if (typeof id !== 'string' || !id) return null;
    const member = await db.companyMember.count({
      where: { companyId, userId: id, status: MEMBER_STATUS.ACTIVE },
    });
    if (!member) fail(`Their ${label} has to be in the company.`);
    return id;
  };
  const projectId =
    typeof raw.projectId === 'string' && raw.projectId ? raw.projectId : null;
  if (projectId) {
    const found = await db.project.count({
      where: { id: projectId, companyId },
    });
    if (!found) fail('That project isn’t in this company.');
  }
  return {
    companyName,
    role,
    hireType: raw.hireType as OnboardingTerms['hireType'],
    monthlyPay: Math.round(monthlyPay),
    currency,
    startDate,
    projectId,
    location: text(raw.location, 120) || 'Remote',
    leadId: await memberIn(raw.leadId, 'hiring manager'),
    buddyId: await memberIn(raw.buddyId, 'buddy'),
  };
}

export function parseOffer(
  raw: Record<string, unknown>,
  terms: OnboardingTerms,
): OfferTerms {
  const pay = Number(raw.monthlyPay ?? terms.monthlyPay);
  if (!Number.isFinite(pay) || pay <= 0)
    throw new OnboardingError(400, 'Add their monthly pay for the offer.');
  const currency = (text(raw.currency, 3) || terms.currency).toUpperCase();
  if (!CURRENCIES.includes(currency))
    throw new OnboardingError(400, 'Unknown currency.');
  const notice = Number(raw.noticeDays ?? 15);
  return {
    role: text(raw.role, 120) || terms.role,
    hireType: isHireType(raw.hireType) ? raw.hireType : terms.hireType,
    monthlyPay: Math.round(pay),
    currency,
    joiningDate: isDay(raw.joiningDate)
      ? raw.joiningDate
      : addDays(todayIst(), 1),
    noticeDays:
      Number.isFinite(notice) && notice >= 0 && notice <= 180
        ? Math.round(notice)
        : 15,
    note: text(raw.note, 1000) || null,
  };
}

/* --------------------------------- emails --------------------------------- */

async function emailHire(
  onboarding: Onboarding,
  kind: OnboardingEmailKind,
  origin: string,
  extra: {
    passcode?: string | null;
    courseUrl?: string;
  } = {},
): Promise<{ sent: boolean; error: string | null; subject: string }> {
  const company = await companyOf(onboarding.companyId);
  const contact = await contactFor(onboarding);
  const name = onboarding.details?.preferredName || onboarding.name;
  const { subject, error } = await sendOnboardingEmail(
    {
      kind,
      to: onboarding.email,
      firstName: name.trim().split(/\s+/)[0] || name,
      companyName: onboarding.terms?.companyName || company.name,
      role: onboarding.terms?.role || 'a new member of the team',
      joinUrl: joinUrl(origin, onboarding.token),
      contact,
      loginUrl: `${origin}/login`,
      courseUrl: extra.courseUrl,
      passcode: extra.passcode ?? null,
      signInEmail: onboarding.details?.signInEmail ?? onboarding.email,
      trialStartsOn: onboarding.trialStartsOn,
      trialEndsOn: onboarding.trialEndsOn,
    },
    `onboarding-${onboarding.id}-${kind}-${Date.now()}`,
  );
  if (!error)
    await db.onboarding.update({
      where: { id: onboarding.id },
      data: { lastEmail: { at: nowIso(), subject } },
    });
  return { sent: !error, error, subject };
}

/** Tells the people running a hire that something needs them. */
async function notifyTeam(
  onboarding: Onboarding,
  title: string,
  description: string,
) {
  const ids = Array.from(
    new Set(
      [
        onboarding.terms?.leadId,
        onboarding.terms?.buddyId,
        onboarding.createdById,
      ].filter((id): id is string => !!id),
    ),
  );
  if (!ids.length) return;
  await ensureNotificationsReset();
  const at = new Date();
  await db.notification.createMany({
    data: ids.map((userId) => ({
      userId,
      title,
      description,
      matchId: onboarding.id,
      matchType: 'Onboarding',
      notificationType: NotificationType.SELF_GENERATED,
      notificationData: {
        kind: 'onboarding',
        actions: [
          {
            title: 'Open',
            trigger_type: 'link',
            trigger: `/hiring?view=onboarding&company=${onboarding.companyId}&hire=${onboarding.id}`,
          },
        ],
      },
      isRead: false,
      createdAt: at,
      updatedAt: at,
    })),
  });
}

/* ------------------------------- the steps -------------------------------- */

export interface StartInput {
  companyId: string;
  applicationId?: string | null;
  name?: string | null;
  email?: string | null;
  /** Agreement terms filled in now, to send as soon as details come back. */
  terms?: Record<string, unknown> | null;
}

export interface StepResult {
  onboarding: Onboarding;
  /** Set when the step's email could not go out. */
  emailError?: string | null;
}

/**
 * Starts onboarding: makes the record and emails the hire their details
 * form. From an application, the applicant moves to Hired (and stays in the
 * talent pool as Hired).
 */
export async function startOnboarding(
  actor: SessionUser,
  input: StartInput,
  origin: string,
): Promise<StepResult> {
  await requireInCompany(actor, input.companyId, 'hiring:edit');

  let application: JobApplication | null = null;
  if (input.applicationId) {
    application = await db.jobApplication.findFirst({
      where: { id: input.applicationId, companyId: input.companyId },
    });
    if (!application)
      throw new OnboardingError(404, 'That applicant isn’t in this company.');
  }
  const name = text(application?.name ?? input.name, 120);
  const email = text(application?.email ?? input.email, 200).toLowerCase();
  if (!name) throw new OnboardingError(400, 'Add their name.');
  if (!isEmail(email)) throw new OnboardingError(400, 'Add a valid email.');

  const open: Onboarding | null = await db.onboarding.findFirst({
    where: {
      companyId: input.companyId,
      email,
      step: { notIn: [ONBOARDING_STEP.ENDED, ONBOARDING_STEP.HIRED] },
    },
  });
  if (open)
    throw new OnboardingError(409, `${name} is already being onboarded.`);

  const terms =
    input.terms && Object.keys(input.terms).length
      ? await parseTerms(input.companyId, input.terms)
      : null;

  const now = nowIso();
  const onboarding: Onboarding = await db.onboarding.create({
    data: {
      companyId: input.companyId,
      applicationId: application?.id ?? null,
      openingId: application?.openingId ?? null,
      name,
      email,
      token: newToken(),
      step: ONBOARDING_STEP.DETAILS,
      userId: null,
      createdUser: false,
      details: null,
      terms,
      autoSendAgreements: !!terms,
      documents: [],
      trialPay: terms
        ? trialPayFor(terms.monthlyPay, terms.hireType, terms.currency)
        : null,
      history: [
        event(
          terms
            ? 'Started onboarding with the agreement terms ready'
            : 'Started onboarding',
          actor.id,
        ),
      ],
      createdById: actor.id,
      createdAt: now,
      updatedAt: now,
    },
  });

  if (application) {
    if (application.stage !== APPLICATION_STAGE.HIRED)
      application = await moveApplication(
        application,
        APPLICATION_STAGE.HIRED,
        actor.id,
      );
    await db.jobApplication.update({
      where: { id: application!.id },
      data: { onboardingId: onboarding.id, updatedAt: now },
    });
  }

  const mail = await emailHire(onboarding, 'details', origin);
  await logStep(
    onboarding,
    mail.sent
      ? 'Emailed the details form'
      : `The details form email did not go out: ${mail.error}`,
    actor.id,
  );
  return { onboarding: await reload(onboarding.id), emailError: mail.error };
}

async function reload(id: string): Promise<Onboarding> {
  return db.onboarding.findFirst({ where: { id } });
}

async function logStep(
  onboarding: Onboarding,
  text: string,
  byUserId: string | null,
  data: Record<string, unknown> = {},
) {
  await db.onboarding.update({
    where: { id: onboarding.id },
    data: {
      ...data,
      updatedAt: nowIso(),
      history: { push: event(text, byUserId) },
    },
  });
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
async function freshSignInCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = Array.from(
      { length: 6 },
      () => CODE_CHARS[randomInt(CODE_CHARS.length)],
    ).join('');
    if (!(await signInCodeTaken(code))) return code;
  }
  throw new OnboardingError(500, 'Could not make a sign-in code. Try again.');
}

const PHOTO_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function checkPhoto(file: File | null): string | null {
  if (!file) return null;
  if (!PHOTO_TYPES[file.type]) return 'Use a PNG, JPG or WebP photo.';
  if (file.size > MAX_PHOTO_BYTES) return 'Photos can be up to 5 MB.';
  return null;
}

/** The details form's answers, checked. */
export function parseDetails(
  raw: Record<string, unknown>,
  fallbackEmail: string,
): { details: HireDetails | null; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const legalName = text(raw.legalName, 120);
  if (legalName.split(/\s+/).length < 2)
    errors.legalName = 'Your full name, as on your ID.';
  const signInEmail = (
    text(raw.signInEmail, 200) || fallbackEmail
  ).toLowerCase();
  if (!isEmail(signInEmail))
    errors.signInEmail = 'A valid Google account email.';
  const phone = text(raw.phone, 40);
  if (!/^[+\d][\d\s()-]{6,}$/.test(phone))
    errors.phone = 'A phone number we can reach you on, with country code.';
  const timezone = text(raw.timezone, 64);
  if (!timezone) errors.timezone = 'Choose your timezone.';
  const dateOfBirth = isDay(raw.dateOfBirth) ? raw.dateOfBirth : null;
  const city = text(raw.city, 80);
  const country = text(raw.country, 80);
  if (!city) errors.city = 'Where you live.';
  if (!country) errors.country = 'Your country.';
  if (Object.keys(errors).length) return { details: null, errors };
  return {
    details: {
      legalName,
      preferredName: text(raw.preferredName, 60) || null,
      signInEmail,
      phone,
      dateOfBirth,
      address: text(raw.address, 300) || null,
      city,
      country,
      timezone,
      linkedin: text(raw.linkedin, 300) || null,
      portfolio: text(raw.portfolio, 300) || null,
      emergencyName: text(raw.emergencyName, 120) || null,
      emergencyPhone: text(raw.emergencyPhone, 40) || null,
      submittedAt: nowIso(),
    },
    errors,
  };
}

/**
 * The hire sends their details form: their portal account is made (or an
 * existing one linked) with their photo. The agreements go out straight away
 * when the lead already filled in the terms.
 */
export async function submitDetails(
  onboarding: Onboarding,
  details: HireDetails,
  photo: File | null,
  origin: string,
): Promise<StepResult> {
  if (onboarding.step !== ONBOARDING_STEP.DETAILS)
    throw new OnboardingError(409, 'We already have your details. Thank you!');

  await ensureUserAccounts();
  const emails = Array.from(new Set([onboarding.email, details.signInEmail]));
  let user = await db.user.findFirst({
    where: {
      OR: [{ email: { in: emails } }, { linkedEmails: { in: emails } }],
    },
  });
  if (!user && !photo) throw new OnboardingError(400, 'Add a profile photo.');

  const now = new Date();
  const displayName = details.preferredName
    ? `${details.preferredName} ${details.legalName.split(/\s+/).slice(-1)[0]}`
    : details.legalName;
  let createdUser = false;
  if (!user) {
    user = await db.user.create({
      data: {
        name: displayName,
        email: onboarding.email,
        linkedEmails:
          details.signInEmail !== onboarding.email ? [details.signInEmail] : [],
        username: await suggestUsername(displayName, onboarding.email),
        // Made now, sent only once the agreements are signed.
        code: await freshSignInCode(),
        timezone: details.timezone,
        status: 'ACTIVE',
        claudeLocked: true,
        createdAt: now,
        updatedAt: now,
      },
    });
    createdUser = true;
  } else {
    const linked: string[] = user.linkedEmails ?? [];
    const missing = emails.filter(
      (e) => e !== user!.email && !linked.includes(e),
    );
    await db.user.update({
      where: { id: user.id },
      data: {
        ...(missing.length ? { linkedEmails: [...linked, ...missing] } : {}),
        ...(user.timezone ? {} : { timezone: details.timezone }),
        updatedAt: now,
      },
    });
  }

  // A storage hiccup must not lose the form: their account and details are
  // kept, and the photo can be set again from their profile.
  if (photo) {
    try {
      const fileName = `${Date.now()}.${PHOTO_TYPES[photo.type]}`;
      const res = await s3FileUploadSdk.uploadFile({
        userId: user.id,
        folder: 'avatars',
        fileInfoWithFileBuffer: {
          fileName,
          fileType: photo.type,
          fileBuffer: Buffer.from(await photo.arrayBuffer()),
        },
      });
      if (res?.$metadata?.httpStatusCode === 200) {
        const avatar = s3FileUploadSdk
          .getPublicFileUrl({
            userId: user.id,
            folder: 'avatars',
            file: { fileName },
          })
          .trim();
        await db.user.update({ where: { id: user.id }, data: { avatar } });
      }
    } catch (e) {
      console.error('[onboarding] profile photo upload failed', e);
    }
  }

  await logStep(
    onboarding,
    createdUser
      ? 'Sent their details; made their portal account'
      : 'Sent their details; linked their existing portal account',
    null,
    {
      details,
      userId: user.id,
      createdUser,
      step: ONBOARDING_STEP.AGREEMENTS,
    },
  );
  let updated = await reload(onboarding.id);

  if (updated.autoSendAgreements && updated.terms) {
    const sent = await sendAgreements(null, updated, null, origin);
    return sent;
  }
  await notifyTeam(
    updated,
    `${onboarding.name} sent their details`,
    'Fill in their terms and send the Trial Policy and NDA.',
  );
  updated = await reload(onboarding.id);
  return { onboarding: updated };
}

/**
 * Saves the agreement terms and sends the Trial Policy and NDA. Before the
 * details form is back, the terms are kept and the agreements go out by
 * themselves once it is. Sending again replaces unsigned documents.
 */
export async function sendAgreements(
  actor: SessionUser | null,
  onboarding: Onboarding,
  rawTerms: Record<string, unknown> | null,
  origin: string,
  { send = true }: { send?: boolean } = {},
): Promise<StepResult> {
  if (
    onboarding.step !== ONBOARDING_STEP.DETAILS &&
    onboarding.step !== ONBOARDING_STEP.AGREEMENTS
  )
    throw new OnboardingError(409, 'The agreements are already signed.');
  if (
    onboarding.documents.some(
      (d) => AGREEMENT_DOCS.includes(d.kind) && d.signature,
    )
  )
    throw new OnboardingError(
      409,
      'They have started signing. The terms can’t change now.',
    );

  const terms = rawTerms
    ? await parseTerms(onboarding.companyId, rawTerms)
    : onboarding.terms;
  if (!terms) throw new OnboardingError(400, 'Fill in the terms first.');
  const trialPay = trialPayFor(
    terms.monthlyPay,
    terms.hireType,
    terms.currency,
  );
  const byUserId = actor?.id ?? null;

  if (onboarding.step === ONBOARDING_STEP.DETAILS || !send) {
    await logStep(
      onboarding,
      onboarding.step === ONBOARDING_STEP.DETAILS
        ? 'Saved the agreement terms; they go out when the details form is back'
        : 'Saved the agreement terms',
      byUserId,
      { terms, trialPay, autoSendAgreements: send },
    );
    return { onboarding: await reload(onboarding.id) };
  }

  const withTerms = { ...onboarding, terms };
  const documents = await renderDocuments(withTerms, AGREEMENT_DOCS, terms);
  await db.onboarding.update({
    where: { id: onboarding.id },
    data: { terms, trialPay, documents, autoSendAgreements: false },
  });
  const updated = await reload(onboarding.id);
  const mail = await emailHire(updated, 'agreements', origin);
  await logStep(
    updated,
    mail.sent
      ? 'Sent the Trial Policy and NDA to sign'
      : `The agreements are ready, but the email did not go out: ${mail.error}`,
    byUserId,
  );
  return { onboarding: await reload(onboarding.id), emailError: mail.error };
}

const sameName = (a: string, b: string) =>
  a.trim().replace(/\s+/g, ' ').toLowerCase() ===
  b.trim().replace(/\s+/g, ' ').toLowerCase();

/** The documents the hire is signing now. */
export const currentRound = (onboarding: Onboarding) =>
  onboarding.step === ONBOARDING_STEP.AGREEMENTS
    ? AGREEMENT_DOCS
    : onboarding.step === ONBOARDING_STEP.OFFER
      ? OFFER_DOCS
      : [];

/** The hire opened a document. */
export async function markViewed(onboarding: Onboarding, docId: string) {
  const doc = onboarding.documents.find((d) => d.id === docId);
  if (!doc || doc.viewedAt) return;
  await db.onboarding.update({
    where: { id: onboarding.id },
    data: {
      documents: onboarding.documents.map((d) =>
        d.id === docId ? { ...d, viewedAt: nowIso() } : d,
      ),
    },
  });
}

/**
 * The hire signs one document by typing their full name. When the last one
 * of the round is signed, the next step starts by itself.
 */
export async function signDocument(
  onboarding: Onboarding,
  docId: string,
  input: { name: unknown; agree: unknown },
  meta: { ip: string | null; userAgent: string | null },
  origin: string,
): Promise<StepResult> {
  const round = currentRound(onboarding);
  const doc = onboarding.documents.find((d) => d.id === docId);
  if (!doc || !round.includes(doc.kind))
    throw new OnboardingError(404, 'This document isn’t waiting for you.');
  if (doc.signature) throw new OnboardingError(409, 'Already signed.');
  if (doc.hash !== sha256(doc.body))
    throw new OnboardingError(409, 'This document changed. Reload the page.');
  const name = text(input.name, 120);
  const legal = onboarding.details?.legalName ?? onboarding.name;
  if (!name || !sameName(name, legal))
    throw new OnboardingError(
      400,
      `Type your full name exactly as on your details: ${legal}`,
    );
  if (input.agree !== true)
    throw new OnboardingError(400, 'Tick the box to agree first.');

  const at = nowIso();
  const documents = onboarding.documents.map((d) =>
    d.id === docId
      ? {
          ...d,
          viewedAt: d.viewedAt ?? at,
          signature: {
            name,
            at,
            ip: meta.ip,
            userAgent: meta.userAgent?.slice(0, 300) ?? null,
            provider: 'portal',
          },
        }
      : d,
  );
  await logStep(
    onboarding,
    `Signed the ${doc.title}`,
    onboarding.userId ?? null,
    {
      documents,
    },
  );
  // The company countersigns it afterwards; onboarding doesn't wait.
  await requestOnboardingCountersign(onboarding.id, docId, origin).catch((e) =>
    console.error('[onboarding] countersign', e),
  );
  const updated = await reload(onboarding.id);
  const done = documents
    .filter((d) => round.includes(d.kind))
    .every((d) => d.signature);
  if (!done) return { onboarding: updated };
  return onboarding.step === ONBOARDING_STEP.AGREEMENTS
    ? grantAccess(updated, origin)
    : completeHire(updated, origin);
}

/**
 * Everything is signed: their portal account opens (with a passcode), they
 * join the company and their first project, and the trial starts. They get
 * their sign-in and the intro course by email. No Claude yet.
 */
export async function grantAccess(
  onboarding: Onboarding,
  origin: string,
): Promise<StepResult> {
  const terms = onboarding.terms;
  if (!terms || !onboarding.userId)
    throw new OnboardingError(409, 'Their details and terms are missing.');
  const user = await db.user.findFirst({ where: { id: onboarding.userId } });
  if (!user) throw new OnboardingError(404, 'Their account is missing.');

  const now = nowIso();
  const passcode = user.code ?? (await freshSignInCode());
  await db.user.update({
    where: { id: user.id },
    data: {
      code: passcode,
      status: 'ACTIVE',
      positionTitle: user.positionTitle || terms.role,
      ...(onboarding.createdUser ? { claudeLocked: true } : {}),
      updatedAt: new Date(),
    },
  });

  const member: CompanyMember | null = await db.companyMember.findFirst({
    where: { companyId: onboarding.companyId, userId: user.id },
  });
  if (!member)
    await db.companyMember.create({
      data: {
        companyId: onboarding.companyId,
        userId: user.id,
        roleKeys: [DEFAULT_MEMBER_ROLE_KEY],
        title: terms.role,
        status: MEMBER_STATUS.ACTIVE,
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    });
  else if (member.status !== MEMBER_STATUS.ACTIVE)
    await db.companyMember.update({
      where: { id: member.id },
      data: { status: MEMBER_STATUS.ACTIVE, title: terms.role, updatedAt: now },
    });

  if (terms.projectId) {
    const project: Project | null = await db.project.findFirst({
      where: { id: terms.projectId },
    });
    if (project && !(project.memberIds ?? []).includes(user.id))
      await db.project.update({
        where: { id: project.id },
        data: {
          memberIds: [...(project.memberIds ?? []), user.id],
          updatedAt: now,
        },
      });
  }

  const today = todayIst();
  const start = terms.startDate > today ? terms.startDate : today;
  const end = trialEndFor(start, terms.hireType);
  const course = await ensureIntroCourse(
    onboarding.companyId,
    onboarding.createdById,
  );
  await logStep(
    onboarding,
    `Signed everything; portal access open, trial ${formatDay(start)} to ${formatDay(end)}`,
    null,
    {
      step: ONBOARDING_STEP.TRIAL,
      accessAt: now,
      trialStartsOn: start,
      trialEndsOn: end,
      trialPay: trialPayFor(terms.monthlyPay, terms.hireType, terms.currency),
    },
  );
  const updated = await reload(onboarding.id);
  const mail = await emailHire(updated, 'access', origin, {
    passcode: user.code ? null : passcode,
    courseUrl: `${origin}/courses/${course.id}`,
  });
  await logStep(
    updated,
    mail.sent
      ? 'Emailed their sign-in, passcode and the Portal course'
      : `The sign-in email did not go out: ${mail.error}`,
    null,
  );
  await notifyTeam(
    updated,
    `${onboarding.name} signed the agreements`,
    `Their trial runs ${formatDay(start)} to ${formatDay(end)}.`,
  );
  return { onboarding: await reload(onboarding.id), emailError: mail.error };
}

/**
 * Closes a hire's access: out of the company and its projects, their API
 * tokens revoked, and (when onboarding made their account) the account
 * itself turned off.
 */
async function revokeAccess(onboarding: Onboarding) {
  if (!onboarding.userId) return;
  const userId = onboarding.userId;
  const now = nowIso();
  await db.companyMember.updateMany({
    where: { companyId: onboarding.companyId, userId },
    data: { status: MEMBER_STATUS.REMOVED, updatedAt: now },
  });
  const projects: Project[] = await db.project.findMany({
    where: {
      companyId: onboarding.companyId,
      OR: [{ memberIds: { has: userId } }, { leadIds: { has: userId } }],
    },
  });
  for (const p of projects)
    await db.project.update({
      where: { id: p.id },
      data: {
        memberIds: (p.memberIds ?? []).filter((id) => id !== userId),
        leadIds: (p.leadIds ?? []).filter((id) => id !== userId),
        updatedAt: now,
      },
    });
  if (onboarding.createdUser) {
    await db.user.update({
      where: { id: userId },
      data: { status: 'INACTIVE', updatedAt: new Date() },
    });
    await db.apiToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}

export interface DecisionInput {
  outcome: 'ACCEPTED' | 'REJECTED';
  note?: string | null;
  offer?: Record<string, unknown> | null;
  /** Email the hire (on by default). */
  notify?: boolean;
}

/**
 * Ends the trial. Accepted: the offer letter and Work Agreement go out to
 * sign (the trial can be confirmed early). Rejected: their portal access
 * closes and half the trial pay is owed.
 */
export async function decideTrial(
  actor: SessionUser,
  onboarding: Onboarding,
  input: DecisionInput,
  origin: string,
): Promise<StepResult> {
  if (onboarding.step !== ONBOARDING_STEP.TRIAL)
    throw new OnboardingError(409, 'They are not on trial.');
  if (!(await canDecideTrial(actor, onboarding)))
    throw new OnboardingError(
      403,
      'Only their hiring manager, buddy or a company owner can decide a trial.',
    );
  const terms = onboarding.terms!;
  const pay =
    onboarding.trialPay ??
    trialPayFor(terms.monthlyPay, terms.hireType, terms.currency);
  const early = !!onboarding.trialEndsOn && todayIst() < onboarding.trialEndsOn;
  const note = text(input.note, 1000) || null;
  const at = nowIso();

  if (input.outcome === 'REJECTED') {
    await revokeAccess(onboarding);
    await logStep(
      onboarding,
      `Ended the trial; access closed, ${formatMoney(pay.half, pay.currency)} owed for the trial`,
      actor.id,
      {
        step: ONBOARDING_STEP.ENDED,
        endedAt: at,
        decision: {
          outcome: 'REJECTED',
          at,
          byUserId: actor.id,
          note,
          early,
          trialPayDue: pay.half,
        },
      },
    );
    const updated = await reload(onboarding.id);
    if (input.notify === false) return { onboarding: updated };
    const mail = await emailHire(updated, 'ended', origin);
    if (!mail.sent)
      await logStep(
        updated,
        `The email did not go out: ${mail.error}`,
        actor.id,
      );
    return { onboarding: await reload(onboarding.id), emailError: mail.error };
  }

  const offer = parseOffer(input.offer ?? {}, terms);
  const documents = [
    ...onboarding.documents,
    ...(await renderDocuments(onboarding, OFFER_DOCS, terms, offer)),
  ];
  await logStep(
    onboarding,
    early
      ? 'Confirmed the trial early; sent the offer'
      : 'Confirmed the trial; sent the offer',
    actor.id,
    {
      step: ONBOARDING_STEP.OFFER,
      offer,
      documents,
      decision: {
        outcome: 'ACCEPTED',
        at,
        byUserId: actor.id,
        note,
        early,
        trialPayDue: pay.full,
      },
    },
  );
  const updated = await reload(onboarding.id);
  const mail = await emailHire(updated, 'offer', origin);
  if (!mail.sent)
    await logStep(
      updated,
      `The offer is ready, but the email did not go out: ${mail.error}`,
      actor.id,
    );
  return { onboarding: await reload(onboarding.id), emailError: mail.error };
}

/** The offer is signed: Claude opens and they are fully hired. */
export async function completeHire(
  onboarding: Onboarding,
  origin: string,
): Promise<StepResult> {
  if (onboarding.userId)
    await db.user.update({
      where: { id: onboarding.userId },
      data: { claudeLocked: false, updatedAt: new Date() },
    });
  const at = nowIso();
  await logStep(
    onboarding,
    'Signed the offer; fully hired, Claude unlocked',
    null,
    {
      step: ONBOARDING_STEP.HIRED,
      hiredAt: at,
    },
  );
  const course = await ensureIntroCourse(
    onboarding.companyId,
    onboarding.createdById,
  );
  const updated = await reload(onboarding.id);
  const mail = await emailHire(updated, 'hired', origin, {
    courseUrl: `${origin}/courses/${course.id}`,
  });
  await notifyTeam(
    updated,
    `${onboarding.name} signed their offer`,
    'They are fully hired. Set up their introductory call.',
  );
  return { onboarding: await reload(onboarding.id), emailError: mail.error };
}

/**
 * Stops onboarding before or after the trial (they withdrew, or the offer
 * was declined). On trial, use decideTrial so the trial pay is recorded.
 */
export async function endOnboarding(
  actor: SessionUser,
  onboarding: Onboarding,
  input: { note?: string | null; notify?: boolean },
  origin: string,
): Promise<StepResult> {
  if (onboarding.step === ONBOARDING_STEP.TRIAL)
    return decideTrial(
      actor,
      onboarding,
      { outcome: 'REJECTED', note: input.note, notify: input.notify },
      origin,
    );
  if (
    onboarding.step === ONBOARDING_STEP.ENDED ||
    onboarding.step === ONBOARDING_STEP.HIRED
  )
    throw new OnboardingError(409, 'Onboarding is already finished.');
  await requireInCompany(actor, onboarding.companyId, 'hiring:edit');
  await revokeAccess(onboarding);
  const note = text(input.note, 1000);
  await logStep(
    onboarding,
    note ? `Stopped onboarding: ${note}` : 'Stopped onboarding',
    actor.id,
    { step: ONBOARDING_STEP.ENDED, endedAt: nowIso() },
  );
  return { onboarding: await reload(onboarding.id) };
}

/** Sends the email for the step they are on again. */
export async function resendStepEmail(
  actor: SessionUser,
  onboarding: Onboarding,
  origin: string,
): Promise<StepResult> {
  const kind: OnboardingEmailKind | null =
    onboarding.step === ONBOARDING_STEP.DETAILS
      ? 'details'
      : onboarding.step === ONBOARDING_STEP.AGREEMENTS
        ? onboarding.documents.length
          ? 'agreements'
          : null
        : onboarding.step === ONBOARDING_STEP.OFFER
          ? 'offer'
          : null;
  if (!kind && onboarding.step !== ONBOARDING_STEP.TRIAL)
    throw new OnboardingError(409, 'There is nothing to send again right now.');

  let mail;
  if (kind) mail = await emailHire(onboarding, kind, origin);
  else {
    // On trial: their sign-in, with a fresh passcode only on request.
    const course = await ensureIntroCourse(onboarding.companyId, actor.id);
    mail = await emailHire(onboarding, 'access', origin, {
      passcode: null,
      courseUrl: `${origin}/courses/${course.id}`,
    });
  }
  await logStep(
    onboarding,
    mail.sent
      ? `Sent "${mail.subject}" again`
      : `Could not send again: ${mail.error}`,
    actor.id,
  );
  return { onboarding: await reload(onboarding.id), emailError: mail.error };
}

/** The portal origin for links in emails sent outside a request. */
export const defaultOrigin = () => APP_BASE_URL.replace(/\/$/, '');
