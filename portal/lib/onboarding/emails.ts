import { isResendConfigured, sendEmail } from '@/lib/email/resend';
import { HIRING_EMAIL_TAGS, hiringFrom } from '@/lib/hiring/email';
import { emailHtml } from '@/lib/hiring/emailTemplates';

import { formatDay, formatMoney } from './meta';

/*
 * The emails a new hire gets on the way in. They go out from the hiring
 * sender with the company's name, and replies reach their contact (the
 * hiring manager, or a company owner).
 */

export type OnboardingEmailKind =
  | 'details'
  | 'agreements'
  | 'access'
  | 'offer'
  | 'hired'
  | 'ended';

export interface OnboardingEmailContext {
  kind: OnboardingEmailKind;
  to: string;
  firstName: string;
  companyName: string;
  role: string;
  joinUrl: string;
  contact: { name: string; email: string | null; phone?: string | null };
  loginUrl?: string;
  courseUrl?: string;
  passcode?: string | null;
  signInEmail?: string | null;
  trialStartsOn?: string | null;
  trialEndsOn?: string | null;
  trialPayDue?: { amount: number; currency: string } | null;
}

const contactLine = (c: OnboardingEmailContext['contact']) =>
  [c.name, c.email, c.phone].filter(Boolean).join(', ');

export function onboardingEmail(ctx: OnboardingEmailContext): {
  subject: string;
  text: string;
} {
  const hi = `Hi ${ctx.firstName},`;
  const help = `If anything is unclear, reach out to ${contactLine(ctx.contact)}.`;
  const sign = `${ctx.contact.name}\n${ctx.companyName}`;

  switch (ctx.kind) {
    case 'details':
      return {
        subject: `Welcome to ${ctx.companyName}: let's set up your Portal account`,
        text: `${hi}

Welcome to ${ctx.companyName}! We're glad you're joining us as ${ctx.role}.

We work in the Portal, so the first step is your account. Fill in your details and add a profile photo here. It takes about five minutes:

${ctx.joinUrl}

Next, you'll get your Trial Policy and Non-Disclosure Agreement to sign on the same page, then your Portal sign-in.

${help}

${sign}`,
      };
    case 'agreements':
      return {
        subject: `Your agreements with ${ctx.companyName} are ready to sign`,
        text: `${hi}

Thanks for your details. Your Trial Policy and Non-Disclosure Agreement are ready. Read them and sign both here:

${ctx.joinUrl}

As soon as both are signed, we'll email your Portal sign-in.

${help}

${sign}`,
      };
    case 'access':
      return {
        subject: `Your Portal sign-in for ${ctx.companyName}`,
        text: `${hi}

Thanks for signing. Your Portal access is open.

Sign in here: ${ctx.loginUrl}
${ctx.passcode ? `Your passcode: ${ctx.passcode}\n` : 'Use the passcode you already have.\n'}Google account to sign in with: ${ctx.signInEmail}

Start with the Portal introductory course. It shows how the Portal works and what we expect every day, like writing your worklog:

${ctx.courseUrl}

Your trial runs from ${formatDay(ctx.trialStartsOn)} to ${formatDay(ctx.trialEndsOn)}. Keep your passcode to yourself.

${help}

${sign}`,
      };
    case 'offer':
      return {
        subject: `Your offer from ${ctx.companyName}`,
        text: `${hi}

Your trial is complete, and we'd love you to stay. Your offer letter and Work Agreement are ready to sign here:

${ctx.joinUrl}

Once both are signed, your Claude access opens and we'll set up your introductory call.

${help}

${sign}`,
      };
    case 'hired':
      return {
        subject: `Welcome to the team at ${ctx.companyName}`,
        text: `${hi}

Everything is signed. You're now a full member of ${ctx.companyName}, and your Claude access is open.

The introductory course shows how to set up Claude with the Portal:

${ctx.courseUrl}

${ctx.contact.name} will be in touch for your introductory call.

${sign}`,
      };
    case 'ended':
      return {
        subject: `Your trial at ${ctx.companyName}`,
        text: `${hi}

Thank you for the work you put in during your trial. We've decided not to continue, and your Portal access has now closed.
${
  ctx.trialPayDue
    ? `\nAs the Trial Policy sets out, you'll be paid ${formatMoney(ctx.trialPayDue.amount, ctx.trialPayDue.currency)} for the trial.\n`
    : ''
}
${help}

${sign}`,
      };
  }
}

/** Sends one onboarding email. Returns an error message, or null when sent. */
export async function sendOnboardingEmail(
  ctx: OnboardingEmailContext,
  idempotencyKey: string,
): Promise<{ subject: string; error: string | null }> {
  const { subject, text } = onboardingEmail(ctx);
  if (!isResendConfigured())
    return { subject, error: 'Email is not set up on this server.' };
  const footer = `You're getting this because you're joining ${ctx.companyName}.`;
  const res = await sendEmail(
    {
      from: hiringFrom(ctx.companyName),
      to: ctx.to,
      replyTo: ctx.contact.email,
      subject,
      text: `${text}\n\n--\n${footer}`,
      html: emailHtml(text, footer),
      tags: [
        ...HIRING_EMAIL_TAGS,
        { name: 'kind', value: `onboarding-${ctx.kind}` },
      ],
    },
    idempotencyKey,
  );
  return { subject, error: res.error ?? null };
}
