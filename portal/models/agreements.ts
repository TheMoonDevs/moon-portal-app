import { type BaseModel, type Loose, type Nullable } from './shared/base';

/*
 * Agreements: any document a company sends out to be signed (an NDA, a
 * contractor or client agreement, a policy someone accepts), signed in the
 * portal by one or more people, each from their own link.
 *
 *   SENT       out for signing; at least one signer still has to sign
 *   COMPLETED  everyone signed; the signed copy and its audit trail are final
 *   DECLINED   a signer declined; nobody else can sign
 *   VOIDED     the sender withdrew it
 *   EXPIRED    the signing deadline passed before everyone signed
 *
 * The text is frozen when it is sent and its SHA-256 is kept, so the signed
 * copy can be shown to be the text that went out.
 */

export enum AGREEMENT_STATUS {
  SENT = 'SENT',
  COMPLETED = 'COMPLETED',
  DECLINED = 'DECLINED',
  VOIDED = 'VOIDED',
  EXPIRED = 'EXPIRED',
}

export enum SIGNER_STATUS {
  /** Not their turn yet (signing in order). */
  WAITING = 'WAITING',
  /** Their turn: emailed a link. */
  PENDING = 'PENDING',
  VIEWED = 'VIEWED',
  SIGNED = 'SIGNED',
  DECLINED = 'DECLINED',
}

/** What kind of agreement it is, for filtering and the template picker. */
export enum AGREEMENT_CATEGORY {
  NDA = 'NDA',
  EMPLOYMENT = 'EMPLOYMENT',
  CONTRACTOR = 'CONTRACTOR',
  CLIENT = 'CLIENT',
  VENDOR = 'VENDOR',
  POLICY = 'POLICY',
  OTHER = 'OTHER',
}

/** How a signer signed. */
export interface AgreementSignature {
  /** The full name they typed. It must match the name they were sent to. */
  name: string;
  /** `typed` renders the name as a signature; `drawn` adds their drawing. */
  method: 'typed' | 'drawn';
  /** A PNG data URL of the drawn signature. */
  image?: Nullable<string>;
  at: string;
  ip?: Nullable<string>;
  userAgent?: Nullable<string>;
  /** `portal` is the built-in signing; another provider can sit behind it. */
  provider: string;
  /**
   * Applied from the signer's saved signature with the Approve button, while
   * signed in to the portal, instead of typed or drawn on the spot.
   */
  saved?: Nullable<boolean>;
}

export interface AgreementSigner {
  id: string;
  name: string;
  /** Lower-cased. */
  email: string;
  /** What they sign as, e.g. "Client", "Contractor", "For the company". */
  role?: Nullable<string>;
  /** 1, 2, 3… Used when the agreement is signed in order. */
  order: number;
  /** Opens /sign/<token> without signing in. */
  token: string;
  /** A portal account with the same email, when there is one. */
  userId?: Nullable<string>;
  status: SIGNER_STATUS;
  /** When their link was last emailed. */
  notifiedAt?: Nullable<string>;
  remindedAt?: Nullable<string>;
  viewedAt?: Nullable<string>;
  signature?: Nullable<AgreementSignature>;
  declinedAt?: Nullable<string>;
  declineReason?: Nullable<string>;
  /** Signs for the company (the owner or the hiring lead), not as a party. */
  company?: Nullable<boolean>;
  /** The automatic reminders already sent: `d2`, `d5`, `due`. */
  autoReminders?: Nullable<string[]>;
  /** What they filled in, by field id. A ticked checkbox is `yes`. */
  values?: Nullable<Record<string, string>>;
  /** Someone else had it first and handed it over to them. */
  handedOverFrom?: Nullable<{ name: string; email: string; at: string }>;
}

/** Something a signer fills in before they sign: an address, a PAN, a tick. */
export type AgreementFieldKind = 'text' | 'longtext' | 'date' | 'checkbox';

export interface AgreementField {
  /** Short and unique in the agreement, e.g. `address`. */
  id: string;
  label: string;
  kind: AgreementFieldKind;
  required: boolean;
  /**
   * Who fills it: the signer at this position among the parties (1 is the
   * first person it goes to, the company's signer is never counted).
   */
  signer: number;
  /** A line under the field, e.g. "As on your PAN card". */
  hint?: Nullable<string>;
}

