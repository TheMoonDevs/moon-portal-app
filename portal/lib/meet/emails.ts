import {
  fromHeader,
  isResendConfigured,
  type OutgoingEmail,
  sendEmail,
  senderAddress,
} from '@/lib/email/resend';
import { emailHtml } from '@/lib/hiring/emailTemplates';
import type { MeetBooking, MeetProfile } from '@/models/meet';

import { buildInvite, googleCalendarLink } from './ics';
import { hostName, manageLink } from './server';
import { formatRange } from './time';

/*
 * Emails about a booking. They go out from meet@<RESEND_DOMAIN> under the
 * host's name; the guest's replies go to the host and the host's to the
 * guest. Confirmations carry a calendar invite.
 */

const MEET_SENDER = 'meet';
const TAGS = [{ name: 'source', value: 'portal-meet' }];

type Host = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
  timezone?: string | null;
};

export interface MeetEmailContext {
  booking: MeetBooking;
  profile: MeetProfile;
  host: Host;
  origin: string;
  /** Hiring role, when the guest is an applicant. */
  role?: string | null;
  /** Cancellations: whether calendars hold it, so they need a cancel. */
  wasConfirmed?: boolean;
}

export type MeetEmailKind =
  | 'requested'
  | 'confirmed'
  | 'proposed'
  | 'declined'
  | 'cancelled-by-host'
  | 'cancelled-by-guest';

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

const meetingTitle = (ctx: MeetEmailContext) => {
  const names = `${hostName(ctx.host)} and ${ctx.booking.guestName}`;
  return ctx.profile.title ? `${ctx.profile.title}: ${names}` : names;
};

const hostTimezone = (ctx: MeetEmailContext) =>
  ctx.profile.timezone || ctx.host.timezone || 'UTC';

const when = (ctx: MeetEmailContext, tz: string, start = ctx.booking.start) =>
  formatRange(
    start,
    new Date(
      new Date(start).getTime() +
        (new Date(ctx.booking.end).getTime() -
          new Date(ctx.booking.start).getTime()),
    ).toISOString(),
    tz,
  );

