import { db } from '@/lib/mongodb/db-client';
import { ensureNotificationsReset } from '@/lib/notifications/server';
import { sendPushToUsers } from '@/lib/push/server';
import type { ApplicationEvent } from '@/models/hiring';
import {
  MEET_BOOKING_STATUS,
  type MeetBooking,
  type MeetBookingEvent,
  type MeetProfile,
} from '@/models/meet';
import { NotificationType } from '@/models/shared/enums';

import { type MeetEmailKind, sendMeetEmails } from './emails';
import { MAX_NOTE, MAX_REASON } from './rules';
import {
  findApplicationFor,
  hostName,
  isSlotFree,
  loadHost,
  meetingRoomFor,
  newBookingToken,
} from './server';
import { formatRange } from './time';

/*
 * Everything that changes a booking: a guest's request, the host's approve,
 * new time, decline or cancel, and the guest accepting or cancelling. Each
 * change is a compare-and-set on the status, so two clicks can't both win.
 */

export class MeetError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const nowIso = () => new Date().toISOString();

/** Most open requests one guest can have with one host. */
const MAX_OPEN_PER_GUEST = 2;

/** Moves a booking from one of `from` to new data, or throws if it moved. */
async function transition(
  booking: MeetBooking,
  from: MEET_BOOKING_STATUS[],
  data: Partial<MeetBooking>,
  event: Omit<MeetBookingEvent, 'at'>,
): Promise<MeetBooking> {
  const at = nowIso();
  const { count } = await db.meetBooking.updateMany({
    where: { id: booking.id, status: { in: from } },
    data: { ...data, updatedAt: at, history: { push: { ...event, at } } },
  });
  if (!count)
    throw new MeetError(409, 'This meeting changed in the meantime. Reload.');
  return db.meetBooking.findFirst({ where: { id: booking.id } });
}

/* ------------------------------ notifications ---------------------------- */

const NOTIFICATION_KIND = 'MEET_REQUEST';

export interface MeetNotificationData {
  kind: typeof NOTIFICATION_KIND;
  bookingId: string;
  actions: Array<{ title: string; trigger_type: string; trigger: string }>;
  /** True once nothing is left for the host to do. */
  actionDone: boolean;
}

async function notifyHost(
  booking: MeetBooking,
  title: string,
  description: string,
  needsAction: boolean,
) {
  // The one-time reset of old notifications must not wipe this one.
  await ensureNotificationsReset();
  const at = new Date();
  const notificationData: MeetNotificationData = {
    kind: NOTIFICATION_KIND,
    bookingId: booking.id,
    actions: [
      {
        title: needsAction ? 'Open in Meet' : 'View',
        trigger_type: 'link',
        trigger: `/meet?booking=${booking.id}`,
      },
    ],
    actionDone: !needsAction,
  };
  await db.notification.create({
    data: {
      userId: booking.hostId,
      title,
      description,
      matchId: booking.id,
      matchType: 'MeetBooking',
      notificationType: NotificationType.SELF_GENERATED,
      notificationData,
      isRead: false,
      createdAt: at,
      updatedAt: at,
    },
  });
  await sendPushToUsers([booking.hostId], {
    title,
    body: description.split('\n')[0],
    url: `/meet?booking=${booking.id}`,
    tag: `meet-${booking.id}`,
  }).catch((e) => console.error('[meet] push failed', e));
}

/** Marks the request's notifications handled, wherever it was handled from. */
async function settleNotifications(bookingId: string) {
  await db.notification.updateMany({
    where: { matchId: bookingId, matchType: 'MeetBooking' },
    data: { 'notificationData.actionDone': true, updatedAt: new Date() },
  });
}

/* --------------------------------- hiring -------------------------------- */

async function noteOnApplication(booking: MeetBooking, text: string) {
  if (!booking.applicationId) return;
  const event: ApplicationEvent = { type: 'NOTE', at: nowIso(), text };
  await db.jobApplication
    .update({
      where: { id: booking.applicationId },
      data: { history: { push: event } },
    })
    .catch(() => null);
}

/* -------------------------------- context -------------------------------- */

async function contextFor(booking: MeetBooking, origin: string) {
  const [profile, host, role] = await Promise.all([
    db.meetProfile.findFirst({
      where: { id: booking.profileId },
    }) as Promise<MeetProfile | null>,
    loadHost(booking.hostId),
    booking.applicationId
      ? db.jobApplication
          .findFirst({ where: { id: booking.applicationId } })
          .then((a: { openingId?: string } | null) =>
            a?.openingId
              ? db.jobOpening.findFirst({ where: { id: a.openingId } })
              : null,
          )
          .then((o: { title?: string } | null) => o?.title ?? null)
      : Promise.resolve(null),
  ]);
  if (!profile || !host) throw new MeetError(404, 'Meeting not found.');
  return { booking, profile, host, origin, role };
}

