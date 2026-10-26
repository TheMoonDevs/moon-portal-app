/**
 * Emails to candidates: the starter templates, the {{placeholders}} they can
 * use, and how a template turns into the text and HTML that are sent.
 *
 * Client-safe, so the composer's preview is exactly what the server sends.
 */

import { APPLICATION_STAGE } from '@/models/hiring';

export const MAX_TEMPLATE_NAME = 60;
export const MAX_SUBJECT = 200;
export const MAX_BODY = 20000;
/** Most people one send can reach. */
export const MAX_RECIPIENTS = 500;

export const EMAIL_VARIABLES = [
  { key: 'firstName', label: 'First name' },
  { key: 'name', label: 'Full name' },
  { key: 'role', label: 'Role' },
  { key: 'company', label: 'Company' },
  { key: 'sender', label: 'Your name' },
] as const;

export type EmailVariable = (typeof EMAIL_VARIABLES)[number]['key'];
export type EmailVariables = Record<EmailVariable, string>;

export interface StarterTemplate {
  /** Stored as the email's templateId, prefixed with `starter:`. */
  key: string;
  name: string;
  icon: string;
  subject: string;
  body: string;
  moveTo: APPLICATION_STAGE | null;
}

export const STARTER_PREFIX = 'starter:';

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    key: 'rejection',
    name: 'Rejection',
    icon: 'block',
    moveTo: APPLICATION_STAGE.REJECTED,
    subject: 'Your application for {{role}} at {{company}}',
    body: `Hi {{firstName}},

Thank you for applying for the {{role}} role at {{company}}, and for the time you put into your application.

After careful review, we have decided not to move forward with your application this time. It wasn't an easy decision, and we'd be glad to hear from you again when a role fits.

We wish you all the best.

{{sender}}
{{company}}`,
  },
  {
    key: 'task',
    name: 'Task',
    icon: 'assignment',
    moveTo: APPLICATION_STAGE.TASK,
    subject: 'Next step for {{role}} at {{company}}: a short task',
    body: `Hi {{firstName}},

Thanks for applying for the {{role}} role at {{company}}. We enjoyed reading your application and would like you to take the next step: a short task.

[Describe the task here, or add a link to the brief]

Please reply to this email with your work by [deadline]. If anything is unclear, just ask.

{{sender}}
{{company}}`,
  },
  {
    key: 'interview',
    name: 'Interview',
    icon: 'forum',
    moveTo: APPLICATION_STAGE.INTERVIEW,
    subject: "Let's talk about {{role}} at {{company}}",
    body: `Hi {{firstName}},

Thanks for your interest in the {{role}} role at {{company}}. We'd like to invite you to an interview.

[Add a scheduling link, or a few times that work for you]

The conversation takes about [30 minutes]. Reply to this email if none of the times work.

Looking forward to it,
{{sender}}
{{company}}`,
  },
  {
    key: 'offer',
    name: 'Offer',
    icon: 'handshake',
    moveTo: APPLICATION_STAGE.OFFER,
    subject: 'Your offer for {{role}} at {{company}}',
    body: `Hi {{firstName}},

We're delighted to offer you the {{role}} role at {{company}}!

[Offer details: start date, compensation, and anything else that matters]

To accept, just reply to this email by [date]. We're happy to answer any questions before then.

Welcome aboard, we hope!
{{sender}}
{{company}}`,
  },
];

export const starterById = (templateId?: string | null) =>
  templateId?.startsWith(STARTER_PREFIX)
    ? (STARTER_TEMPLATES.find(
        (t) => `${STARTER_PREFIX}${t.key}` === templateId,
      ) ?? null)
    : null;

export function emailVariables({
  name,
  role,
  company,
  sender,
}: {
  name: string;
  role: string;
  company: string;
  sender: string;
}): EmailVariables {
  const fullName = name.trim();
  return {
    name: fullName,
    firstName: fullName.split(/\s+/)[0] || fullName,
    role: role.trim(),
    company: company.trim(),
    sender: sender.trim(),
  };
}

const PLACEHOLDER = /\{\{\s*([a-zA-Z]+)\s*\}\}/g;

const isVariable = (key: string): key is EmailVariable =>
  EMAIL_VARIABLES.some((v) => v.key === key);

/** Fills in {{placeholders}}; unknown ones are left as written. */
export const fillTemplate = (text: string, vars: EmailVariables) =>
  text.replace(PLACEHOLDER, (match, key: string) =>
    isVariable(key) ? vars[key] : match,
  );

/** Placeholders that aren't known, so they would be sent as written. */
export const unknownPlaceholders = (...texts: string[]) =>
  Array.from(
    new Set(
      texts.flatMap((text) =>
        Array.from(text.matchAll(PLACEHOLDER))
          .filter(([, key]) => !isVariable(key))
          .map(([match]) => match),
      ),
    ),
  );

/** True when a starter's `[fill this in]` notes are still in the text. */
export const hasBracketNotes = (text: string) => /\[[^\]\n]{3,}\]/.test(text);

/* ---------------------------------- HTML ---------------------------------- */

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const URL_PATTERN = /(https?:\/\/[^\s<>"']*[^\s<>"'.,;:!?)\]])/g;

/** Escapes a line and turns its links into anchors. */
const lineHtml = (line: string) =>
  line
    .split(URL_PATTERN)
    .map((part, i) =>
      i % 2 === 1
        ? `<a href="${escapeHtml(part)}" style="color:#2563eb;text-decoration:underline">${escapeHtml(part)}</a>`
        : escapeHtml(part),
    )
    .join('');

/** A footer line saying why the candidate got the email. */
export const emailFooter = (vars: EmailVariables) =>
  vars.role && vars.company
    ? `You're getting this email because you applied for ${vars.role} at ${vars.company}.`
    : '';

/** Plain text in, a simple and widely supported HTML email out. */
export function emailHtml(text: string, footer: string) {
  const paragraphs = text
    .trim()
    .split(/\n\s*\n/)
    .map(
      (block) =>
        `<p style="margin:0 0 16px">${block.split('\n').map(lineHtml).join('<br>')}</p>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px 12px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"><div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px 28px;color:#18181b;font-size:15px;line-height:1.6">${paragraphs}</div>${
    footer
      ? `<p style="max-width:560px;margin:16px auto 0;text-align:center;color:#a1a1aa;font-size:12px;line-height:1.5">${escapeHtml(footer)}</p>`
      : ''
  }</body></html>`;
}

/** The subject, text and HTML for one candidate. */
export function renderEmail(
  template: { subject: string; body: string },
  vars: EmailVariables,
) {
  const text = fillTemplate(template.body, vars).trim();
  const footer = emailFooter(vars);
  return {
    subject: fillTemplate(template.subject, vars).replace(/\s+/g, ' ').trim(),
    text: footer ? `${text}\n\n--\n${footer}` : text,
    html: emailHtml(text, footer),
  };
}
