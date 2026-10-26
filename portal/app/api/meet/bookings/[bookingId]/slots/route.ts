import { slotsFor } from '@/lib/meet/server';
import { db } from '@/lib/mongodb/db-client';
import { fail, ok, requireUser } from '@/lib/workspace/server';
import type { MeetBooking, MeetProfile } from '@/models/meet';

export const dynamic = 'force-dynamic';

type Params = { params: { bookingId: string } };

/**
 * Free times the host can move a meeting to. The notice period doesn't
 * apply: the host can offer a slot later today.
 */
export async function GET(_request: Request, { params }: Params) {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  const booking: MeetBooking | null = await db.meetBooking.findFirst({
    where: { id: params.bookingId },
  });
  if (!booking || booking.hostId !== user.id)
    return fail(404, 'Meeting not found.');
  const profile: MeetProfile | null = await db.meetProfile.findFirst({
    where: { id: booking.profileId },
  });
  if (!profile) return fail(404, 'Meeting not found.');
  const slots = await slotsFor(profile, {
    exceptId: booking.id,
    ignoreNotice: true,
  });
  return ok(
    { slots, timezone: profile.timezone },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
