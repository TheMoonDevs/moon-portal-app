import type { NextRequest } from 'next/server';

import {
  DEFAULT_DIGEST_FREQUENCY,
  isDigestFrequency,
} from '@/lib/hiring/digestFrequency';
import { applicationDueAt } from '@/lib/hiring/tasks';
import { originOf } from '@/lib/mcp/tokens';
import { meetLink } from '@/lib/meet/server';
import { db } from '@/lib/mongodb/db-client';
import { fail, ok, requireCompanyPermission } from '@/lib/workspace/server';
import type { JobApplication, JobOpening } from '@/models/hiring';
import { APPLICATION_STAGE, JOB_OPENING_STATUS } from '@/models/hiring';
import {
  ACTIVE_MEET_STATUSES,
  type MeetBooking,
  type MeetProfile,
} from '@/models/meet';
import { MEMBER_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

/**
 * The hiring team of one company (`?companyId=`): every opening with its
 * lead and what waits on it (tasks to review, people to screen, tasks past
 * due, interviews coming up), and for each lead their digest frequency and
 * booking link. Members are listed so a lead can be switched.
 */
export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId');
  const { response, user } = await requireCompanyPermission(
    companyId,
    'hiring:read',
  );
  if (response || !user || !companyId)
    return response ?? fail(401, 'Authentication required.');

  const now = new Date();
  const [openings, members] = await Promise.all([
    db.jobOpening.findMany({
      where: { companyId, status: { notIn: [JOB_OPENING_STATUS.ARCHIVED] } },
      orderBy: { createdAt: 'desc' },
    }) as Promise<JobOpening[]>,
    db.companyMember.findMany({
      where: { companyId, status: MEMBER_STATUS.ACTIVE },
      select: { userId: true },
    }) as Promise<Array<{ userId: string }>>,
  ]);
  const openingIds = openings.map((o) => o.id);
  const [applications, bookings] = await Promise.all([
    openingIds.length
      ? (db.jobApplication.findMany({
          where: {
            openingId: { in: openingIds },
            stage: {
              in: [
                APPLICATION_STAGE.APPLIED,
                APPLICATION_STAGE.TASK,
                APPLICATION_STAGE.TASK_REVIEW,
              ],
            },
          },
          select: {
            id: true,
            openingId: true,
            stage: true,
            taskSentAt: true,
            taskDueOverride: true,
            taskSubmission: true,
          },
        }) as Promise<JobApplication[]>)
      : Promise.resolve([] as JobApplication[]),
    db.meetBooking.findMany({
      where: {
        companyId,
        applicationId: { notIn: [null, ''] },
        status: { in: ACTIVE_MEET_STATUSES },
        end: { gt: now.toISOString() },
      },
      select: { id: true, hostId: true, applicationId: true },
    }) as Promise<MeetBooking[]>,
  ]);

  const openingRows = openings.map((o) => {
    const apps = applications.filter((a) => a.openingId === o.id);
    return {
      id: o.id,
      title: o.title,
      status: o.status,
      hiringLeadId: o.hiringLeadId ?? null,
      review: apps.filter((a) => a.stage === APPLICATION_STAGE.TASK_REVIEW)
        .length,
      screen: apps.filter((a) => a.stage === APPLICATION_STAGE.APPLIED).length,
      pastDue: apps.filter((a) => {
        if (a.stage !== APPLICATION_STAGE.TASK || a.taskSubmission)
          return false;
        const due = applicationDueAt(o.task, a);
        return !!due && due < now;
      }).length,
    };
  });

  const leadIds = Array.from(
    new Set(openingRows.map((o) => o.hiringLeadId).filter(Boolean)),
  ) as string[];
  const [leadUsers, profiles] = await Promise.all([
    leadIds.length
      ? (db.user.findMany({
          where: { id: { in: leadIds } },
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            hiringDigest: true,
          },
        }) as Promise<
          Array<{
            id: string;
            name?: string | null;
            email?: string | null;
            avatar?: string | null;
            hiringDigest?: string | null;
          }>
        >)
      : Promise.resolve([]),
    leadIds.length
      ? (db.meetProfile.findMany({
          where: { userId: { in: leadIds } },
        }) as Promise<MeetProfile[]>)
      : Promise.resolve([] as MeetProfile[]),
  ]);
  const memberIds = new Set(members.map((m) => m.userId));
  const origin = originOf(request);

  const leads = leadUsers.map((lead) => {
    const led = openingRows.filter((o) => o.hiringLeadId === lead.id);
    const profile = profiles.find((p) => p.userId === lead.id);
    return {
      id: lead.id,
      name: lead.name || lead.email || 'A teammate',
      email: lead.email ?? null,
      avatar: lead.avatar ?? null,
      isMember: memberIds.has(lead.id),
      digest: isDigestFrequency(lead.hiringDigest)
        ? lead.hiringDigest
        : DEFAULT_DIGEST_FREQUENCY,
      meetingLink: profile ? meetLink(origin, profile.code) : null,
      takingMeetings: profile ? profile.isActive !== false : false,
      openings: led.length,
      review: led.reduce((n, o) => n + o.review, 0),
      screen: led.reduce((n, o) => n + o.screen, 0),
      pastDue: led.reduce((n, o) => n + o.pastDue, 0),
      interviews: bookings.filter((b) => b.hostId === lead.id).length,
    };
  });
  leads.sort(
    (a, b) =>
      b.review + b.screen + b.pastDue - (a.review + a.screen + a.pastDue),
  );

  return ok({
    openings: openingRows,
    leads,
    memberIds: Array.from(memberIds),
  });
}
