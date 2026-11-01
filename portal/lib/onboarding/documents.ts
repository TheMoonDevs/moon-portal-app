/*
 * The documents a new hire signs, as editable drafts. Each is Markdown with
 * {{placeholders}} that are filled from the terms the hiring lead enters
 * before sending. A company can reword any of them in Onboarding >
 * Documents; these drafts are what it starts with. Client-safe.
 *
 * These are starting drafts, not legal advice: have them checked by whoever
 * handles the company's legal terms before the first real hire.
 */
import { ONBOARDING_DOC_KIND } from '@/models/onboarding';

export const DOC_PLACEHOLDERS: Array<{ key: string; label: string }> = [
  { key: 'companyName', label: 'Company name' },
  { key: 'hireName', label: 'Their full legal name' },
  { key: 'hireEmail', label: 'Their email' },
  { key: 'hireAddress', label: 'Their address' },
  { key: 'role', label: 'Their role' },
  { key: 'hireType', label: 'Intern or Full-time' },
  { key: 'trialLength', label: 'Trial length, e.g. 2 weeks' },
  { key: 'trialDays', label: 'Trial length in days' },
  { key: 'trialStart', label: 'First trial day' },
  { key: 'trialEnd', label: 'Last trial day' },
  { key: 'monthlyPay', label: 'Monthly pay' },
  { key: 'trialPayFull', label: 'Trial pay, if confirmed' },
  { key: 'trialPayHalf', label: 'Trial pay, if ended (half)' },
  { key: 'projectName', label: 'First project' },
  { key: 'location', label: 'Where they work' },
  { key: 'contactName', label: 'Hiring manager (or owner)' },
  { key: 'contactRole', label: 'Their contact’s role' },
  { key: 'contactEmail', label: 'Their contact’s email' },
  { key: 'contactPhone', label: 'Their contact’s phone' },
  { key: 'today', label: 'Date sent' },
  { key: 'offerRole', label: 'Role in the offer' },
  { key: 'offerType', label: 'Intern or Full-time, in the offer' },
  { key: 'offerPay', label: 'Monthly pay in the offer' },
  { key: 'joiningDate', label: 'Joining date in the offer' },
  { key: 'noticeDays', label: 'Notice period in days' },
  { key: 'offerNote', label: 'Extra note in the offer' },
];

export type DocVariables = Record<string, string>;

/** Fills {{placeholders}}; ones without a value are left blank. */
export const fillDocument = (body: string, vars: DocVariables) =>
  body
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? '')
    // Tidy what blank values leave behind: "()", "a ." and "a  b".
    .replace(/ ?\(\s*\)/g, '')
    .replace(/(\S) +([.,;:])(?=\s|$)/gm, '$1$2')
    .replace(/(\S) {2,}(?=\S)/g, '$1 ');

/** Placeholders in a text that the portal doesn't know. */
export const unknownDocPlaceholders = (body: string) => {
  const known = new Set(DOC_PLACEHOLDERS.map((p) => p.key));
  return Array.from(
    new Set(
      Array.from(body.matchAll(/\{\{\s*(\w+)\s*\}\}/g))
        .map((m) => m[1])
        .filter((key) => !known.has(key)),
    ),
  );
};

const TRIAL_POLICY = `# Trial Policy

**{{companyName}}** · {{role}} ({{hireType}})
Prepared for {{hireName}} on {{today}}

## 1. Why there is a trial

Everyone who joins {{companyName}} starts with a short, paid trial, and no one is exempt. It lets both sides check that the skills, output and availability you described during hiring match the work you deliver. If what you promised is what you deliver, there is nothing more to it.

## 2. Your trial

- **Length:** {{trialLength}}, from {{trialStart}} to {{trialEnd}}. If your Portal access opens after {{trialStart}}, the trial starts that day instead and runs for the same number of days.
- **Role:** {{role}}, starting on {{projectName}}.
- **Where:** {{location}}.
- **Your contact:** {{contactName}} ({{contactRole}}), {{contactEmail}} {{contactPhone}}. Ask them anything about this policy or your work.

## 3. What is expected of you

- Write your worklog in the Portal every working day.
- Deliver the work you are given, at the level you described in your application and interviews.
- Be reachable in your agreed working hours, and say early when something blocks you.
- Keep everything you see confidential, as the Non-Disclosure Agreement sets out.

## 4. Pay for the trial

Your trial is paid at your monthly pay of **{{monthlyPay}}**. Two weeks are paid as half a month, and one week as a quarter of a month.

- **If the trial is confirmed**, you are paid **{{trialPayFull}}** for your {{trialLength}}.
- **If the trial ends** because the work you deliver does not match what you told us during hiring, you are paid half of that: **{{trialPayHalf}}**.

For example, at ₹20,000 a month, a 2-week trial pays ₹10,000, or ₹5,000 if it ends. A 1-week trial pays ₹5,000, or ₹2,500 if it ends.

**Why half?** This is our insurance against candidates who misrepresent what they can do. It is nothing to worry about: as long as you are honest about your skills and work ethically, your trial is paid in full.

The trial payment is made after the trial ends, through the company's usual way of paying.

## 5. How the trial ends

By the last trial day, your hiring manager, your buddy or a company owner confirms the trial or ends it. The company may confirm a trial early.

- **Confirmed:** you receive your official offer letter and the agreements for your role. They are explained in your introductory call and course.
- **Ended:** your access to the Portal and to company tools closes the same day, and the trial payment above is made.

## 6. Tools during the trial

You work in the Portal from the first trial day. Claude and other AI tools connected to the company's systems are set up only after you are fully hired.

## 7. Agreement

By signing, you confirm that you have read this policy and agree to the trial on these terms.
`;