async function email(
  kind: MeetEmailKind,
  booking: MeetBooking,
  origin: string,
  extra: { wasConfirmed?: boolean } = {},
) {
  const ctx = await contextFor(booking, origin);
  return sendMeetEmails(kind, { ...ctx, ...extra });
}

const hostRange = (booking: MeetBooking, profile: MeetProfile) =>
  formatRange(booking.start, booking.end, profile.timezone);

/* --------------------------------- guests -------------------------------- */

export interface BookingRequest {
  start: string;
  name: string;
  email: string;
  note: string | null;
  timezone: string;
}

/** A guest asks for a time. Confirms straight away if the host allows it. */
export async function requestBooking(
  profile: MeetProfile,
  input: BookingRequest,
  origin: string,
): Promise<MeetBooking> {
  if (!(await isSlotFree(profile, input.start)))
    throw new MeetError(409, 'That time was just taken. Pick another one.');

  const open = await db.meetBooking.count({
    where: {
      hostId: profile.userId,
      guestEmail: input.email,
      status: {
        in: [MEET_BOOKING_STATUS.PENDING, MEET_BOOKING_STATUS.PROPOSED],
      },
      end: { gt: nowIso() },
    },
  });
  if (open >= MAX_OPEN_PER_GUEST)
    throw new MeetError(
      429,
      'You already have requests waiting. Check your email for them.',
    );

  const match = await findApplicationFor(profile.userId, input.email);
  const at = nowIso();
  const end = new Date(
    new Date(input.start).getTime() + profile.durationMinutes * 60 * 1000,
  ).toISOString();
  let booking: MeetBooking = await db.meetBooking.create({
    data: {
      hostId: profile.userId,
      profileId: profile.id,
      guestName: input.name,
      guestEmail: input.email,
      guestNote: input.note?.slice(0, MAX_NOTE) || null,
      guestTimezone: input.timezone,
      start: input.start,
      end,
      requestedStart: input.start,
      status: MEET_BOOKING_STATUS.PENDING,
      meetingUrl: null,
      token: newBookingToken(),
      sequence: 0,
      reason: null,
      applicationId: match?.application.id ?? null,
      companyId: match?.application.companyId ?? null,
      history: [{ type: 'REQUESTED', at, by: 'GUEST', start: input.start }],
      createdAt: at,
      updatedAt: at,
    },
  });

  // Two guests can pass the free-slot check at once; the earlier one keeps it.
  const clash: MeetBooking | null = await db.meetBooking.findFirst({
    where: {
      hostId: profile.userId,
      status: {
        in: [
          MEET_BOOKING_STATUS.PENDING,
          MEET_BOOKING_STATUS.PROPOSED,
          MEET_BOOKING_STATUS.CONFIRMED,
        ],
      },
      start: { lt: end },
      end: { gt: input.start },
      createdAt: { lte: at },
    },
    orderBy: { createdAt: 'asc' },
  });
  if (clash && clash.id !== booking.id) {
    await db.meetBooking.delete({ where: { id: booking.id } });
    throw new MeetError(409, 'That time was just taken. Pick another one.');
  }

  const who = match
    ? `${input.name} (applicant for ${match.role || 'a role'})`
    : input.name;

  if (!profile.requiresApproval) {
    booking = await confirm(booking, 'GUEST', origin);
    await notifyHost(
      booking,
      `${who} booked a meeting`,
      `${hostRange(booking, profile)}\n${input.email}${booking.guestNote ? `\n\n“${booking.guestNote}”` : ''}`,
      false,
    );
    return booking;
  }

  await notifyHost(
    booking,
    `${who} wants to meet`,
    `${hostRange(booking, profile)}\n${input.email}${booking.guestNote ? `\n\n“${booking.guestNote}”` : ''}`,
    true,
  );
  await email('requested', booking, origin);
  return booking;
}

/** The guest takes the time the host suggested. */
export async function acceptProposal(booking: MeetBooking, origin: string) {
  if (booking.status !== MEET_BOOKING_STATUS.PROPOSED)
    throw new MeetError(409, 'There is no new time to accept.');
  if (new Date(booking.start).getTime() < Date.now())
    throw new MeetError(410, 'That time has passed.');
  const confirmed = await confirm(booking, 'GUEST', origin, [
    MEET_BOOKING_STATUS.PROPOSED,
  ]);
  const ctx = await contextFor(confirmed, origin);
  await notifyHost(
    confirmed,
    `${confirmed.guestName} accepted the new time`,
    hostRange(confirmed, ctx.profile),
    false,
  );
  return confirmed;
}

/* ---------------------------------- hosts -------------------------------- */

