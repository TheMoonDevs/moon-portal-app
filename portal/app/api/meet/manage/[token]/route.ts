import { originOf } from '@/lib/mcp/tokens';
import { acceptProposal, cancelBooking, MeetError } from '@/lib/meet/bookings';
import { MAX_REASON } from '@/lib/meet/rules';
import { isBookingToken } from '@/lib/meet/server';
import { db } from '@/lib/mongodb/db-client';
import { fail, ok } from '@/lib/workspace/server';
import type { MeetBooking } from '@/models/meet';

type Params = { params: { token: string } };

/**
 * The guest's side of a booking, reached by the secret link in their
 * emails: `{ action: 'accept' | 'cancel', reason? }`.
 */
export async function POST(request: Request, { params }: Params) {
  if (!isBookingToken(params.token)) return fail(404, 'Meeting not found.');
  const booking: MeetBooking | null = await db.meetBooking.findFirst({
    where: { token: params.token },
  });
  if (!booking) return fail(404, 'Meeting not found.');

  const body = await request.json().catch(() => ({}));
  const reason =
    typeof body?.reason === 'string'
      ? body.reason.trim().slice(0, MAX_REASON) || null
      : null;
  const origin = originOf(request);
  try {
    const updated =
      body?.action === 'accept'
        ? await acceptProposal(booking, origin)
        : body?.action === 'cancel'
          ? await cancelBooking(booking, 'GUEST', reason, origin)
          : null;
    if (!updated) return fail(400, 'Unknown action.');
    return ok({ status: updated.status, meetingUrl: updated.meetingUrl });
  } catch (err) {
    if (err instanceof MeetError) return fail(err.status, err.message);
    throw err;
  }
}
