import {
  type BaseModel,
  createCrudSchemas,
  type DateValue,
  type Loose,
  type Nullable,
} from './shared/base';

/*
 * Hiring: a company publishes job openings, each with its own application
 * form, and candidates apply through a public page. HR then moves each
 * application through the pipeline.
 *
 * Like the workspace collections, references (companyId, openingId, …) are
 * stored as plain strings.
 */

export enum JOB_OPENING_STATUS {
  /** Being written; the apply page is not reachable yet. */
  DRAFT = 'DRAFT',
  /** Accepting applications. */
  OPEN = 'OPEN',
  /** The apply page says applications are closed. */
  CLOSED = 'CLOSED',
  /** Hidden from the hiring tab; applications are kept. */
  ARCHIVED = 'ARCHIVED',
}

export enum APPLICATION_STAGE {
  APPLIED = 'APPLIED',
  SHORTLISTED = 'SHORTLISTED',
  TASK = 'TASK',
  INTERVIEW = 'INTERVIEW',
  OFFER = 'OFFER',
  HIRED = 'HIRED',
  REJECTED = 'REJECTED',
}

export enum FORM_FIELD_TYPE {
  SHORT_TEXT = 'SHORT_TEXT',
  LONG_TEXT = 'LONG_TEXT',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  URL = 'URL',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  CHECKBOX = 'CHECKBOX',
  FILE = 'FILE',
}

/**
 * One question on an application form. Every form also asks for the
 * candidate's name and email, which are stored on the application itself and
 * are not part of `fields`.
 */
export interface FormField {
  /** Stable key for the answer, unique within the form. */
  id: string;
  label: string;
  type: FORM_FIELD_TYPE;
  required?: boolean;
  placeholder?: Nullable<string>;
  helpText?: Nullable<string>;
  /** Choices for SELECT and MULTI_SELECT. */
  options?: string[];
}

/** A file a candidate uploaded, stored privately. */
export interface ApplicationFile {
  key: string;
  name: string;
  type: string;
  size: number;
}

export type ApplicationAnswer =
  | string
  | number
  | boolean
  | string[]
  | ApplicationFile;

export interface ApplicationEvent {
  type: 'SUBMITTED' | 'STAGE_CHANGED' | 'NOTE' | 'EMAIL';
  at: string;
  byUserId?: Nullable<string>;
  from?: Nullable<APPLICATION_STAGE>;
  to?: Nullable<APPLICATION_STAGE>;
  /** The note, or the subject of an email. */
  text?: Nullable<string>;
  /** EMAIL only: the HiringEmail record and the template it came from. */
  emailId?: Nullable<string>;
  templateId?: Nullable<string>;
}

/**
 * Where an email to a candidate got to. Resend reports the later states
 * through its webhook, when one is set up.
 */
export enum HIRING_EMAIL_STATUS {
  SENT = 'SENT',
  DELAYED = 'DELAYED',
  DELIVERED = 'DELIVERED',
  OPENED = 'OPENED',
  CLICKED = 'CLICKED',
  BOUNCED = 'BOUNCED',
  COMPLAINED = 'COMPLAINED',
  FAILED = 'FAILED',
}

/** The latest email to a candidate, kept on the application for the board. */
export interface ApplicationLastEmail {
  id: string;
  subject: string;
  status: HIRING_EMAIL_STATUS;
  at: string;
  templateId?: Nullable<string>;
}

export type JobOpening = Loose<
  BaseModel & {
    companyId: string;
    title: string;
    /** Public path segment: /apply/<slug>. Unique across every company. */
    slug: string;
    department?: Nullable<string>;
    location?: Nullable<string>;
    employmentType?: Nullable<string>;
    /** A short summary, shown at the top of the apply page. */
    description?: Nullable<string>;
    /** The rest of the job post, shown further down the apply page. */
    details?: Nullable<string>;
    /** The hiring team's own notes. Candidates never see them. */
    notes?: Nullable<string>;
    status: JOB_OPENING_STATUS;
    fields: FormField[];
    createdById: string;
    publishedAt?: Nullable<DateValue>;
    closedAt?: Nullable<DateValue>;
  }
>;

export type JobApplication = Loose<
  BaseModel & {
    companyId: string;
    openingId: string;
    name: string;
    /** Lower-cased, one application per email per opening. */
    email: string;
    answers: Record<string, ApplicationAnswer>;
    stage: APPLICATION_STAGE;
    /** HR's private notes. */
    notes?: Nullable<string>;
    history: ApplicationEvent[];
    submittedAt: DateValue;
    lastEmail?: Nullable<ApplicationLastEmail>;
  }
>;

/** A reusable email a company writes for its candidates. */
export type HiringEmailTemplate = Loose<
  BaseModel & {
    companyId: string;
    name: string;
    subject: string;
    /** Plain text with {{placeholders}}, see lib/hiring/emailTemplates. */
    body: string;
    /** Stage to suggest moving candidates to after sending. */
    moveTo?: Nullable<APPLICATION_STAGE>;
    createdById: string;
    updatedById?: Nullable<string>;
  }
>;

/** One email sent to one candidate. */
export type HiringEmail = Loose<
  BaseModel & {
    companyId: string;
    openingId: string;
    applicationId: string;
    /** Shared by every email sent in one go; also stops a double send. */
    sendId: string;
    to: string;
    from: string;
    replyTo?: Nullable<string>;
    subject: string;
    /** The text as sent, with placeholders filled in. */
    text: string;
    templateId?: Nullable<string>;
    status: HIRING_EMAIL_STATUS;
    /** Resend's id for the email, used to match webhook events. */
    resendId?: Nullable<string>;
    error?: Nullable<string>;
    sentById: string;
    sentAt: DateValue;
    events?: Array<{ type: string; at: string }>;
  }
>;

export const jobOpeningSchemas = createCrudSchemas<JobOpening>();
export const jobApplicationSchemas = createCrudSchemas<JobApplication>();
export const hiringEmailTemplateSchemas =
  createCrudSchemas<HiringEmailTemplate>();
export const hiringEmailSchemas = createCrudSchemas<HiringEmail>();
