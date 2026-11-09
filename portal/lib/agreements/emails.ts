import { isResendConfigured, sendEmail } from '@/lib/email/resend';
import { hiringFrom } from '@/lib/hiring/email';
import { escapeHtml } from '@/lib/hiring/emailTemplates';
import { formatDay } from '@/lib/onboarding/meta';

import { envelopeId } from './envelope';

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
  | 'ending'
  /** To a signer: the one-time code to open it. */
  | 'code'
  /** To HR: someone asked for a letter. */
  | 'letterRequested'
  /** To the person: their letter is signed (PDF attached). */
  | 'letterReady'
  /** To the person: their letter request was declined. */
  | 'letterDeclined';

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
  /** The agreement's id, shown as its Envelope ID. */
  reference?: string | null;
  /** The company's logo, when it has a public https URL. */
  companyLogo?: string | null;
  /** For `code`: the six digits. */
  code?: string | null;
  /** For letters: who asked, and what it's for. */
  requestedBy?: string | null;
  purpose?: string | null;
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
    case 'code':
      return {
        subject: `Your code to open ${ctx.title}`,
        text: `${hi}

Use this code to open "${ctx.title}" from ${ctx.companyName}:

${ctx.code}

It works for 10 minutes. If you didn't ask for a code, you can ignore this email; nobody can open the document without it.`,
      };
    case 'letterRequested':
      return {
        subject: `Letter requested: ${ctx.title}`,
        text: `${hi}

${ctx.requestedBy ?? 'Someone'} asked for ${ctx.title.replace(/^./, (c) => c.toLowerCase())}${ctx.purpose ? ` (${ctx.purpose})` : ''}.${ctx.message ? `\n\n${ctx.message}` : ''}

Review it, edit the wording if you need to, and approve it in the Portal. It goes to ${ctx.companyName}'s signatory to sign:

${ctx.signUrl}`,
      };
    case 'letterReady':
      return {
        subject: `Your ${ctx.title.replace(/^./, (c) => c.toLowerCase())} is ready`,
        text: `${hi}

${ctx.companyName} has signed your ${ctx.title.replace(/^./, (c) => c.toLowerCase())}. It's attached to this email as a PDF, and it's in your documents in the Portal:

${ctx.signUrl}

${ctx.sender.name}
${ctx.companyName}`,
      };
    case 'letterDeclined':
      return {
        subject: `About your letter request: ${ctx.title}`,
        text: `${hi}

${ctx.sender.name} couldn't issue the ${ctx.title.replace(/^./, (c) => c.toLowerCase())} you asked for.${ctx.reason ? `\n\n${ctx.reason}` : ''}

Reply to this email if you'd like to talk about it.

${ctx.sender.name}
${ctx.companyName}`,
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

/* ------------------------------- the HTML -------------------------------- */

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const quoted = (t: string) => `“${t}”`;

/** The dark band at the top of the email: what happened, and the button. */
function band(ctx: AgreementEmailContext): {
  eyebrow: string;
  headline: string;
  button: string | null;
} {
  const t = quoted(ctx.title);
  const open = ctx.forTeam ? 'Open in the Portal' : 'View document';
  switch (ctx.kind) {
    case 'request':
      return {
        eyebrow: 'Please review and sign',
        headline: `${ctx.sender.name} sent you a document to review and sign.`,
        button: 'Review document',
      };
    case 'countersign':
      return {
        eyebrow: 'Signature needed',
        headline: `${t} needs your signature for ${ctx.companyName}.`,
        button: 'Review and approve',
      };
    case 'reminder':
      return {
        eyebrow: 'Reminder',
        headline: `${t} is still waiting for your signature.`,
        button: 'Review document',
      };
    case 'due':
      return {
        eyebrow: 'Due tomorrow',
        headline: `Please sign ${t} by tomorrow.`,
        button: 'Review document',
      };
    case 'signed':
      return {
        eyebrow: ctx.stillToSign ? 'Your signature is next' : 'Update',
        headline: `${ctx.justSigned ?? 'A signer'} signed ${t}.`,
        button: ctx.stillToSign ? 'Review document' : open,
      };
    case 'completed':
      return {
        eyebrow: 'Completed',
        headline: `Everyone has signed ${t}.`,
        button: ctx.forTeam ? open : 'View completed document',
      };
    case 'declined':
      return {
        eyebrow: 'Declined',
        headline: `${ctx.declinedBy ?? 'A signer'} declined to sign ${t}.`,
        button: open,
      };
    case 'corrected':
      return {
        eyebrow: 'Document updated',
        headline: `${t} was corrected. Please review it again.`,
        button: 'Review document',
      };
    case 'handedOver':
      return {
        eyebrow: 'Reassigned',
        headline: `${ctx.declinedBy ?? 'A signer'} assigned ${t} to ${ctx.handedOverTo ?? 'someone else'}.`,
        button: open,
      };
    case 'ending':
      return {
        eyebrow: `Ends in ${ctx.daysLeft} days`,
        headline: `${t} ends on ${ctx.endsOn ? formatDay(ctx.endsOn) : 'its end date'}.`,
        button: open,
      };
    case 'voided':
      return {
        eyebrow: 'Withdrawn',
        headline: `${ctx.companyName} withdrew ${t}.`,
        button: null,
      };
    case 'code':
      return {
        eyebrow: 'Verification code',
        headline: 'Use this code to open your document.',
        button: null,
      };
    case 'letterRequested':
      return {
        eyebrow: 'Letter requested',
        headline: `${ctx.requestedBy ?? 'Someone'} asked for ${t}.`,
        button: 'Review the request',
      };
    case 'letterReady':
      return {
        eyebrow: 'Signed and ready',
        headline: `Your ${t} is signed and ready.`,
        button: 'Open your documents',
      };
    case 'letterDeclined':
      return {
        eyebrow: 'Letter request',
        headline: `Your request for ${t} wasn't approved.`,
        button: null,
      };
  }
}

const SIGN_BY_KINDS: AgreementEmailKind[] = [
  'request',
  'countersign',
  'reminder',
  'due',
  'corrected',
];

/**
 * The email as people see it: the company at the top, a band saying what
 * happened with one button, the message, the envelope's details, and a
 * note on keeping the link private. The text version says the same.
 */
export function agreementEmailHtml(
  ctx: AgreementEmailContext,
  text: string,
  footer: string,
) {
  const b = band(ctx);
  const esc = escapeHtml;
  const note = ctx.message?.trim() || '';
  const signBy =
    !!ctx.expiresOn &&
    (SIGN_BY_KINDS.includes(ctx.kind) ||
      (ctx.kind === 'signed' && !!ctx.stillToSign));
  const rows: Array<[string, string]> = [['Document', ctx.title]];
  if (!ctx.forTeam)
    rows.push(['From', `${ctx.sender.name}, ${ctx.companyName}`]);
  if (signBy) rows.push(['Sign by', formatDay(ctx.expiresOn!)]);
  if (ctx.kind === 'completed' && ctx.pdf)
    rows.push(['Attached', 'The signed PDF, with its certificate']);
  if (ctx.reference) rows.push(['Envelope ID', envelopeId(ctx.reference)]);
  const logo =
    ctx.companyLogo && /^https:\/\//.test(ctx.companyLogo)
      ? `<img src="${esc(ctx.companyLogo)}" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border-radius:6px;object-fit:cover">`
      : `<div style="width:32px;height:32px;border-radius:6px;background:#0f1f38;color:#ffffff;font:700 14px/32px ${FONT};text-align:center">${esc(ctx.companyName.slice(0, 1).toUpperCase())}</div>`;
  const codeBox = ctx.code
    ? `<div style="margin:24px auto 0;display:inline-block;padding:14px 26px;background:#ffffff;border-radius:6px;font:700 30px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.32em;color:#0f1f38">${esc(ctx.code)}</div><div style="margin-top:12px;font:13px ${FONT};color:#93a4bf">It works for 10 minutes.</div>`
    : '';
  const button = b.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:26px auto 0"><tr><td style="border-radius:6px;background:#1d4ed8"><a href="${esc(ctx.signUrl)}" style="display:inline-block;padding:13px 30px;font:600 15px ${FONT};color:#ffffff;text-decoration:none;border-radius:6px">${esc(b.button)}</a></td></tr></table>`
    : '';
  const noteBox = note
    ? `<div style="margin:0 0 16px;padding:14px 16px;border-left:3px solid #1d4ed8;background:#f8fafc;border-radius:4px"><div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:4px">Message from ${esc(ctx.sender.name)}</div>${note
        .split('\n')
        .map(esc)
        .join('<br>')}</div>`
    : '';
  // The text, with the button standing in for the link: a line that led
  // into the link ends in a full stop, the note gets its own box, and the
  // sign-by date shows once, in the details.
  const NOTE = '\u0000note';
  const blocks: string[] = [];
  for (const para of text.trim().split(/\n\s*\n/)) {
    const kept: string[] = [];
    for (const line of para.split('\n')) {
      const standIn =
        (!!ctx.signUrl && line.trim() === ctx.signUrl) ||
        (!!ctx.code && line.trim() === ctx.code);
      if (!standIn) {
        kept.push(line);
        continue;
      }
      const end = (t: string) => t.replace(/:\s*$/, '.');
      if (kept.length) kept[kept.length - 1] = end(kept[kept.length - 1]);
      else if (blocks.length && blocks[blocks.length - 1] !== NOTE)
        blocks[blocks.length - 1] = end(blocks[blocks.length - 1]);
    }
    const t = kept.join('\n').trim();
    if (!t) continue;
    if (signBy && /^Please sign by /.test(t)) continue;
    blocks.push(t === note ? NOTE : t);
  }
  const paragraphs = blocks
    .map((p) =>
      p === NOTE
        ? noteBox
        : `<p style="margin:0 0 16px">${p.split('\n').map(esc).join('<br>')}</p>`,
    )
    .join('');
  const details = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border-top:1px solid #e2e8f0;font-size:13px">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 12px 0 0;width:120px;color:#64748b;vertical-align:top">${esc(k)}</td><td style="padding:10px 0 0;color:#0f172a;vertical-align:top${k === 'Envelope ID' ? ';font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px' : ''}">${esc(v)}</td></tr>`,
    )
    .join('')}</table>`;
  const privacy = ctx.forTeam
    ? ''
    : `<p style="margin:0 0 12px"><strong style="color:#334155">Do not share this email.</strong> The button opens a link that is yours alone, so please don't forward it.</p>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(ctx.title)}</title></head><body style="margin:0;padding:0;background:#f1f3f6;font-family:${FONT}">
