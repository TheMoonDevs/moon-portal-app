import type { NextRequest } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { fail, ok, requireCompanyPermission } from '@/lib/workspace/server';
import type { JobApplication, JobOpening } from '@/models/hiring';
import {
  ACTIVE_MEET_STATUSES,
  MEET_BOOKING_STATUS,
  type MeetBooking,
} from '@/models/meet';

export const dynamic = 'force-dynamic';

const DAY_MS = 86400000;
const PAST_DAYS = 60;
const AHEAD_DAYS = 90;

/**
 * Interviews booked through meeting links by applicants of one company
 * (`?companyId=&when=upcoming|past`), with the applicant, their opening and
 * its screening requirements for the scorecard. Upcoming covers the next 90
 * days; past the last 60, confirmed calls only.
 */
export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId');
  const past = request.nextUrl.searchParams.get('when') === 'past';
  const { response, user } = await requireCompanyPermission(
    companyId,
    'hiring:read',
  );
  if (response || !user || !companyId)
    return response ?? fail(401, 'Authentication required.');

  const now = new Date();
  const bookings: MeetBooking[] = await db.meetBooking.findMany({
    where: {
      companyId,
      applicationId: { notIn: [null, ''] },
      ...(past
        ? {
            status: MEET_BOOKING_STATUS.CONFIRMED,
            start: {
              lt: now.toISOString(),
              gt: new Date(now.getTime() - PAST_DAYS * DAY_MS).toISOString(),
            },
          }
        : {
            status: { in: ACTIVE_MEET_STATUSES },
            end: { gt: now.toISOString() },
            start: {
              lt: new Date(now.getTime() + AHEAD_DAYS * DAY_MS).toISOString(),
            },
          }),
    },
    orderBy: { start: past ? 'desc' : 'asc' },
  });

  const applicationIds = Array.from(
    new Set(bookings.map((b) => b.applicationId as string)),
  );
  const applications: JobApplication[] = applicationIds.length
    ? await db.jobApplication.findMany({
        where: { id: { in: applicationIds }, companyId },
      })
    : [];
  const openingIds = Array.from(new Set(applications.map((a) => a.openingId)));
  const openings: JobOpening[] = openingIds.length
    ? await db.jobOpening.findMany({ where: { id: { in: openingIds } } })
    : [];
  const known = new Set(applications.map((a) => a.id));

  return ok({
    interviews: bookings
      .filter((b) => known.has(b.applicationId as string))
      .map((b) => ({
        id: b.id,
        hostId: b.hostId,
        applicationId: b.applicationId,
        guestName: b.guestName,
        guestEmail: b.guestEmail,
        guestNote: b.guestNote ?? null,
        start: b.start,
        end: b.end,
        status: b.status,
        meetingUrl:
          b.status === MEET_BOOKING_STATUS.CONFIRMED
            ? (b.meetingUrl ?? null)
            : null,
      })),
    applications,
    openings: openings.map((o) => ({
      id: o.id,
      title: o.title,
      screening: o.screening ?? null,
      hiringLeadId: o.hiringLeadId ?? null,
      fields: o.fields,
      task: o.task ?? null,
    })),
  });
}
