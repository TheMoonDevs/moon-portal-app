/*
 * Agreement templates and their {{placeholders}}. Client-safe.
 *
 * A template is Markdown. Some placeholders fill themselves when it is sent
 * (the company's name, today's date, each signer's name and email); any
 * other {{word}} becomes a blank the sender fills in on the send form.
 *
 * The starter templates are drafts written for the portal, not legal advice:
 * have them checked by whoever handles the company's legal terms first.
 */
import { AGREEMENT_CATEGORY, type AgreementField } from '@/models/agreements';

export const MAX_AGREEMENT_TITLE = 160;
export const MAX_AGREEMENT_BODY = 60000;
export const MAX_AGREEMENT_MESSAGE = 2000;
export const MAX_SIGNERS = 10;

export const CATEGORY_LABEL: Record<AGREEMENT_CATEGORY, string> = {
  [AGREEMENT_CATEGORY.NDA]: 'NDA',
  [AGREEMENT_CATEGORY.EMPLOYMENT]: 'Employment',
  [AGREEMENT_CATEGORY.CONTRACTOR]: 'Contractor',
  [AGREEMENT_CATEGORY.CLIENT]: 'Client',
  [AGREEMENT_CATEGORY.VENDOR]: 'Vendor',
  [AGREEMENT_CATEGORY.POLICY]: 'Policy',
  [AGREEMENT_CATEGORY.LETTER]: 'Letter',
  [AGREEMENT_CATEGORY.OTHER]: 'Other',
};

export const AGREEMENT_CATEGORIES = Object.values(AGREEMENT_CATEGORY);

export const isCategory = (v: unknown): v is AGREEMENT_CATEGORY =>
  AGREEMENT_CATEGORIES.includes(v as AGREEMENT_CATEGORY);

/** Placeholders the portal fills in by itself when the agreement is sent. */
export const AUTO_PLACEHOLDERS: Array<{ key: string; label: string }> = [
  { key: 'companyName', label: 'Company name' },
  { key: 'today', label: 'Date sent' },
  ...[1, 2, 3].flatMap((n) => [
    { key: `signer${n}Name`, label: `Signer ${n}: full name` },
    { key: `signer${n}Email`, label: `Signer ${n}: email` },
    { key: `signer${n}Role`, label: `Signer ${n}: signs as` },
  ]),
];

/**
 * What the Portal knows about a signer, filled from their account and
 * onboarding (lib/agreements/autofill): `{{signer1Title}}`, … They are blanks
 * like any other, filled in for the sender, who can change them.
 */
export const PERSON_KEYS = [
  'LegalName',
  'Title',
  'Address',
  'Phone',
  'DateOfBirth',
  'EmergencyContact',
  'JoiningDate',
  'Pay',
] as const;

export type PersonKey = (typeof PERSON_KEYS)[number];

const PERSON_LABEL: Record<PersonKey, string> = {
  LegalName: 'legal name',
  Title: 'job title',
  Address: 'address',
  Phone: 'phone',
  DateOfBirth: 'date of birth',
  EmergencyContact: 'emergency contact',
  JoiningDate: 'joining date',
  Pay: 'pay',
};

export const PERSON_PLACEHOLDERS = PERSON_KEYS.map((k) => ({
  key: `signer1${k}`,
  label: `Signer 1: ${PERSON_LABEL[k]}`,
}));

const PERSON_KEY = new RegExp(`^signer(\\d+)(${PERSON_KEYS.join('|')})$`);

/** Whether a blank is filled from what the Portal knows about a signer. */
export const isPersonKey = (key: string) => PERSON_KEY.test(key);

const AUTO_KEYS = new Set(AUTO_PLACEHOLDERS.map((p) => p.key));
const SIGNER_KEY = /^signer\d+(Name|Email|Role)$/;
const isAutoKey = (key: string) => AUTO_KEYS.has(key) || SIGNER_KEY.test(key);

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

/** The blanks a sender fills in: placeholders the portal can't fill itself. */
export const templateFields = (...texts: string[]) =>
  Array.from(
    new Set(
      texts.flatMap((t) =>
        Array.from((t ?? '').matchAll(PLACEHOLDER)).map((m) => m[1]),
      ),
    ),
  ).filter((key) => !isAutoKey(key));