/** A change made to an agreement after it went out, kept for the record. */
export interface AgreementCorrection {
  at: string;
  byUserId: string;
  /** `text` replaced the title or body; `signer` changed a name or email. */
  kind: 'text' | 'signer';
  note?: Nullable<string>;
  /** For `text`: what it said before. */
  previous?: Nullable<{ title: string; body: string; hash: string }>;
  /** For `signer`: who it was before. */
  signer?: Nullable<{ id: string; name: string; email: string }>;
}

/** How an agreement relates to the one it was sent from. */
export type AgreementLinkKind = 'renewal' | 'amendment' | 'resend';

/** One line of the audit trail. */
export interface AgreementEvent {
  at: string;
  /** Plain words, e.g. "Asha Verma signed". */
  text: string;
  /** The portal user who did it, for sender actions. */
  byUserId?: Nullable<string>;
  /** The signer who did it, for signer actions. */
  signerId?: Nullable<string>;
  ip?: Nullable<string>;
  userAgent?: Nullable<string>;
}

export type Agreement = Loose<
  BaseModel & {
    companyId: string;
    title: string;
    category: AGREEMENT_CATEGORY;
    /** Markdown, with every placeholder filled in. Frozen when sent. */
    body: string;
    /** SHA-256 of the body. */
    hash: string;
    /** A note for the signers, shown in the email and on the signing page. */
    message?: Nullable<string>;
    templateId?: Nullable<string>;
    /** Signers sign one after another, by `order`. Otherwise all at once. */
    ordered: boolean;
    signers: AgreementSigner[];
    /** Every signer's token, so a link finds its agreement quickly. */
    signerTokens: string[];
    status: AGREEMENT_STATUS;
    /** The last day it can be signed (YYYY-MM-DD), when there is one. */
    expiresOn?: Nullable<string>;
    /** Email the sender and every signer the signed copy when complete. */
    ccEmails?: string[];
    /**
     * Pay letters and the like: only people with `confidential:read` (HR
     * and owners) see it, besides the people who sign it.
     */
    confidential?: Nullable<boolean>;
    sentAt: string;
    completedAt?: Nullable<string>;
    voidedAt?: Nullable<string>;
    voidReason?: Nullable<string>;
    createdById: string;
    history: AgreementEvent[];
    /** Bumped on every write, so two signers at once can't overwrite each other. */
    revision: number;
    /** What the signers fill in before they sign. */
    fields?: AgreementField[];
    /** The template's version it was sent from. */
    templateVersion?: Nullable<number>;
    /** When the contract or NDA term runs out (YYYY-MM-DD), for alerts. */
    endsOn?: Nullable<string>;
    /** The alerts already sent before it ends: `d30`, `d7`. */
    endAlerts?: Nullable<string[]>;
    /** The agreement this one renews, amends or replaces. */
    previousId?: Nullable<string>;
    linkKind?: Nullable<AgreementLinkKind>;
    /** Sent as part of a policy rollout. */
    rolloutId?: Nullable<string>;
    /** The signers can't use the Portal until they sign it. */
    blocking?: Nullable<boolean>;
    /** Text or signer fixes made after it went out. */
    corrections?: AgreementCorrection[];
  }
>;

/** A company's reusable agreement text. */
export type AgreementTemplate = Loose<
  BaseModel & {
    companyId: string;
    name: string;
    category: AGREEMENT_CATEGORY;
    /** The title the agreement goes out with; may hold placeholders. */
    title: string;
    /** Markdown with {{placeholders}}. */
    body: string;
    /** Signer roles the template expects, e.g. ["Client", "For the company"]. */
    signerRoles?: string[];
    /** What the signers fill in. */
    fields?: AgreementField[];
    /** 1 for the first save, up by one each time the wording changes. */
    version?: number;
    createdById: string;
    updatedById?: Nullable<string>;
  }
>;

/** One saved wording of a template, so every agreement can show what it was sent from. */
export type AgreementTemplateVersion = Loose<
  BaseModel & {
    templateId: string;
    companyId: string;
    version: number;
    name: string;
    title: string;
    body: string;
    fields?: AgreementField[];
    savedById: string;
  }
