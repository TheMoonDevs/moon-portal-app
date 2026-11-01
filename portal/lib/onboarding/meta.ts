/*
 * Onboarding rules and labels shared by the admin screens, the hire's /join
 * page, the API and the Claude tools. Client-safe: no database here.
 */
import {
  HIRE_TYPE,
  ONBOARDING_DOC_KIND,
  ONBOARDING_STEP,
  type TrialPay,
} from '@/models/onboarding';

/** Trial length by hire type. Interns get two weeks, full-time hires one. */
export const TRIAL_DAYS: Record<HIRE_TYPE, number> = {
  [HIRE_TYPE.INTERN]: 14,
  [HIRE_TYPE.FULL_TIME]: 7,
};

export const HIRE_TYPE_LABEL: Record<HIRE_TYPE, string> = {
  [HIRE_TYPE.INTERN]: 'Intern',
  [HIRE_TYPE.FULL_TIME]: 'Full-time',
};

/** The documents each round sends, in signing order. */
export const AGREEMENT_DOCS = [
  ONBOARDING_DOC_KIND.TRIAL_POLICY,
  ONBOARDING_DOC_KIND.NDA,
];
export const OFFER_DOCS = [
  ONBOARDING_DOC_KIND.OFFER_LETTER,
  ONBOARDING_DOC_KIND.WORK_AGREEMENT,
];

export const DOC_LABEL: Record<ONBOARDING_DOC_KIND, string> = {
  [ONBOARDING_DOC_KIND.TRIAL_POLICY]: 'Trial Policy',
  [ONBOARDING_DOC_KIND.NDA]: 'Non-Disclosure Agreement',
  [ONBOARDING_DOC_KIND.OFFER_LETTER]: 'Offer Letter',
  [ONBOARDING_DOC_KIND.WORK_AGREEMENT]: 'Work Agreement',
};

/** The steps a hire moves through, as the stepper shows them. */
export const STEPS: Array<{
  step: ONBOARDING_STEP;
  label: string;
  icon: string;
  /** What the hire does at this step, for the stepper's hint. */
  hint: string;
}> = [
  {
    step: ONBOARDING_STEP.DETAILS,
    label: 'Details',
    icon: 'badge',
    hint: 'Fills in their details and photo',
  },
  {
    step: ONBOARDING_STEP.AGREEMENTS,
    label: 'Agreements',
    icon: 'signature',
    hint: 'Signs the Trial Policy and NDA',
  },
  {
    step: ONBOARDING_STEP.TRIAL,
    label: 'Trial',
    icon: 'hourglass_top',
    hint: 'Works in the portal on trial',
  },
  {
    step: ONBOARDING_STEP.OFFER,
    label: 'Offer',
    icon: 'contract',
    hint: 'Signs the offer letter',
  },
  {
    step: ONBOARDING_STEP.HIRED,
    label: 'Hired',
    icon: 'verified',
    hint: 'Full member, Claude unlocked',
  },
];

export const STEP_LABEL: Record<ONBOARDING_STEP, string> = {
  [ONBOARDING_STEP.DETAILS]: 'Details',
  [ONBOARDING_STEP.AGREEMENTS]: 'Agreements',
  [ONBOARDING_STEP.TRIAL]: 'Trial',
  [ONBOARDING_STEP.OFFER]: 'Offer',
  [ONBOARDING_STEP.HIRED]: 'Hired',
  [ONBOARDING_STEP.ENDED]: 'Ended',
};

export const stepIndex = (step: ONBOARDING_STEP) =>
  STEPS.findIndex((s) => s.step === step);

export const isOnboardingStep = (value: unknown): value is ONBOARDING_STEP =>
  Object.values(ONBOARDING_STEP).includes(value as ONBOARDING_STEP);

export const isHireType = (value: unknown): value is HIRE_TYPE =>
  Object.values(HIRE_TYPE).includes(value as HIRE_TYPE);

/* ---------------------------------- money --------------------------------- */

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

/**
 * The trial payment, counting a month as four weeks: a 2-week trial is half
 * the monthly pay and a 1-week trial a quarter of it (₹20,000 a month gives
 * ₹10,000 and ₹5,000). Half of that is paid when the trial ends.
 */
export function trialPayFor(
  monthlyPay: number,
  hireType: HIRE_TYPE,
  currency: string,
): TrialPay {
  const days = TRIAL_DAYS[hireType];
  const full = Math.round((Math.max(0, monthlyPay) * days) / 7 / 4);
  return { days, currency, full, half: Math.round(full / 2) };
}

/** "2 weeks" or "1 week". */
export const trialLength = (hireType: HIRE_TYPE) => {
  const weeks = Math.round(TRIAL_DAYS[hireType] / 7);
  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
};

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}

