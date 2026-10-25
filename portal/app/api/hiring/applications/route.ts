import type { NextRequest } from 'next/server';

import {
  isStage,
  moveApplication,
  requireOpeningPermission,
} from '@/lib/hiring/server';
import { db } from '@/lib/mongodb/db-client';
import {
  asStringArray,
  fail,
  ok,
  requireCompanyPermission,
} from '@/lib/workspace/server';
import type { JobApplication } from '@/models/hiring';

export const dynamic = 'force-dynamic';

const MAX_BULK = 500;

/** Applications for one opening (`?openingId=`), newest first. */
export async function GET(request: NextRequest) {
  const openingId = request.nextUrl.searchParams.get('openingId');
  if (!openingId) return fail(400, 'openingId is required.');

  const { response, opening } = await requireOpeningPermission(
    openingId,
    'hiring:read',
  );
  if (response || !opening)
    return response ?? fail(401, 'Authentication required.');

  const applications: JobApplication[] = await db.jobApplication.findMany({
    where: { openingId: opening.id },
    orderBy: { submittedAt: 'desc' },
  });
  return ok({ applications });
}

/** Moves many applications to one stage: `{ ids: string[], stage }`. */
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ids = asStringArray(body.ids).slice(0, MAX_BULK);
  if (!ids.length) return fail(400, 'Choose at least one applicant.');
  if (!isStage(body.stage)) return fail(400, 'Unknown stage.');

  const applications: JobApplication[] = await db.jobApplication.findMany({
    where: { id: { in: ids } },
  });
  if (!applications.length) return fail(404, 'No applicants found.');

  // Every company involved must allow the caller to edit its hiring.
  const companyIds = Array.from(new Set(applications.map((a) => a.companyId)));
  let userId: string | null = null;
  for (const companyId of companyIds) {
    const { response, user } = await requireCompanyPermission(
      companyId,
      'hiring:edit',
    );
    if (response || !user)
      return response ?? fail(401, 'Authentication required.');
    userId = user.id;
  }

  const updated = await Promise.all(
    applications.map((a) => moveApplication(a, body.stage, userId)),
  );
  return ok({ applications: updated, count: updated.length });
}
