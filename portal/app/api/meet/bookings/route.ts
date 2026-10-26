import { db } from '@/lib/mongodb/db-client';
import { fail, ok, requireUser } from '@/lib/workspace/server';
import type { MeetBooking } from '@/models/meet';

export const dynamic = 'force-dynamic';

const PAST_DAYS = 30;

/**
 * The signed-in user's meetings: everything still to come, and the last
 * month's, soonest first.
 */
export async function GET() {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  const since = new Date(
    Date.now() - PAST_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const bookings: MeetBooking[] = await db.meetBooking.findMany({
    where: { hostId: user.id, end: { gt: since } },
    orderBy: { start: 'asc' },
    take: 500,
  });
  const roles = await rolesFor(bookings);
  return ok(
    {
      bookings: bookings.map(({ token: _token, ...b }) => ({
        ...b,
        role: b.applicationId ? (roles.get(b.applicationId) ?? null) : null,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

/** The role each applicant applied for, by application id. */
async function rolesFor(bookings: MeetBooking[]) {
  const ids = Array.from(
    new Set(bookings.map((b) => b.applicationId).filter(Boolean)),
  ) as string[];
  if (!ids.length) return new Map<string, string>();
  const applications: Array<{ id: string; openingId: string }> =
    await db.jobApplication.findMany({
      where: { id: { in: ids } },
      select: { id: true, openingId: true },
    });
  const openings: Array<{ id: string; title: string }> =
    await db.jobOpening.findMany({
      where: {
        id: { in: Array.from(new Set(applications.map((a) => a.openingId))) },
      },
      select: { id: true, title: true },
    });
  const titles = new Map(openings.map((o) => [o.id, o.title]));
  return new Map(
    applications.map((a) => [a.id, titles.get(a.openingId) ?? '']),
  );
}
