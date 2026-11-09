/*
 * Document types and the company's signing rules for each. Client-safe.
 *
 * Every signed document has a type: the four onboarding documents, and the
 * kinds of agreement the Agreements tab sends. Each type says who signs for
 * the company (the owner, the hiring lead, or nobody) and whether it is
 * confidential (pay letters: HR and owners only). A company can change both.
 */
import {
  AGREEMENT_CATEGORY,
  type CompanySignerRule,
  type DocumentTypeSettings,
} from '@/models/agreements';
import { ONBOARDING_DOC_KIND } from '@/models/onboarding';

export interface DocTypeDef {
  key: string;
  label: string;
  group: 'onboarding' | 'agreements';
  defaults: DocumentTypeSettings;
  /** Why the default is what it is, shown under the row. */
  hint?: string;
}

export const onboardingTypeKey = (kind: ONBOARDING_DOC_KIND) =>
  `onboarding:${kind}`;

export const DOC_TYPES: DocTypeDef[] = [
  {
    key: onboardingTypeKey(ONBOARDING_DOC_KIND.TRIAL_POLICY),
    label: 'Trial Policy',
    group: 'onboarding',
    defaults: { signer: 'lead', confidential: true },
    hint: 'A minor document, but it states the trial pay.',
  },
  {
    key: onboardingTypeKey(ONBOARDING_DOC_KIND.NDA),
    label: 'Non-Disclosure Agreement',
    group: 'onboarding',
    defaults: { signer: 'owner', confidential: false },
  },
  {
    key: onboardingTypeKey(ONBOARDING_DOC_KIND.OFFER_LETTER),
    label: 'Offer Letter',
    group: 'onboarding',
    defaults: { signer: 'owner', confidential: true },
    hint: 'States their pay.',
  },
  {
    key: onboardingTypeKey(ONBOARDING_DOC_KIND.WORK_AGREEMENT),
    label: 'Work Agreement',
    group: 'onboarding',
    defaults: { signer: 'owner', confidential: true },
    hint: 'States their pay.',
  },
  {
    key: AGREEMENT_CATEGORY.NDA,
    label: 'NDA',
    group: 'agreements',
    defaults: { signer: 'owner', confidential: false },
  },
  {
    key: AGREEMENT_CATEGORY.EMPLOYMENT,
    label: 'Employment and pay letters',
    group: 'agreements',
    defaults: { signer: 'owner', confidential: true },
  },
  {
    key: AGREEMENT_CATEGORY.CONTRACTOR,
    label: 'Contractor',
    group: 'agreements',
    defaults: { signer: 'owner', confidential: true },
    hint: 'States their fees.',
  },
  {
    key: AGREEMENT_CATEGORY.CLIENT,
    label: 'Client',
    group: 'agreements',
    defaults: { signer: 'owner', confidential: false },
  },
  {
    key: AGREEMENT_CATEGORY.VENDOR,
    label: 'Vendor',
    group: 'agreements',
    defaults: { signer: 'owner', confidential: false },
  },
  {
    key: AGREEMENT_CATEGORY.POLICY,
    label: 'Policy acknowledgement',
    group: 'agreements',
    defaults: { signer: 'lead', confidential: false },
    hint: 'A minor document.',
  },
  {
    key: AGREEMENT_CATEGORY.LETTER,
    label: 'Letters and certificates',
    group: 'agreements',
    defaults: { signer: 'owner', confidential: false },
    hint: 'Experience, relieving and address letters. Salary certificates are always confidential.',
  },
  {
    key: AGREEMENT_CATEGORY.OTHER,
    label: 'Other',
    group: 'agreements',
    defaults: { signer: 'owner', confidential: false },
  },
];

export const DOC_TYPE_KEYS = DOC_TYPES.map((t) => t.key);

export const docTypeLabel = (key: string) =>
  DOC_TYPES.find((t) => t.key === key)?.label ?? key;

export const SIGNER_RULES: CompanySignerRule[] = ['owner', 'lead', 'none'];

/** How each rule reads, by group: an agreement has no hiring lead, its sender is. */
export const signerRuleLabel = (
  rule: CompanySignerRule,
  group: DocTypeDef['group'],
) =>
  rule === 'owner'
    ? 'Owner'
    : rule === 'lead'
      ? group === 'onboarding'
        ? 'Hiring lead'
        : 'Whoever sends it'
      : 'Nobody';

export const isSignerRule = (v: unknown): v is CompanySignerRule =>
  SIGNER_RULES.includes(v as CompanySignerRule);

/** The defaults, with a company's own choices on top. */
export function mergeTypes(
  own: Record<string, Partial<DocumentTypeSettings>> | null | undefined,
): Record<string, DocumentTypeSettings> {
  const out: Record<string, DocumentTypeSettings> = {};
  for (const t of DOC_TYPES) {
    const o = own?.[t.key];
    out[t.key] = {
      signer: isSignerRule(o?.signer) ? o!.signer! : t.defaults.signer,
      confidential:
        typeof o?.confidential === 'boolean'
          ? o.confidential
          : t.defaults.confidential,
    };
  }
  return out;
}
