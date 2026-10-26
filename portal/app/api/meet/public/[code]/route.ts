import { isValidEmail } from '@/lib/hiring/forms';
import { clientKeyFor } from '@/lib/hiring/server';
import { originOf } from '@/lib/mcp/tokens';
import { MeetError, requestBooking } from '@/lib/meet/bookings';
import { MAX_NOTE } from '@/lib/meet/rules';
import {
  isBookingRateLimited,
  isMeetCode,
  manageLink,
  slotsFor,
  toSlot,
} from '@/lib/meet/server';
import { isTimezone } from '@/lib/meet/time';
import { db } from '@/lib/mongodb/db-client';
import { fail, ok } from '@/lib/workspace/server';
import { MEET_BOOKING_STATUS, type MeetProfile } from '@/models/meet';

export const dynamic = 'force-dynamic';

type Params = { params: { code: string } };

async function openProfile(code: string): Promise<MeetProfile | null> {
  if (!isMeetCode(code)) return null;
  const profile: MeetProfile | null = await db.meetProfile.findFirst({
    where: { code },
  });
  return profile?.isActive ? profile : null;
}

/** The free times on a booking link. No sign-in needed. */
export async function GET(_request: Request, { params }: Params) {
  const profile = await openProfile(params.code);
  if (!profile) return fail(404, 'This link isn’t taking bookings.');
  return ok(
    {
      slots: await slotsFor(profile),
      durationMinutes: profile.durationMinutes,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

/**
 * A guest asks for a time: `{ start, name, email, note?, timezone }`.
 * `website` is a field people never see; bots that fill it get a quiet yes.
 */
export async function POST(request: Request, { params }: Params) {
  if (isBookingRateLimited(clientKeyFor(request)))
    return fail(429, 'Too many requests from here. Try again later.');
  const profile = await openProfile(params.code);
  if (!profile) return fail(404, 'This link isn’t taking bookings.');

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object')
    return fail(400, 'The request could not be read.');
  if (typeof body.website === 'string' && body.website.trim())
    return ok({ status: MEET_BOOKING_STATUS.PENDING });

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const note =
    typeof body.note === 'string' ? body.note.trim().slice(0, MAX_NOTE) : '';
  const start = toSlot(body.start);
  const errors: Record<string, string> = {};
  if (!name || name.length > 120) errors.name = 'Add your name.';
  if (!isValidEmail(email)) errors.email = 'Add a valid email address.';
  if (!start) errors.start = 'Pick a time.';
  if (Object.keys(errors).length)
    return Response.json(
      { status: 'fail', error: 'Please check the highlighted fields.', errors },
      { status: 400 },
    );

  try {
    const booking = await requestBooking(
      profile,
      {
        start: start as string,
        name,
        email,
        note: note || null,
        timezone: isTimezone(body.timezone) ? body.timezone : profile.timezone,
      },
      originOf(request),
    );
    return ok({
      status: booking.status,
      start: booking.start,
      end: booking.end,
      meetingUrl: booking.meetingUrl ?? null,
      manageUrl: manageLink(originOf(request), booking.token),
    });
  } catch (err) {
    if (err instanceof MeetError) return fail(err.status, err.message);
    throw err;
  }
}
