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
}

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
    createdById: string;
    updatedById?: Nullable<string>;
  }
>;

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
    updatedById?: Nullable<string>;
  }
>;