const shortDate = (iso: string, tz: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    timeZone: tz,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

const lines = (...parts: Array<string | null | false | undefined>) =>
  parts.filter((p): p is string => typeof p === 'string').join('\n\n');

function invite(ctx: MeetEmailContext, method: 'REQUEST' | 'CANCEL') {
  const { booking } = ctx;
  const organizerEmail =
    ctx.host.email || senderAddress(MEET_SENDER) || 'meet@localhost';
  const content = buildInvite({
    uid: `${booking.id}@portal-meet`,
    sequence: booking.sequence,
    method,
    start: booking.start,
    end: booking.end,
    summary: meetingTitle(ctx),
    description: lines(
      booking.meetingUrl && `Join: ${booking.meetingUrl}`,
      booking.guestNote &&
        `Note from ${booking.guestName}: ${booking.guestNote}`,
      `Change or cancel: ${manageLink(ctx.origin, booking.token)}`,
    ),
    location: booking.meetingUrl,
    url: booking.meetingUrl,
    organizer: { name: hostName(ctx.host), email: organizerEmail },
    attendee: { name: booking.guestName, email: booking.guestEmail },
  });
  return {
    filename: method === 'CANCEL' ? 'cancel.ics' : 'invite.ics',
    content,
    contentType: `text/calendar; charset=utf-8; method=${method}`,
  };
}

function message(
  ctx: MeetEmailContext,
  to: 'guest' | 'host',
  subject: string,
  text: string,
  attachment?: ReturnType<typeof invite>,
): OutgoingEmail | null {
  const address = senderAddress(MEET_SENDER);
  const toAddress = to === 'guest' ? ctx.booking.guestEmail : ctx.host.email;
  if (!address || !toAddress) return null;
  const footer =
    to === 'guest'
      ? `You're getting this email because you booked time with ${hostName(ctx.host)}.`
      : 'You’re getting this email because someone booked time through your Portal meeting link.';
  return {
    from: fromHeader(
      address,
      to === 'guest' ? hostName(ctx.host) : 'Portal Meet',
    ),
    to: toAddress,
    replyTo: to === 'guest' ? ctx.host.email : ctx.booking.guestEmail,
    subject,
    text: `${text}\n\n--\n${footer}`,
    html: emailHtml(text, footer),
    tags: TAGS,
    ...(attachment ? { attachments: [attachment] } : {}),
  };
}

/** The emails one change sends, guest first. */
export function meetEmails(
  kind: MeetEmailKind,
  ctx: MeetEmailContext,
): OutgoingEmail[] {
  const { booking } = ctx;
  const host = hostName(ctx.host);
  const guestTz = booking.guestTimezone || 'UTC';
  const hostTz = hostTimezone(ctx);
  const manage = manageLink(ctx.origin, booking.token);
  const reason = booking.reason
    ? `Message from ${host}: “${booking.reason}”`
    : null;
  const calendar = googleCalendarLink({
    start: booking.start,
    end: booking.end,
    summary: meetingTitle(ctx),
    details: booking.meetingUrl ? `Join: ${booking.meetingUrl}` : '',
    location: booking.meetingUrl,
  });
  const applicant = ctx.role ? `Applicant for ${ctx.role}.` : null;
  const out: Array<OutgoingEmail | null | false | undefined> = [];

  switch (kind) {
    case 'requested':
      out.push(
        message(
          ctx,
          'guest',
          `Your request to meet ${host}`,
          lines(
            `Hi ${firstName(booking.guestName)},`,
            `Thanks, your request to meet ${host} is in:\n${when(ctx, guestTz)}`,
            `${host} will look at it soon. Once it's confirmed you'll get another email with the meeting link and a calendar invite.`,
            `Need to cancel? ${manage}`,
          ),
        ),
      );
      break;

    case 'confirmed':
      out.push(
        message(
          ctx,
          'guest',
          `Confirmed: ${host}, ${shortDate(booking.start, guestTz)}`,
          lines(
            `Hi ${firstName(booking.guestName)},`,
            `Your meeting with ${host} is confirmed.`,
            `When: ${when(ctx, guestTz)}\nWhere: ${booking.meetingUrl}`,
            reason,
            `The calendar invite is attached. If your mail app doesn't show it, add it to Google Calendar: ${calendar}`,
            `Can't make it? Cancel here: ${manage}`,
          ),
          invite(ctx, 'REQUEST'),
        ),
        message(
          ctx,
          'host',
          `Confirmed: ${booking.guestName}, ${shortDate(booking.start, hostTz)}`,
          lines(
            `Your meeting with ${booking.guestName} (${booking.guestEmail}) is confirmed.`,
            `When: ${when(ctx, hostTz)}\nWhere: ${booking.meetingUrl}`,
            applicant,
            booking.guestNote && `Their note: “${booking.guestNote}”`,
            `The calendar invite is attached. All your meetings: ${ctx.origin}/meet`,
          ),
          invite(ctx, 'REQUEST'),
        ),
      );
      break;

    case 'proposed': {
      const asked = booking.requestedStart;
      out.push(
        message(
          ctx,
          'guest',
          `${host} suggested a new time`,
          lines(
            `Hi ${firstName(booking.guestName)},`,
            `${host} can't make ${when(ctx, guestTz, asked)}, and suggested this time instead:\n${when(ctx, guestTz)}`,
            reason,
            `Accept it, or cancel if it doesn't work for you: ${manage}`,
          ),
        ),
      );
      break;
    }

    case 'declined':
      out.push(
        message(
          ctx,
          'guest',
          `Your request to meet ${host}`,
          lines(
            `Hi ${firstName(booking.guestName)},`,
            `Sorry, ${host} can't meet at ${when(ctx, guestTz)}.`,
            reason,
          ),
        ),
      );
      break;

    case 'cancelled-by-host': {
      const cancel = ctx.wasConfirmed ? invite(ctx, 'CANCEL') : undefined;
      out.push(
        message(
          ctx,
          'guest',
          `Cancelled: ${host}, ${shortDate(booking.start, guestTz)}`,
          lines(
            `Hi ${firstName(booking.guestName)},`,
            `${host} cancelled your meeting on ${when(ctx, guestTz)}.`,
            reason,
          ),
          cancel,
        ),
        // The host only needs this to clear the invite from their calendar.
        ctx.wasConfirmed &&
          message(
            ctx,
            'host',
            `Cancelled: ${booking.guestName}, ${shortDate(booking.start, hostTz)}`,
            `You cancelled your meeting with ${booking.guestName} on ${when(ctx, hostTz)}. They've been told.`,
            cancel,
          ),
      );
      break;
    }

    case 'cancelled-by-guest': {
      const cancel = ctx.wasConfirmed ? invite(ctx, 'CANCEL') : undefined;
      out.push(
        message(
          ctx,
          'guest',
          `Cancelled: ${host}, ${shortDate(booking.start, guestTz)}`,
          lines(
            `Hi ${firstName(booking.guestName)},`,
            `Your meeting with ${host} on ${when(ctx, guestTz)} is cancelled. ${host} has been told.`,
          ),
          cancel,
        ),
        // A request that was never confirmed only needs the notification.
        ctx.wasConfirmed &&
          message(
            ctx,
            'host',
            `Cancelled: ${booking.guestName}, ${shortDate(booking.start, hostTz)}`,
            lines(
              `${booking.guestName} (${booking.guestEmail}) cancelled the meeting on ${when(ctx, hostTz)}.`,
              booking.reason && `Their message: “${booking.reason}”`,
            ),
            cancel,
          ),
      );
      break;
    }
  }
  return out.filter((e): e is OutgoingEmail => !!e);
}

/**
 * Sends the emails for a change. Sending problems are logged, not thrown:
 * the booking itself already changed.
 */
export async function sendMeetEmails(
  kind: MeetEmailKind,
  ctx: MeetEmailContext,
): Promise<{ sent: number; failed: number }> {
  if (!isResendConfigured()) return { sent: 0, failed: 0 };
  const emails = meetEmails(kind, ctx);
  let sent = 0;
  let failed = 0;
  await Promise.all(
    emails.map(async (email, i) => {
      const result = await sendEmail(
        email,
        `meet-${ctx.booking.id}-${kind}-${ctx.booking.sequence}-${i}`,
      );
      if (result.error) {
        failed += 1;
        console.error(
          `[meet] ${kind} email to ${email.to} failed:`,
          result.error,
        );
      } else sent += 1;
    }),
  );
  return { sent, failed };
}