>;

/**
 * A document signed outside the Portal (on paper, or with another tool),
 * uploaded so the person's file and the vault cover it too.
 */
export type ImportedDocument = Loose<
  BaseModel & {
    companyId: string;
    title: string;
    /** A document type key (`NDA`, `onboarding:OFFER_LETTER`, …). */
    typeKey: string;
    /** The person it belongs to: a portal account, or just a name and email. */
    userId?: Nullable<string>;
    personName: string;
    personEmail?: Nullable<string>;
    /** The day it was signed (YYYY-MM-DD). */
    signedOn: string;
    endsOn?: Nullable<string>;
    endAlerts?: Nullable<string[]>;
    confidential: boolean;
    note?: Nullable<string>;
    /** The PDF in private storage. */
    fileKey: string;
    fileName: string;
    size: number;
    /** SHA-256 of the file, checked when it was registered. */
    hash?: Nullable<string>;
    uploadedById: string;
  }
>;

/** Who a policy rollout goes to. */
export type RolloutAudience =
  | { kind: 'everyone' }
  | { kind: 'project'; projectId: string }
  | { kind: 'role'; roleKey: string };

/**
 * One policy sent to many people at once (a code of conduct, a leave policy
 * update): one acknowledgement each, tracked together. New people who match
 * the audience get it too while it is open.
 */
export type PolicyRollout = Loose<
  BaseModel & {
    companyId: string;
    title: string;
    /** The policy's Markdown, with its {{placeholders}}. */
    body: string;
    /** The blanks filled once for everyone; each person's own are theirs. */
    values?: Record<string, string>;
    message?: Nullable<string>;
    templateId?: Nullable<string>;
    templateVersion?: Nullable<number>;
    audience: RolloutAudience;
    /** Send it to people who join the audience later, while it is open. */
    includeNewPeople: boolean;
    /** They can't use the Portal until they acknowledge it. */
    blocking: boolean;
    /** Days each person has to acknowledge it; none when not set. */
    daysToSign?: Nullable<number>;
    status: 'OPEN' | 'CLOSED';
    sentAt: string;
    closedAt?: Nullable<string>;
    createdById: string;
  }
>;

/**
 * A document everyone in some roles must have signed: an NDA for everyone,
 * the IT policy for interns. It is met by a signed document of its type, or
 * one from its template or rollout.
 */
export interface RequiredDocument {
  id: string;
  label: string;
  /** A document type key; NDAs from onboarding and from Agreements count alike. */
  typeKey?: Nullable<string>;
  /** Or a document sent from this template (any version). */
  templateId?: Nullable<string>;
  /** Or an acknowledgement from this rollout. */
  rolloutId?: Nullable<string>;
  /** Company role keys it applies to; empty means everyone. */
  roles: string[];
  /** They can't use the Portal until they sign it. */
  blocking: boolean;
}

/**
 * Someone's signature, saved once so later documents take one click: the
 * owner signs the first time, then countersigns with an Approve button.
 */
export type SavedSignature = Loose<
  BaseModel & {
    userId: string;
    /** Their full name as they sign it. */
    name: string;
    method: 'typed' | 'drawn';
    /** A PNG data URL, for a drawn signature. */
    image?: Nullable<string>;
    initials?: Nullable<string>;
  }
>;

/** Who signs for the company on one document type. */
export type CompanySignerRule = 'owner' | 'lead' | 'none';

export interface DocumentTypeSettings {
  signer: CompanySignerRule;
  confidential: boolean;
}

/** A company's signing rules, see lib/agreements/settings. */
export type AgreementSettings = Loose<
  BaseModel & {
    companyId: string;
    /** The owner who signs for the company. Defaults to the first owner. */
    signatoryId?: Nullable<string>;
    /** Keyed by document type (`NDA`, `onboarding:OFFER_LETTER`, …). */
    types: Record<string, DocumentTypeSettings>;
    /** Automatic reminders, after 2 and 5 days and the day before the deadline. */
    autoReminders: boolean;
    /** What each role must have signed. */
    required?: RequiredDocument[];
    /** Alert the signatory and the sender 30 and 7 days before a document ends. */
    endAlerts?: boolean;
    updatedById?: Nullable<string>;
  }
>;
