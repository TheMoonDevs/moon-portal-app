import type { DocVariables } from '@/lib/onboarding/documents';
import {
  formatDay,
  formatMoney,
  HIRE_TYPE_LABEL,
  todayIst,
  trialEndFor,
  trialLength,
  trialPayFor,
} from '@/lib/onboarding/meta';
import type { HireView } from '@/lib/onboarding/view';
import {
  HIRE_TYPE,
  type OfferTerms,
  type ONBOARDING_DOC_KIND,
} from '@/models/onboarding';

export type Hire = HireView;

export interface Person {
  id: string;
  name: string;
  email: string | null;
  avatar: string | null;
  title: string | null;
  isOwner: boolean;
}

export interface ReadyApplicant {
  applicationId: string;
  name: string;
  email: string;
  openingId: string;
  openingTitle: string | null;
  location: string | null;
  employmentType: string | null;
  projectId: string | null;
  hiringLeadId: string | null;
}

export interface BoardData {
  hires: Hire[];
  companyName: string;
  people: Person[];
  projects: Array<{ id: string; name: string; isCore?: boolean }>;
  readyToOnboard: ReadyApplicant[];
}

export interface DocTemplate {
  kind: ONBOARDING_DOC_KIND;
  label: string;
  title: string;
  body: string;
  custom: boolean;
  updatedAt: string | null;
}

/** The terms form, as the inputs hold it (numbers as text). */
export interface TermsDraft {
  companyName: string;
  role: string;
  hireType: HIRE_TYPE;
  monthlyPay: string;
  currency: string;
  startDate: string;
  projectId: string;
  location: string;
  leadId: string;
  buddyId: string;
}

export const termsPayload = (t: TermsDraft) => ({
  ...t,
  monthlyPay: Number(t.monthlyPay.replace(/[^\d.]/g, '')) || 0,
  projectId: t.projectId || null,
  leadId: t.leadId || null,
  buddyId: t.buddyId || null,
});

export const guessHireType = (employmentType?: string | null) =>
  /intern/i.test(employmentType ?? '') ? HIRE_TYPE.INTERN : HIRE_TYPE.FULL_TIME;

/** A terms form to start from, using what the opening already says. */
export function startingTerms(
  board: BoardData,
  me: string | null,
  from: {
    terms?: Hire['terms'];
    openingTitle?: string | null;
    location?: string | null;
    employmentType?: string | null;
    projectId?: string | null;
    hiringLeadId?: string | null;
  },
): TermsDraft {
  const t = from.terms;
  const core = board.projects.find((p) => p.isCore);
  const isPerson = (id?: string | null) =>
    !!id && board.people.some((p) => p.id === id);
  return {
    companyName: t?.companyName ?? board.companyName,
    role: t?.role ?? from.openingTitle ?? '',
    hireType: t?.hireType ?? guessHireType(from.employmentType),
    monthlyPay: t?.monthlyPay ? String(t.monthlyPay) : '',
    currency: t?.currency ?? 'INR',
    startDate: t?.startDate ?? todayIst(),
    projectId: t?.projectId ?? from.projectId ?? core?.id ?? '',
    location: t?.location ?? from.location ?? 'Remote',
    leadId:
      t?.leadId ??
      (isPerson(from.hiringLeadId)
        ? from.hiringLeadId!
        : isPerson(me)
          ? me!
          : ''),
    buddyId: t?.buddyId ?? '',
  };
}

/**
 * The placeholder values for a live preview, as close as the browser can
 * get to what the server fills in when it sends.
 */
export function previewVariables(
  board: BoardData,
  hire: { name: string; email: string; details?: Hire['details'] } | null,
  terms: TermsDraft,
  offer?: Partial<OfferTerms> | null,
): DocVariables {
  const pay = Number(terms.monthlyPay) || 0;
  const trial = trialPayFor(pay, terms.hireType, terms.currency);
  const lead =
    board.people.find((p) => p.id === terms.leadId) ??
    board.people.find((p) => p.isOwner);
  const project = board.projects.find((p) => p.id === terms.projectId);
  const d = hire?.details;
  const address = [d?.address, d?.city, d?.country].filter(Boolean).join(', ');
  return {
    companyName: terms.companyName || board.companyName,
    hireName: d?.legalName || hire?.name || 'Their full name',
    hireEmail: hire?.email ?? 'their@email.com',
    hireAddress: address || 'their address',
    role: terms.role || 'their role',
    hireType: HIRE_TYPE_LABEL[terms.hireType],
    trialLength: trialLength(terms.hireType),
    trialDays: String(trial.days),
    trialStart: formatDay(terms.startDate),
    trialEnd: formatDay(
      trialEndFor(terms.startDate || todayIst(), terms.hireType),
    ),
    monthlyPay: formatMoney(pay, terms.currency),
    trialPayFull: formatMoney(trial.full, terms.currency),
    trialPayHalf: formatMoney(trial.half, terms.currency),
    projectName: project?.name ?? 'the projects you are given',
    location: terms.location || 'Remote',
    contactName: lead?.name ?? 'The hiring team',
    contactRole:
      lead?.title || (terms.leadId ? 'Hiring manager' : 'Company owner'),
    contactEmail: lead?.email ?? '',
    contactPhone: '',
    today: formatDay(todayIst()),
    offerRole: offer?.role || terms.role,
    offerType: HIRE_TYPE_LABEL[offer?.hireType ?? terms.hireType],
    offerPay: offer?.monthlyPay
      ? formatMoney(offer.monthlyPay, offer.currency ?? terms.currency)
      : '',
    joiningDate: offer?.joiningDate ? formatDay(offer.joiningDate) : '',
    noticeDays: offer?.noticeDays !== undefined ? String(offer.noticeDays) : '',
    offerNote: offer?.note ?? '',
  };
}

/** Terms as stored on a hire, back into the form's shape. */
export const termsDraftOf = (t: NonNullable<Hire['terms']>): TermsDraft => ({
  companyName: t.companyName,
  role: t.role,
  hireType: t.hireType,
  monthlyPay: String(t.monthlyPay),
  currency: t.currency,
  startDate: t.startDate,
  projectId: t.projectId ?? '',
  location: t.location ?? 'Remote',
  leadId: t.leadId ?? '',
  buddyId: t.buddyId ?? '',
});

export const ago = (value?: string | null) => {
  if (!value) return '';
  const ms = Date.now() - new Date(value).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
};
