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
  | 'countersign'
  | 'reminder'
  | 'due'
  | 'signed'
  | 'completed'
  | 'declined'
  | 'voided'
  /** The text changed after it went out: read it again, and sign. */
  | 'corrected'
  /** To the team: a signer handed it over to someone else. */
  | 'handedOver'
  /** To the team: it ends soon (30 or 7 days). */
  | 'ending';

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
  /** For `signed`: who just signed, and who it is waiting on now. */
  justSigned?: string | null;
  waitingOn?: string[];
  /** Whether the recipient still has to sign (for `signed`). */
  stillToSign?: boolean;
  /** For `countersign`: the other parties who already signed. */
  partiesSigned?: string[];
  /** Written to the people who sent it, not a signer. */
  forTeam?: boolean;
  /** The signed PDF, for `completed`. */
  pdf?: { filename: string; base64: string } | null;
  /** For `handedOver`: who has it now. */
  handedOverTo?: string | null;
  /** For `ending`: the last day, and how many days are left. */
  endsOn?: string | null;
  daysLeft?: number | null;
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
    case 'countersign':
      return {
        subject: `Countersign: ${ctx.title}`,
        text: `${hi}

"${ctx.title}" needs your signature for ${ctx.companyName}.${ctx.partiesSigned?.length ? ` ${ctx.partiesSigned.join(' and ')} already signed.` : ''}
${note}
Open it here. If you saved your signature in the Portal, it's one click to approve:

${ctx.signUrl}
${deadline}
${sign}`,
      };
    case 'signed':
      return {
        subject: `${ctx.justSigned ?? 'Someone'} signed: ${ctx.title}`,
        text: `${hi}

${ctx.justSigned ?? 'Someone'} signed "${ctx.title}".${
          ctx.stillToSign
            ? ' It is still waiting for your signature:'
            : ctx.waitingOn?.length
              ? ` It is now waiting for ${ctx.waitingOn.join(', ')}.`
              : ''
        }
${ctx.stillToSign ? `\n${ctx.signUrl}\n${deadline}` : ''}
You'll get the signed copy as soon as everyone has signed.

${sign}`,
      };
    case 'due':
      return {
        subject: `Due tomorrow: please sign ${ctx.title}`,
        text: `${hi}

"${ctx.title}" from ${ctx.companyName} must be signed by tomorrow${ctx.expiresOn ? `, ${formatDay(ctx.expiresOn)}` : ''}. After that the link stops working.

${ctx.signUrl}

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

${ctx.pdf ? 'The signed PDF is attached. The copy with its audit trail is also here:' : 'Your signed copy, with its audit trail, is here. Keep this email to find it again:'}

${ctx.signUrl}

${sign}`,
      };
    case 'declined':
      return {
        subject: `Declined: ${ctx.title}`,
        text: `${hi}

${ctx.declinedBy ?? 'A signer'} declined to sign "${ctx.title}".${ctx.reason ? `\n\nTheir reason: ${ctx.reason}` : ''}

${ctx.forTeam ? 'Nobody else can sign it now. You can send a corrected one from the portal.' : `Nobody else can sign it now, and you don't need to do anything. ${ctx.companyName} may send a corrected one.`}

${ctx.signUrl}`,
      };
    case 'corrected':
      return {
        subject: `Updated: please review ${ctx.title}`,
        text: `${hi}

${ctx.sender.name} at ${ctx.companyName} corrected "${ctx.title}" before everyone signed.${ctx.reason ? `\n\nWhat changed: ${ctx.reason}` : ''}

Please read it again and sign. If you signed the earlier version, that signature no longer counts for this one:

${ctx.signUrl}
${deadline}
${sign}`,
      };
    case 'handedOver':
      return {
        subject: `Handed over: ${ctx.title}`,
        text: `${hi}

${ctx.declinedBy ?? 'A signer'} handed "${ctx.title}" over to ${ctx.handedOverTo ?? 'someone else'} to sign instead.${ctx.reason ? `\n\nTheir reason: ${ctx.reason}` : ''}

${ctx.handedOverTo ?? 'They'} got their own link. If that's not right, you can change the signer from the portal:

${ctx.signUrl}`,
      };
    case 'ending':
      return {
        subject: `Ends in ${ctx.daysLeft} days: ${ctx.title}`,
        text: `${hi}

"${ctx.title}" ends on ${ctx.endsOn ? formatDay(ctx.endsOn) : 'its end date'}, ${ctx.daysLeft} days from now.

If it should go on, renew it from the portal: the renewal starts from the same text and signers, and stays linked to this one.

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
      ...(ctx.pdf
        ? {
            attachments: [
              {
                filename: ctx.pdf.filename,
                content: ctx.pdf.base64,
                contentType: 'application/pdf',
                encoding: 'base64' as const,
              },
            ],
          }
        : {}),
    },
    idempotencyKey,
  );
  return res.error ?? null;
}
