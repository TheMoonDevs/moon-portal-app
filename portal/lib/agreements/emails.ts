import { isResendConfigured, sendEmail } from '@/lib/email/resend';
import { hiringFrom } from '@/lib/hiring/email';
import { emailHtml } from '@/lib/hiring/emailTemplates';
import { formatDay } from '@/lib/onboarding/meta';

/*
 * The emails an agreement sends: the signing link, a reminder, the signed
 * copy, and word to the sender when someone declines. They go out from the
 * company's sender, and replies reach whoever sent the agreement.
 */

export type AgreementEmailKind =
  | 'request'
  | 'reminder'
  | 'completed'
  | 'declined'
  | 'voided';

export interface AgreementEmailContext {
  kind: AgreementEmailKind;
  to: string;
  firstName: string;
  companyName: string;
  title: string;
  /** The recipient's own /sign link. */
  signUrl: string;
  sender: { name: string; email: string | null };
  message?: string | null;
  expiresOn?: string | null;
  /** For `declined`: who declined, and why. */
  declinedBy?: string | null;
  reason?: string | null;
  /** For `completed`: everyone who signed. */
  signedBy?: string[];
}

export function agreementEmail(ctx: AgreementEmailContext): {
  subject: string;
  text: string;
} {
  const hi = `Hi ${ctx.firstName},`;
  const sign = `${ctx.sender.name}\n${ctx.companyName}`;
  const note = ctx.message?.trim() ? `\n${ctx.message.trim()}\n` : '';
  const deadline = ctx.expiresOn
    ? `\nPlease sign by ${formatDay(ctx.expiresOn)}.\n`
    : '';

  switch (ctx.kind) {
    case 'request':
      return {
        subject: `Please sign: ${ctx.title}`,
        text: `${hi}

${ctx.sender.name} at ${ctx.companyName} sent you "${ctx.title}" to sign.
${note}
Read it and sign here. It takes a couple of minutes and you don't need an account:

${ctx.signUrl}
${deadline}
If anything in it looks wrong, reply to this email before signing.

${sign}`,
      };
    case 'reminder':
      return {
        subject: `Reminder: please sign ${ctx.title}`,
        text: `${hi}

A friendly reminder that "${ctx.title}" from ${ctx.companyName} is still waiting for your signature.

${ctx.signUrl}
${deadline}
${sign}`,
      };
    case 'completed':
      return {
        subject: `Signed: ${ctx.title}`,
        text: `${hi}

"${ctx.title}" is now signed by everyone${ctx.signedBy?.length ? ` (${ctx.signedBy.join(', ')})` : ''}.

Your signed copy, with its audit trail, is here. Keep this email to find it again:

${ctx.signUrl}

${sign}`,
      };
    case 'declined':
      return {
        subject: `Declined: ${ctx.title}`,
        text: `${hi}

${ctx.declinedBy ?? 'A signer'} declined to sign "${ctx.title}".${ctx.reason ? `\n\nTheir reason: ${ctx.reason}` : ''}

Nobody else can sign it now. You can send a corrected one from the portal.

${ctx.signUrl}`,
      };
    case 'voided':
      return {
        subject: `Withdrawn: ${ctx.title}`,
        text: `${hi}

${ctx.companyName} has withdrawn "${ctx.title}", so it no longer needs your signature.${ctx.reason ? `\n\n${ctx.reason}` : ''}

${sign}`,
      };
  }
}

/** Sends one agreement email. Returns an error message, or null when sent. */
export async function sendAgreementEmail(
  ctx: AgreementEmailContext,
  idempotencyKey: string,
): Promise<string | null> {
  if (!isResendConfigured()) return 'Email is not set up on this server.';
  const { subject, text } = agreementEmail(ctx);
  const footer = `Sent by ${ctx.companyName} through the Portal.`;
  const res = await sendEmail(
    {
      from: hiringFrom(ctx.companyName),
      to: ctx.to,
      replyTo: ctx.sender.email,
      subject,
      text: `${text}\n\n--\n${footer}`,
      html: emailHtml(text, footer),
      tags: [
        { name: 'source', value: 'portal-agreements' },
        { name: 'kind', value: `agreement-${ctx.kind}` },
      ],
    },
    idempotencyKey,
  );
  return res.error ?? null;
}