/** "effectiveDate" → "Effective date"; "signer1Address" → "Signer 1: address". */
export const fieldLabel = (key: string) => {
  const person = PERSON_KEY.exec(key);
  if (person)
    return `Signer ${person[1]}: ${PERSON_LABEL[person[2] as PersonKey]}`;
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase()
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Fills {{placeholders}}; ones without a value are left blank. */
export const fillAgreement = (body: string, vars: Record<string, string>) =>
  (body ?? '')
    .replace(PLACEHOLDER, (_, key: string) => vars[key] ?? '')
    .replace(/\n{3,}/g, '\n\n');

/** The placeholders every signer fills, from the signer list. */
export const signerVariables = (
  signers: Array<{ name: string; email: string; role?: string | null }>,
) =>
  Object.fromEntries(
    signers.flatMap((s, i) => [
      [`signer${i + 1}Name`, s.name],
      [`signer${i + 1}Email`, s.email],
      [`signer${i + 1}Role`, s.role ?? ''],
    ]),
  ) as Record<string, string>;

export interface StarterTemplate {
  key: string;
  name: string;
  category: AGREEMENT_CATEGORY;
  title: string;
  body: string;
  signerRoles: string[];
  fields?: AgreementField[];
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    key: 'mutual-nda',
    name: 'Mutual NDA',
    category: AGREEMENT_CATEGORY.NDA,
    title: 'Mutual Non-Disclosure Agreement',
    signerRoles: ['Other party'],
    body: `# Mutual Non-Disclosure Agreement

This agreement is made on {{today}} between **{{companyName}}** and **{{signer1Name}}** ({{signer1Email}}), each a "party".

## 1. Purpose
The parties want to talk about {{purpose}} (the "Purpose") and may share confidential information to do so.

## 2. Confidential information
Confidential information is anything one party shares with the other that is marked confidential, or that a reasonable person would understand to be confidential: business plans, client details, product designs, source code, prices and know-how.

It does not include information that is public through no fault of the receiving party, that the receiving party already had or develops on its own, or that it lawfully receives from someone else.

## 3. What each party agrees to
- Use the other party's confidential information only for the Purpose.
- Share it only with people who need it for the Purpose and are bound to keep it confidential.
- Protect it with at least the care it uses for its own confidential information.
- Return or delete it when asked, or when the talks end.

## 4. Required disclosure
A party may disclose confidential information when the law requires it, after telling the other party where it is allowed to.

## 5. Term
This agreement lasts {{termYears}} years from the date above. The duty to keep information confidential continues for that long after the last disclosure.

## 6. No other rights
Sharing information gives no license or ownership to the other party. Neither party has to go ahead with any deal.

## 7. Governing law
This agreement is governed by the laws of {{governingLaw}}.

Signed electronically by the parties below.`,
  },
  {
    key: 'contractor',
    name: 'Contractor agreement',
    category: AGREEMENT_CATEGORY.CONTRACTOR,
    title: 'Independent Contractor Agreement',
    signerRoles: ['Contractor'],
    body: `# Independent Contractor Agreement

This agreement is made on {{today}} between **{{companyName}}** (the "Company") and **{{signer1Name}}** ({{signer1Email}}), of {{signer1Address}} (the "Contractor").

## 1. Services
The Contractor will provide the following services: {{services}}.

## 2. Term
The work starts on {{startDate}} and continues until {{endDate}}, unless either party ends it earlier under section 7.

## 3. Payment
The Company will pay the Contractor {{fee}}. The Contractor sends an invoice {{invoiceSchedule}}, and the Company pays within {{paymentDays}} days of receiving it.

## 4. Independent contractor
The Contractor is not an employee. The Contractor decides how to do the work, provides their own equipment, and is responsible for their own taxes.

## 5. Ownership of work
Everything the Contractor makes for the Company under this agreement belongs to the Company once it is paid for. The Contractor keeps their own tools, know-how and earlier work.

## 6. Confidentiality
The Contractor keeps the Company's and its clients' information confidential, during the work and after it ends.

## 7. Ending the agreement
Either party can end this agreement with {{noticeDays}} days' written notice. The Company pays for work done up to the end date.

## 8. Governing law
This agreement is governed by the laws of {{governingLaw}}.

Signed electronically by the parties below.`,
  },
  {
    key: 'client-services',
    name: 'Client services agreement',
    category: AGREEMENT_CATEGORY.CLIENT,
    title: 'Services Agreement with {{clientName}}',
    signerRoles: ['Client'],
    body: `# Services Agreement

This agreement is made on {{today}} between **{{companyName}}** (the "Provider") and **{{clientName}}** (the "Client"), signed for the Client by {{signer1Name}}.

## 1. Scope of work
The Provider will deliver: {{scope}}.

## 2. Timeline
Work starts on {{startDate}}. The expected delivery date is {{deliveryDate}}.

## 3. Fees and payment
The Client will pay {{fee}}, as follows: {{paymentTerms}}. Late payments may pause the work until they are settled.

## 4. Changes
Changes to the scope are agreed in writing (email is enough) and may change the fee and timeline.

## 5. Ownership
Once paid in full, the Client owns the final deliverables. The Provider keeps its own tools, code libraries and know-how, and may show the work in its portfolio unless the Client says otherwise.

## 6. Confidentiality
Each party keeps the other's confidential information private and uses it only for this work.

## 7. Liability
Neither party is liable for indirect losses. Each party's total liability is limited to the fees paid under this agreement.

## 8. Ending the agreement
Either party can end this agreement with {{noticeDays}} days' written notice. The Client pays for work done up to the end date.

## 9. Governing law
This agreement is governed by the laws of {{governingLaw}}.

Signed electronically by the parties below.`,
  },
  {
    key: 'policy-acknowledgement',
    name: 'Policy acknowledgement',
    category: AGREEMENT_CATEGORY.POLICY,
    title: '{{policyName}}: acknowledgement',
    signerRoles: ['Team member'],
    body: `# {{policyName}}

**{{companyName}}** · {{today}}

{{policyText}}

## Acknowledgement
By signing below, I, {{signer1Name}}, confirm that I have read and understood the {{policyName}} and agree to follow it.`,
  },
  {
    key: 'personal-details',
    name: 'Personal and bank details',
    category: AGREEMENT_CATEGORY.EMPLOYMENT,
    title: 'Personal and bank details: {{signer1Name}}',
    signerRoles: ['Team member'],
    body: `# Personal and bank details

**{{companyName}}** · {{today}}

{{companyName}} needs these details to pay {{signer1Name}} ({{signer1Title}}) and to reach someone in an emergency. They are kept confidential: only HR and the company's owners see them.

Fill them in below, then sign to confirm they are correct. Tell HR straight away if any of them change.

## Confirmation
I, {{signer1Name}}, confirm that the details I filled in are true and complete, and that {{companyName}} may use them to pay me and to contact the person I named in an emergency.`,
    fields: [
      {
        id: 'address',
        label: 'Home address',
        kind: 'longtext',
        required: true,
        signer: 1,
      },
      {
        id: 'pan',
        label: 'PAN',
        kind: 'text',
        required: true,
        signer: 1,
        hint: 'As on your PAN card, e.g. ABCDE1234F',
      },
      {
        id: 'bankAccount',
        label: 'Bank account number',
        kind: 'text',
        required: true,
        signer: 1,
      },
      {
        id: 'ifsc',
        label: 'IFSC code',
        kind: 'text',
        required: true,
        signer: 1,
      },
      {
        id: 'emergencyContact',
        label: 'Emergency contact (name and phone)',
        kind: 'text',
        required: true,
        signer: 1,
      },
    ],
  },
  {
    key: 'blank',
    name: 'Blank agreement',
    category: AGREEMENT_CATEGORY.OTHER,
    title: 'Agreement',
    signerRoles: [],
    body: `# Agreement

This agreement is made on {{today}} between **{{companyName}}** and **{{signer1Name}}**.

Write the terms here.

Signed electronically by the parties below.`,
  },
];
