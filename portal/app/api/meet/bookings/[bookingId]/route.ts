import { originOf } from '@/lib/mcp/tokens';
import {
  approveBooking,
  cancelBooking,
  declineBooking,
  MeetError,
  proposeTime,
} from '@/lib/meet/bookings';
import { MAX_REASON } from '@/lib/meet/rules';
import { toSlot } from '@/lib/meet/server';
import { db } from '@/lib/mongodb/db-client';
import { fail, ok, requireUser } from '@/lib/workspace/server';
import type { MeetBooking } from '@/models/meet';

type Params = { params: { bookingId: string } };

/**
 * The host answers or changes a meeting.
 * Body: `{ action: 'approve' | 'propose' | 'decline' | 'cancel', start?, reason? }`.
 */
export async function POST(request: Request, { params }: Params) {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  const booking: MeetBooking | null = await db.meetBooking.findFirst({
    where: { id: params.bookingId },
  });
  if (!booking || booking.hostId !== user.id)
    return fail(404, 'Meeting not found.');

  const body = await request.json().catch(() => ({}));
  const reason =
    typeof body?.reason === 'string'
      ? body.reason.trim().slice(0, MAX_REASON) || null
      : null;
  const origin = originOf(request);

  try {
    let updated: MeetBooking;
    switch (body?.action) {
      case 'approve':
        updated = await approveBooking(booking, origin);
        break;
      case 'propose': {
        const start = toSlot(body.start);
        if (!start) return fail(400, 'Pick the new time.');
        updated = await proposeTime(booking, start, reason, origin);
        break;
      }
      case 'decline':
        updated = await declineBooking(booking, reason, origin);
        break;
      case 'cancel':
        updated = await cancelBooking(booking, 'HOST', reason, origin);
        break;
      default:
        return fail(400, 'Unknown action.');
    }
    const { token: _token, ...rest } = updated;
    return ok({ booking: rest });
  } catch (err) {
    if (err instanceof MeetError) return fail(err.status, err.message);
    throw err;
  }
}
