import { randomBytes } from 'crypto';

import {
  isVerdict,
  MAX_SCORECARD_NOTES,
  sanitizeRatings,
  verdictMeta,
} from '@/lib/hiring/scorecards';
import { requireApplicationPermission } from '@/lib/hiring/server';
import { db } from '@/lib/mongodb/db-client';
import { fail, nowIso, ok } from '@/lib/workspace/server';
import type { ApplicationEvent, Scorecard } from '@/models/hiring';

export const dynamic = 'force-dynamic';

type Params = { params: { applicationId: string } };

/**
 * Saves the caller's scorecard for an interview:
 * `{ bookingId?, ratings: [{ requirement, rating 1-4 }], verdict, notes? }`.
 * One per interviewer per booking; saving again replaces it.
 */
export async function POST(request: Request, { params }: Params) {
  const { response, application, user } = await requireApplicationPermission(
    params.applicationId,
    'hiring:read',
  );
  if (response || !application || !user)
    return response ?? fail(401, 'Authentication required.');

  const body = await request.json().catch(() => ({}));
  if (!isVerdict(body.verdict))
    return fail(400, 'Pick a verdict: strong yes, yes, no or strong no.');
  const ratings = sanitizeRatings(body.ratings);
  const bookingId =
    typeof body.bookingId === 'string' && /^[a-f0-9]{24}$/i.test(body.bookingId)
      ? body.bookingId
      : null;
  if (bookingId) {
    const booking = await db.meetBooking.count({
      where: { id: bookingId, applicationId: application.id },
    });
    if (!booking) return fail(404, 'That interview isn’t this applicant’s.');
  }
  const notes =
    typeof body.notes === 'string'
      ? body.notes.trim().slice(0, MAX_SCORECARD_NOTES) || null
      : null;

  const at = nowIso();
  const existing = (application.scorecards ?? []).find(
    (s) => s.byUserId === user.id && (s.bookingId ?? null) === bookingId,
  );
  const card: Scorecard = {
    id: existing?.id ?? randomBytes(8).toString('hex'),
    byUserId: user.id,
    bookingId,
    ratings,
    verdict: body.verdict,
    notes,
    at,
  };
  const scorecards = [
    ...(application.scorecards ?? []).filter((s) => s.id !== card.id),
    card,
  ];
  const event: ApplicationEvent = {
    type: 'SCORECARD',
    at,
    byUserId: user.id,
    text: `${existing ? 'Updated' : 'Left'} a scorecard: ${verdictMeta(card.verdict)?.label}`,
  };
  const updated = await db.jobApplication.update({
    where: { id: application.id },
    data: { scorecards, updatedAt: at, history: { push: event } },
  });
  return ok({ application: updated, scorecard: card });
}