<div style="display:none;max-height:0;overflow:hidden">${esc(b.headline)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f6"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
<tr><td style="padding:0 4px 16px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td>${logo}</td><td style="padding-left:10px;font:600 15px ${FONT};color:#0f172a">${esc(ctx.companyName)}</td></tr></table></td></tr>
<tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#0f1f38;padding:36px 32px 34px;text-align:center;border-radius:8px 8px 0 0">
<div style="font:600 12px ${FONT};letter-spacing:.1em;text-transform:uppercase;color:#93a4bf">${esc(b.eyebrow)}</div>
<div style="margin-top:10px;font:600 20px/1.4 ${FONT};color:#ffffff">${esc(b.headline)}</div>
${button}${codeBox}
</td></tr>
<tr><td style="padding:28px 32px 26px;font:15px/1.6 ${FONT};color:#334155">${paragraphs}${details}</td></tr></table>
</td></tr>
<tr><td style="padding:20px 8px 0;font:12px/1.6 ${FONT};color:#64748b">${privacy}<p style="margin:0 0 12px"><strong style="color:#334155">Questions about this document?</strong> Reply to this email to reach ${esc(ctx.sender.name)}.</p><p style="margin:0">${esc(footer)}</p></td></tr>
</table>
</td></tr></table>
</body></html>`;
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
      html: agreementEmailHtml(ctx, text, footer),
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