/* ---------------------------------- dates --------------------------------- */

const DAY_MS = 86400000;

/** Today as YYYY-MM-DD in India, where the team works. */
export const todayIst = () =>
  new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);

export const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS)
    .toISOString()
    .slice(0, 10);

export const isDay = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** "Mon, 3 Nov 2026" for a YYYY-MM-DD day. */
export const formatDay = (day?: string | null) => {
  if (!day || !isDay(day)) return '';
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

/** The trial's last day, counting the first as day 1. */
export const trialEndFor = (start: string, hireType: HIRE_TYPE) =>
  addDays(start, TRIAL_DAYS[hireType] - 1);

/** Which trial day it is (1-based), clamped to the trial. */
export function trialDay(
  startsOn: string | null | undefined,
  endsOn: string | null | undefined,
  today = todayIst(),
) {
  if (!startsOn || !endsOn) return null;
  const total =
    Math.round((Date.parse(endsOn) - Date.parse(startsOn)) / DAY_MS) + 1;
  const day =
    Math.round((Date.parse(today) - Date.parse(startsOn)) / DAY_MS) + 1;
  return { day: Math.min(Math.max(day, 0), total), total, over: day > total };
}

/* -------------------------------- next move ------------------------------- */

export interface NextMove {
  /** Who moves next: the hire, the hiring team, or nobody. */
  who: 'them' | 'you' | 'done' | 'ended';
  /** A short label for cards, e.g. "Send agreements". */
  short: string;
  /** One plain sentence. */
  text: string;
}

/** What a hire is waiting on, and who moves next. */
export function hireNext(
  o: {
    step: ONBOARDING_STEP;
    documents: Array<{
      kind: ONBOARDING_DOC_KIND;
      title: string;
      signature?: unknown;
    }>;
    terms?: unknown;
    autoSendAgreements?: boolean | null;
    trialStartsOn?: string | null;
    trialEndsOn?: string | null;
  },
  today = todayIst(),
): NextMove {
  const unsigned = (kinds: ONBOARDING_DOC_KIND[]) =>
    o.documents
      .filter((d) => kinds.includes(d.kind) && !d.signature)
      .map((d) => d.title);
  switch (o.step) {
    case ONBOARDING_STEP.DETAILS:
      return o.terms && o.autoSendAgreements
        ? {
            who: 'them',
            short: 'Filling in details',
            text: 'Waiting for their details form. The agreements go out by themselves after.',
          }
        : {
            who: 'them',
            short: 'Filling in details',
            text: 'Waiting for their details form. Fill in the terms now and the agreements go out straight after.',
          };
    case ONBOARDING_STEP.AGREEMENTS: {
      const sent = o.documents.some((d) => AGREEMENT_DOCS.includes(d.kind));
      if (!sent)
        return {
          who: 'you',
          short: 'Send agreements',
          text: 'Their details are in. Fill in the terms and send the Trial Policy and NDA.',
        };
      const left = unsigned(AGREEMENT_DOCS);
      return {
        who: 'them',
        short: `Signing ${AGREEMENT_DOCS.length - left.length} of ${AGREEMENT_DOCS.length}`,
        text: `Waiting for them to sign the ${left.join(' and the ')}.`,
      };
    }
    case ONBOARDING_STEP.TRIAL: {
      const t = trialDay(o.trialStartsOn, o.trialEndsOn, today);
      if (t?.over || (t && t.day >= t.total))
        return {
          who: 'you',
          short: 'Decide the trial',
          text: 'The trial is over. Confirm it to send the offer, or end it.',
        };
      if (t && t.day < 1)
        return {
          who: 'them',
          short: `Starts ${formatDay(o.trialStartsOn)}`,
          text: `Their trial starts on ${formatDay(o.trialStartsOn)}.`,
        };
      return {
        who: 'them',
        short: `Trial day ${t?.day ?? 1} of ${t?.total ?? '?'}`,
        text: `On trial until ${formatDay(o.trialEndsOn)}. You can confirm it early.`,
      };
    }
    case ONBOARDING_STEP.OFFER: {
      const left = unsigned(OFFER_DOCS);
      return {
        who: 'them',
        short: 'Signing the offer',
        text: `Waiting for them to sign the ${left.join(' and the ')}.`,
      };
    }
    case ONBOARDING_STEP.HIRED:
      return {
        who: 'done',
        short: 'Fully hired',
        text: 'Fully hired, with Claude access. Set up their introductory call.',
      };
    case ONBOARDING_STEP.ENDED:
    default:
      return {
        who: 'ended',
        short: 'Ended',
        text: 'Onboarding ended and their access is closed.',
      };
  }
}
