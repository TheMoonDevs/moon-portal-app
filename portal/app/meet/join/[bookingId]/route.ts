import { NextResponse } from 'next/server';

import { originOf } from '@/lib/mcp/tokens';
import { noteJoined } from '@/lib/meet/meetingTasks';
import { isBookingToken } from '@/lib/meet/server';
import { db } from '@/lib/mongodb/db-client';
import { getSessionUser } from '@/lib/permissions/server';
import { MEET_BOOKING_STATUS, type MeetBooking } from '@/models/meet';

export const dynamic = 'force-dynamic';

type Params = { params: { bookingId: string } };

/** Joins this long before the start count as turning up. */
const EARLY_MS = 30 * 60 * 1000;
/** And this long after the end (a call that ran over). */
const LATE_MS = 60 * 60 * 1000;

const isObjectId = (v: string) => /^[a-f0-9]{24}$/i.test(v);

/**
 * The meeting's join link: notes who opened the call (on the booking and
 * on their worklog task) and sends them on to the meeting room. The host
 * is known by their session; a guest by their session when they have a
 * portal account, else by the manage token in `?t=`. Someone else signed
 * in (a teammate opening an interview) goes straight to the room, noting
 * nothing; anyone not signed in is sent to sign in, so the room's address
 * stays inside the portal.
 */
export async function GET(request: Request, { params }: Params) {
  const origin = originOf(request);
  const token = new URL(request.url).searchParams.get('t');
  if (!isObjectId(params.bookingId))
    return NextResponse.redirect(`${origin}/meet`);
  const booking: MeetBooking | null = await db.meetBooking.findFirst({
    where: { id: params.bookingId },
  });
  if (!booking) return NextResponse.redirect(`${origin}/meet`);

  const user = await getSessionUser().catch(() => null);
  const emails = [user?.email, user?.googleEmail]
    .filter((e): e is string => !!e)
    .map((e) => e.trim().toLowerCase());
  const side: 'host' | 'guest' | null =
    user?.id === booking.hostId
      ? 'host'
      : emails.includes(booking.guestEmail) ||
          (isBookingToken(token) && token === booking.token)
        ? 'guest'
        : null;

  const manage =
    side === 'guest'
      ? `${origin}/meet/manage/${booking.token}`
      : `${origin}/meet?booking=${booking.id}`;
  if (booking.status !== MEET_BOOKING_STATUS.CONFIRMED || !booking.meetingUrl)
    return NextResponse.redirect(manage);
  if (!side) return NextResponse.redirect(user ? booking.meetingUrl : manage);

  const now = Date.now();
  const inWindow =
    now >= new Date(booking.start).getTime() - EARLY_MS &&
    now <= new Date(booking.end).getTime() + LATE_MS;
  if (inWindow) {
    const at = new Date(now).toISOString();
    const field = side === 'host' ? 'hostJoinedAt' : 'guestJoinedAt';
    // First join only; later ones (a dropped call) change nothing.
    await db.meetBooking
      .updateMany({
        where: { id: booking.id, [field]: null },
        data: {
          [field]: at,
          history: {
            push: {
              type: 'JOINED',
              at,
              by: side === 'host' ? 'HOST' : 'GUEST',
            },
          },
        },
      })
      .catch(() => null);
    // A portal user's worklog task notes it.
    if (user && (side === 'host' || emails.includes(booking.guestEmail)))
      await noteJoined(booking, user.id);
  }

  return NextResponse.redirect(booking.meetingUrl);
}
