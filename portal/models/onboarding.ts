import { type BaseModel, type Loose, type Nullable } from './shared/base';

/*
 * Onboarding: what happens to someone after the hiring team marks them Hired.
 * Their application stays in Hiring (tagged Hired in the talent pool); a
 * separate Onboarding record follows them from the first email to the day
 * they are fully hired, or the day their trial ends.
 *
 *   DETAILS     they fill in the details form; it makes their portal account
 *   AGREEMENTS  they sign the Trial Policy and the NDA
 *   TRIAL       they have portal access (no Claude yet) and are on trial
 *   OFFER       the trial passed; they sign the offer letter and work terms
 *   HIRED       all signed: a full member, with Claude access
 *   ENDED       the trial did not pass, or onboarding was stopped: no access
 */

export enum ONBOARDING_STEP {
  DETAILS = 'DETAILS',
  AGREEMENTS = 'AGREEMENTS',
  TRIAL = 'TRIAL',
  OFFER = 'OFFER',
  HIRED = 'HIRED',
  ENDED = 'ENDED',
}

export enum HIRE_TYPE {
  INTERN = 'INTERN',
  FULL_TIME = 'FULL_TIME',
}

/** The documents a hire signs. Each company can reword them. */
export enum ONBOARDING_DOC_KIND {
  TRIAL_POLICY = 'TRIAL_POLICY',
  NDA = 'NDA',
  OFFER_LETTER = 'OFFER_LETTER',
  WORK_AGREEMENT = 'WORK_AGREEMENT',
}

/** What the hire tells us on their details form. */
export interface HireDetails {
  legalName: string;
  preferredName?: Nullable<string>;
  /** The Google account they will sign in with. */
  signInEmail: string;
  phone: string;
  dateOfBirth?: Nullable<string>;
  address?: Nullable<string>;
  city?: Nullable<string>;
  country?: Nullable<string>;
  timezone: string;
  linkedin?: Nullable<string>;
  portfolio?: Nullable<string>;
  emergencyName?: Nullable<string>;
  emergencyPhone?: Nullable<string>;
  submittedAt: string;
}

/**
 * What the hiring lead fills in before the agreements go out. The documents
 * are written from these, so the hire sees their own numbers and dates.
 */
export interface OnboardingTerms {
  /** The company's name as it should read in the agreements. */
  companyName: string;
  role: string;
  hireType: HIRE_TYPE;
  /** The usual monthly pay; the trial payment is worked out from it. */
  monthlyPay: number;
  currency: string;
  /** The first trial day (YYYY-MM-DD), or the day access opens if later. */
  startDate: string;
  /** The project they join first. */
  projectId?: Nullable<string>;
  location?: Nullable<string>;
  /** Their hiring manager, named in the agreements as their contact. */
  leadId?: Nullable<string>;
  /** Someone who works next to them day to day; can decide the trial too. */
  buddyId?: Nullable<string>;
}

/** What the lead fills in when the trial passes. */
export interface OfferTerms {
  role: string;
  hireType: HIRE_TYPE;
  monthlyPay: number;
  currency: string;
  /** Their first day as a confirmed member (YYYY-MM-DD). */
  joiningDate: string;
  /** Days of notice either side gives to end the work. */
  noticeDays: number;
  /** Anything else for the offer letter. */
  note?: Nullable<string>;
}

/** How someone signed a document. */
export interface DocumentSignature {
  /** The full name they typed. */
  name: string;
  at: string;
  ip?: Nullable<string>;
  userAgent?: Nullable<string>;
  /**
   * Who recorded the signature. `portal` is the built-in click-to-sign; an
   * in-house e-signature service can sit behind the same record later.
   */
  provider: string;
}

