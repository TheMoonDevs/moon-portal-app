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
  { key: 'meetingLink', label: 'Meeting link' },
  { key: 'taskLink', label: 'Their task link' },
  { key: 'taskDue', label: 'Their task due date' },
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
    key: 'reminder',
    name: 'Task reminder',
    icon: 'alarm',
    moveTo: null,
    subject: 'Reminder: your task for {{role}} at {{company}}',
    body: `Hi {{firstName}},

A quick reminder about the task for the {{role}} role at {{company}}. It's due by {{taskDue}}.

You'll find the brief and the place to send your work here: {{taskLink}}

If you need a little more time, or anything is unclear, just reply to this email.

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

Pick a time that suits you here: {{meetingLink}}

The conversation takes about 30 minutes. Reply to this email if none of the times work.

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
  {
    key: 'thought-of-you',
    name: 'We thought of you',
    icon: 'auto_awesome',
    moveTo: null,
    subject: 'A new role at {{company}}: {{role}}',
    body: `Hi {{firstName}},

You applied to {{company}} a while ago, and we kept your details on file because we liked what we saw. We've just opened a {{role}} role and thought of you.

We've added you to it already, so there's no form to fill in again. If it sounds interesting, just reply to this email and we'll tell you about the next step. If the timing isn't right, no problem at all.

{{sender}}
{{company}}`,
  },
  // The applicant panel's Quick actions use these five.
  {
    key: 'reject-not-fit',
    name: 'Reject: not a fit',
    icon: 'person_off',
    moveTo: APPLICATION_STAGE.REJECTED,
    subject: 'Your application for {{role}} at {{company}}',
    body: `Hi {{firstName}},

Thank you for applying for the {{role}} role at {{company}} and for taking the time to share your work with us.

We've looked through your application carefully, and we've decided not to move forward this time. This role needs a particular mix of skills and experience, and we didn't see a close enough fit for what we need right now.

We'll keep your details on file and will reach out if a role comes up that suits you better.

Thanks again, and we wish you all the best.

{{sender}}
{{company}}`,
  },
  {
    key: 'reject-no-task',
    name: 'Reject: task not sent',
    icon: 'assignment_late',
    moveTo: APPLICATION_STAGE.REJECTED,
    subject: 'Your application for {{role}} at {{company}}',
    body: `Hi {{firstName}},

Thank you for your interest in the {{role}} role at {{company}}.

We sent you a short task as the next step, and it was due on {{taskDue}}. Since we haven't received it, we're closing your application for this role. We're looking for people who are keen to take the next step with us, and the task is how we get to see your work.

If something got in the way, or the timing just wasn't right, you're welcome to apply again for a future opening.

We wish you all the best.

{{sender}}
{{company}}`,
  },
  {
    key: 'reject-after-interview',
    name: 'Reject: after interview',
    icon: 'forum',
    moveTo: APPLICATION_STAGE.REJECTED,
    subject: 'Following up on your interview for {{role}}',
    body: `Hi {{firstName}},

Thank you for speaking with us about the {{role}} role at {{company}}. We really enjoyed the conversation and learning about your work.

After a lot of thought, we've decided to move forward with another candidate whose experience is a closer match for what this role needs right now. It was a close decision, and it says nothing about the effort and care you put in.

We'd love to stay in touch. We'll keep your details on file and think of you first when a role opens up that fits.

Thank you again for your time, and all the best.

{{sender}}
{{company}}`,
  },
  {
    key: 'send-task',
    name: 'Send task',
    icon: 'assignment',
    moveTo: APPLICATION_STAGE.TASK,
    subject: '{{firstName}}, I saw your work',
    body: `Hi {{firstName}},

I'm {{sender}} from {{company}}, and I'm personally hiring for our {{role}} role.

I went through your application and had a look at your work.

I'm interested. If you are too, the next step is a short creative challenge. It's the only one we'll ask for, and it's built to show us how you think, not how much you can grind out.

Everything is here, along with what working with us actually looks like: {{taskLink}}

This link is only for you. We ask everyone we're serious about to do this, because it quickly separates people who want this role from people who are applying everywhere. If it's not for you, no hard feelings.

If it is, I can't wait to see what you make.

{{sender}}
{{company}}`,
  },
  {
    key: 'deadline-extended',
    name: 'Deadline extended',
    icon: 'more_time',
    moveTo: null,
    subject: 'More time for your {{role}} task at {{company}}',
    body: `Hi {{firstName}},

Good news: we've given you 3 more days for your task for the {{role}} role. It's now due by {{taskDue}}.

Your brief, and the place to send your work, are still here:
{{taskLink}}

If you've already started, great. If anything is holding you up, just reply and let us know.

{{sender}}
{{company}}`,
  },
];

/** The applicant panel's Quick actions, by the starter each one sends. */
export const QUICK_ACTION_TEMPLATES = {
  rejectNotFit: 'starter:reject-not-fit',
  rejectNoTask: 'starter:reject-no-task',
  rejectAfterInterview: 'starter:reject-after-interview',
  sendTask: 'starter:send-task',
  deadlineExtended: 'starter:deadline-extended',
} as const;

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
  email,
  meetingLink,
  taskLink,
  taskDue,
}: {
  name: string;
  role: string;
  company: string;
  sender: string;
  /** The candidate's email, filled in on the booking page for them. */
  email?: string | null;
  /** The sender's booking link (/meet/<code>), see lib/meet. */
  meetingLink?: string | null;
  /** The candidate's private task page (/task/<token>), see lib/hiring/tasks. */
  taskLink?: string | null;
  /** When their task is due, already written out (see formatTaskDue). */
  taskDue?: string | null;
}): EmailVariables {
  const fullName = name.trim();
  return {
    name: fullName,
    firstName: fullName.split(/\s+/)[0] || fullName,
    role: role.trim(),
    company: company.trim(),
    sender: sender.trim(),
    meetingLink: meetingLink
      ? `${meetingLink}?${new URLSearchParams({
          name: fullName,
          ...(email ? { email } : {}),
        }).toString()}`
      : '',
    taskLink: taskLink ?? '',
    taskDue: taskDue ?? '',
  };
}

/**
 * A due date as candidates read it, e.g. "Tuesday, 4 November 2026". Written
 * in UTC, the same day the hiring tab shows and an extension is set to.
 */
export const formatTaskDue = (due: Date) =>
  due.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** Whether a template uses a booking link. */
export const usesMeetingLink = (...texts: string[]) =>
  texts.some((text) => /\{\{\s*meetingLink\s*\}\}/.test(text));

/** Whether a template says when each candidate's task is due. */
export const usesTaskDue = (...texts: string[]) =>
  texts.some((text) => /\{\{\s*taskDue\s*\}\}/.test(text));

/** Whether a template gives each candidate their task link. */
export const usesTaskLink = (...texts: string[]) =>
  texts.some((text) => /\{\{\s*taskLink\s*\}\}/.test(text));

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

export const escapeHtml = (value: string) =>
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
