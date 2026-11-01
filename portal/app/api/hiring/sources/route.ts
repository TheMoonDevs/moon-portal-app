import type { NextRequest } from 'next/server';

import { DIRECT_SOURCE } from '@/lib/hiring/sources';
import { db } from '@/lib/mongodb/db-client';
import { fail, ok, requireCompanyPermission } from '@/lib/workspace/server';
import type { JobApplication, JobOpening } from '@/models/hiring';
import { APPLICATION_STAGE, JOB_OPENING_STATUS } from '@/models/hiring';

export const dynamic = 'force-dynamic';

/** Stages past screening, in order; "reached" counts the furthest one. */
const LADDER = [
  APPLICATION_STAGE.SHORTLISTED,
  APPLICATION_STAGE.TASK,
  APPLICATION_STAGE.TASK_REVIEW,
  APPLICATION_STAGE.INTERVIEW,
  APPLICATION_STAGE.OFFER,
  APPLICATION_STAGE.HIRED,
];

/** The furthest stage past Applied someone got to, rejected or not. */
const furthest = (a: JobApplication) => {
  const stages = [
    a.stage,
    ...(a.history ?? []).map((e) => e.to).filter(Boolean),
  ] as APPLICATION_STAGE[];
  return Math.max(-1, ...stages.map((s) => LADDER.indexOf(s)));
};

const at = (stage: APPLICATION_STAGE) => LADDER.indexOf(stage);

/**
 * Where each opening's applicants came from (`?companyId=`): per source tag
 * (the apply link's ?ref=), how many applied and how many got shortlisted,
 * to a task, an interview and hired. Rejected people count for the stages
 * they reached before.
 */
export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId');
  const { response, user } = await requireCompanyPermission(
    companyId,
    'hiring:read',
  );
  if (response || !user || !companyId)
    return response ?? fail(401, 'Authentication required.');

  const openings: JobOpening[] = await db.jobOpening.findMany({
    where: { companyId, status: { notIn: [JOB_OPENING_STATUS.ARCHIVED] } },
    orderBy: { createdAt: 'desc' },
  });
  const applications: JobApplication[] = openings.length
    ? await db.jobApplication.findMany({
        where: { openingId: { in: openings.map((o) => o.id) } },
        select: {
          id: true,
          openingId: true,
          stage: true,
          source: true,
          history: true,
        },
      })
    : [];

  const rows = new Map<
    string,
    {
      openingId: string;
      source: string;
      applied: number;
      shortlisted: number;
      task: number;
      interview: number;
      hired: number;
    }
  >();
  for (const a of applications) {
    const source = a.source || DIRECT_SOURCE;
    const key = `${a.openingId}:${source}`;
    const row = rows.get(key) ?? {
      openingId: a.openingId,
      source,
      applied: 0,
      shortlisted: 0,
      task: 0,
      interview: 0,
      hired: 0,
    };
    const reach = furthest(a);
    row.applied += 1;
    if (reach >= at(APPLICATION_STAGE.SHORTLISTED)) row.shortlisted += 1;
    if (reach >= at(APPLICATION_STAGE.TASK)) row.task += 1;
    if (reach >= at(APPLICATION_STAGE.INTERVIEW)) row.interview += 1;
    if (reach >= at(APPLICATION_STAGE.HIRED)) row.hired += 1;
    rows.set(key, row);
  }

  return ok({
    openings: openings.map((o) => ({
      id: o.id,
      title: o.title,
      slug: o.slug,
      status: o.status,
      description: o.description ?? null,
      department: o.department ?? null,
      location: o.location ?? null,
      employmentType: o.employmentType ?? null,
    })),
    rows: Array.from(rows.values()).sort((a, b) => b.applied - a.applied),
  });
}