/** One document sent to a hire, frozen as it was sent. */
export interface OnboardingDocument {
  id: string;
  kind: ONBOARDING_DOC_KIND;
  title: string;
  /** Markdown, with every placeholder already filled in. */
  body: string;
  /** SHA-256 of the body, so the signed text can be proven unchanged. */
  hash: string;
  sentAt: string;
  viewedAt?: Nullable<string>;
  signature?: Nullable<DocumentSignature>;
  /**
   * The company's countersignature, asked for once the hire has signed: the
   * owner or the hiring lead, by document type (lib/agreements/settings).
   */
  countersign?: Nullable<DocumentCountersign>;
}

export interface DocumentCountersign {
  userId: string;
  name: string;
  /** `owner` or `lead`: which rule picked them. */
  as: 'owner' | 'lead';
  requestedAt: string;
  signature?: Nullable<
    DocumentSignature & {
      method: 'typed' | 'drawn';
      image?: Nullable<string>;
      saved?: Nullable<boolean>;
    }
  >;
}

/** The trial payment, worked out from the monthly pay when terms are set. */
export interface TrialPay {
  days: number;
  currency: string;
  /** Paid when the trial passes. */
  full: number;
  /** Paid when the trial does not pass: half of the full amount. */
  half: number;
}

export interface TrialDecision {
  outcome: 'ACCEPTED' | 'REJECTED';
  at: string;
  byUserId: string;
  note?: Nullable<string>;
  /** Decided before the trial's last day. */
  early: boolean;
  /** What the hire is owed for the trial. */
  trialPayDue: number;
}

export interface OnboardingEvent {
  at: string;
  byUserId?: Nullable<string>;
  /** Plain words, e.g. "Sent the Trial Policy and NDA". */
  text: string;
}

export type Onboarding = Loose<
  BaseModel & {
    companyId: string;
    /** The application they were hired from, when there is one. */
    applicationId?: Nullable<string>;
    openingId?: Nullable<string>;
    name: string;
    /** Where onboarding emails go. Lower-cased. */
    email: string;
    /** Opens /join/<token> without signing in. */
    token: string;
    step: ONBOARDING_STEP;
    /** Their portal account, made when the details form comes back. */
    userId?: Nullable<string>;
    /** Whether onboarding made that account (and may close it again). */
    createdUser?: boolean;
    details?: Nullable<HireDetails>;
    terms?: Nullable<OnboardingTerms>;
    /** Send the agreements as soon as the details form comes back. */
    autoSendAgreements?: boolean;
    documents: OnboardingDocument[];
    trialPay?: Nullable<TrialPay>;
    trialStartsOn?: Nullable<string>;
    trialEndsOn?: Nullable<string>;
    offer?: Nullable<OfferTerms>;
    decision?: Nullable<TrialDecision>;
    /** When the last email to the hire went out, and what it was. */
    lastEmail?: Nullable<{ at: string; subject: string }>;
    history: OnboardingEvent[];
    createdById: string;
    accessAt?: Nullable<string>;
    hiredAt?: Nullable<string>;
    endedAt?: Nullable<string>;
  }
>;

/** A company's own wording for one onboarding document. */
export type OnboardingTemplate = Loose<
  BaseModel & {
    companyId: string;
    kind: ONBOARDING_DOC_KIND;
    title: string;
    body: string;
    updatedById: string;
  }
>;

/* --------------------------------- courses -------------------------------- */

export interface CourseLesson {
  id: string;
  title: string;
  /** Markdown. */
  body: string;
}

/** A short course a company writes for its people. */
export type Course = Loose<
  BaseModel & {
    companyId: string;
    title: string;
    description?: Nullable<string>;
    /**
     * The course new hires get with their portal sign-in. Each company has
     * one, made the first time it is needed.
     */
    isIntro?: boolean;
    lessons: CourseLesson[];
    createdById: string;
    updatedById?: Nullable<string>;
  }
>;

/** Which lessons of a course someone has finished. */
export type CourseProgress = Loose<
  BaseModel & {
    courseId: string;
    companyId: string;
    userId: string;
    doneLessonIds: string[];
    completedAt?: Nullable<string>;
  }
>;