const NDA = `# Non-Disclosure Agreement

Between **{{companyName}}** ("the Company") and **{{hireName}}** ({{hireEmail}}, {{hireAddress}}), who is joining as {{role}} ("you").
Dated {{today}}.

## 1. What is confidential

Confidential Information is anything you learn through your work with the Company that is not public: code, designs, products and plans, clients and their data, prices, finances, people and hiring, passwords and access, and anything marked or clearly meant to be private. It includes what you see in the Portal and in any tool the Company gives you.

## 2. What you agree to

- Use Confidential Information only to do your work for the Company.
- Not share it with anyone outside the Company, and inside it only with people who need it for their work.
- Not copy it to personal accounts, devices or AI tools that the Company has not approved.
- Keep your access to the Portal and other tools to yourself, and tell {{contactName}} at once if you think something was exposed.

## 3. What is not confidential

Information that is already public through no fault of yours, that you knew before joining and can show it, or that you receive from someone else who was free to share it. If the law or a court requires you to disclose something, tell the Company first where you lawfully can.

## 4. Work you create

Work you create for the Company, including code, designs, writing and ideas made during your trial or later work, belongs to the Company once it is paid for. You will help the Company record that ownership if it asks.

## 5. When you leave

When your work with the Company ends, for any reason, return or delete everything that holds Confidential Information and stop using your access. Your duties under this agreement continue for three years after your work ends, and for as long as any trade secret stays secret.

## 6. Breaking this agreement

If you break this agreement, the Company may end your work straight away and seek any remedy the law allows, including an order to stop the disclosure.

## 7. General

This agreement is governed by the laws of India. It applies from the day you sign, during your trial and for the rest of your work with the Company.

Questions about this agreement: {{contactName}} ({{contactRole}}), {{contactEmail}} {{contactPhone}}.
`;

const OFFER_LETTER = `# Offer Letter

**{{companyName}}**
{{today}}

Dear {{hireName}},

Your trial is complete, and we are glad to offer you the role of **{{offerRole}}** ({{offerType}}) at {{companyName}}.

## Your offer

- **Role:** {{offerRole}}
- **Type:** {{offerType}}
- **Joining date:** {{joiningDate}}
- **Monthly pay:** {{offerPay}}
- **Notice period:** {{noticeDays}} days, on either side
- **Reporting to:** {{contactName}} ({{contactRole}})
- **Where:** {{location}}

{{offerNote}}

## What happens next

1. Sign this letter and the Work Agreement that comes with it.
2. Your Claude access is switched on as soon as both are signed, and the introductory course shows you how to set it up.
3. {{contactName}} will set up an introductory call to walk you through your role, the agreements and how we work.

Your trial payment is settled in full as set out in the Trial Policy.

Welcome to the team.

{{contactName}}
{{contactRole}}, {{companyName}}
{{contactEmail}} {{contactPhone}}
`;

const WORK_AGREEMENT = `# Work Agreement

Between **{{companyName}}** ("the Company") and **{{hireName}}** ({{hireEmail}}), from {{joiningDate}}.

## 1. Your role

You join as **{{offerRole}}** ({{offerType}}), reporting to {{contactName}}. Your work is set through tasks and projects in the Portal, and may change over time as the Company's needs change.

## 2. How you work

- Write your worklog in the Portal every working day.
- Keep your tasks up to date, and say early when something blocks you or a deadline will slip.
- Join the calls you are invited to, and be reachable in your agreed working hours.
- Follow the Company's policies, including the course material in the Portal.

## 3. Pay

Your monthly pay is **{{offerPay}}**, paid monthly through the Company's usual way of paying. Pay is reviewed as your role grows.

## 4. Tools and access

The Company gives you access to the Portal, Claude and other tools for your work. Use them only for Company work, keep your access to yourself, and follow any limits the Company sets on what may be shared with AI tools.

## 5. Confidentiality and ownership

The Non-Disclosure Agreement you signed continues to apply. Everything you create for the Company belongs to the Company.

## 6. Ending the work

Either side can end this agreement with {{noticeDays}} days' notice. The Company may end it at once for serious misconduct or a breach of confidentiality. When it ends, your access closes and you return or delete Company material.

## 7. General

This agreement, the Offer Letter and the Non-Disclosure Agreement are the whole agreement between you and the Company about your work. It is governed by the laws of India.
`;

export const DEFAULT_DOCUMENTS: Record<
  ONBOARDING_DOC_KIND,
  { title: string; body: string }
> = {
  [ONBOARDING_DOC_KIND.TRIAL_POLICY]: {
    title: 'Trial Policy',
    body: TRIAL_POLICY,
  },
  [ONBOARDING_DOC_KIND.NDA]: { title: 'Non-Disclosure Agreement', body: NDA },
  [ONBOARDING_DOC_KIND.OFFER_LETTER]: {
    title: 'Offer Letter',
    body: OFFER_LETTER,
  },
  [ONBOARDING_DOC_KIND.WORK_AGREEMENT]: {
    title: 'Work Agreement',
    body: WORK_AGREEMENT,
  },
};

export const MAX_DOC_TITLE = 120;
export const MAX_DOC_BODY = 40000;