async function confirm(
  booking: MeetBooking,
  by: 'HOST' | 'GUEST',
  origin: string,
  from: MEET_BOOKING_STATUS[] = [MEET_BOOKING_STATUS.PENDING],
) {
  const ctx = await contextFor(booking, origin);
  const confirmed = await transition(
    booking,
    from,
    {
      status: MEET_BOOKING_STATUS.CONFIRMED,
      meetingUrl: booking.meetingUrl || meetingRoomFor(ctx.profile, ctx.host),
      sequence: (booking.sequence ?? 0) + 1,
      decidedAt: nowIso(),
    },
    {
      type: from.includes(MEET_BOOKING_STATUS.PROPOSED)
        ? 'ACCEPTED'
        : 'CONFIRMED',
      by,
      start: booking.start,
    },
  );
  await settleNotifications(booking.id);
  await noteOnApplication(
    confirmed,
    `Interview with ${hostName(ctx.host)} booked: ${hostRange(confirmed, ctx.profile)}.`,
  );
  await email('confirmed', confirmed, origin);
  return confirmed;
}

/** The host says yes. */
export const approveBooking = (booking: MeetBooking, origin: string) => {
  if (new Date(booking.start).getTime() < Date.now())
    throw new MeetError(410, 'That time has already passed.');
  return confirm(booking, 'HOST', origin);
};

/** The host is busy then and offers another free time. */
export async function proposeTime(
  booking: MeetBooking,
  start: string,
  reason: string | null,
  origin: string,
) {
  const profile: MeetProfile | null = await db.meetProfile.findFirst({
    where: { id: booking.profileId },
  });
  if (!profile) throw new MeetError(404, 'Meeting not found.');
  if (start === booking.start)
    throw new MeetError(400, 'Pick a different time.');
  if (
    !(await isSlotFree(profile, start, {
      exceptId: booking.id,
      ignoreNotice: true,
    }))
  )
    throw new MeetError(409, 'That time isn’t free. Pick another one.');

  const length =
    new Date(booking.end).getTime() - new Date(booking.start).getTime();
  const moved = await transition(
    booking,
    [MEET_BOOKING_STATUS.PENDING, MEET_BOOKING_STATUS.PROPOSED],
    {
      status: MEET_BOOKING_STATUS.PROPOSED,
      start,
      end: new Date(new Date(start).getTime() + length).toISOString(),
      reason: reason?.slice(0, MAX_REASON) || null,
    },
    { type: 'PROPOSED', by: 'HOST', start, text: reason },
  );
  await settleNotifications(booking.id);
  await email('proposed', moved, origin);
  return moved;
}

/** The host says no to a request. */
export async function declineBooking(
  booking: MeetBooking,
  reason: string | null,
  origin: string,
) {
  const declined = await transition(
    booking,
    [MEET_BOOKING_STATUS.PENDING, MEET_BOOKING_STATUS.PROPOSED],
    {
      status: MEET_BOOKING_STATUS.DECLINED,
      reason: reason?.slice(0, MAX_REASON) || null,
      decidedAt: nowIso(),
    },
    { type: 'DECLINED', by: 'HOST', text: reason },
  );
  await settleNotifications(booking.id);
  await email('declined', declined, origin);
  return declined;
}

/** Either side calls it off. */
export async function cancelBooking(
  booking: MeetBooking,
  by: 'HOST' | 'GUEST',
  reason: string | null,
  origin: string,
) {
  if (
    booking.status === MEET_BOOKING_STATUS.CONFIRMED &&
    new Date(booking.end).getTime() < Date.now()
  )
    throw new MeetError(410, 'This meeting is already over.');
  const wasConfirmed = booking.status === MEET_BOOKING_STATUS.CONFIRMED;
  const cancelled = await transition(
    booking,
    [
      MEET_BOOKING_STATUS.PENDING,
      MEET_BOOKING_STATUS.PROPOSED,
      MEET_BOOKING_STATUS.CONFIRMED,
    ],
    {
      status: MEET_BOOKING_STATUS.CANCELLED,
      reason: reason?.slice(0, MAX_REASON) || null,
      sequence: (booking.sequence ?? 0) + 1,
    },
    { type: 'CANCELLED', by, text: reason },
  );
  await settleNotifications(booking.id);
  const ctx = await contextFor(cancelled, origin);
  if (wasConfirmed)
    await noteOnApplication(
      cancelled,
      `Interview on ${hostRange(cancelled, ctx.profile)} cancelled by the ${by === 'HOST' ? 'interviewer' : 'candidate'}.`,
    );
  if (by === 'GUEST')
    await notifyHost(
      cancelled,
      `${cancelled.guestName} cancelled`,
      `${hostRange(cancelled, ctx.profile)}${reason ? `\n\n“${reason}”` : ''}`,
      false,
    );
  await sendMeetEmails(
    by === 'HOST' ? 'cancelled-by-host' : 'cancelled-by-guest',
    { ...ctx, wasConfirmed },
  );
  return cancelled;
}
