import type { NextRequest } from 'next/server';

import {
  countByStage,
  emptyStageCounts,
  hiringLeadProblem,
  parseOpeningInput,
  statusTimestamps,
  uniqueOpeningSlug,
} from '@/lib/hiring/server';
import { db } from '@/lib/mongodb/db-client';
import { hasPermission } from '@/lib/permissions/matching';
import {
  fail,
  getWorkspaceForUser,
  nowIso,
  ok,
  requireCompanyPermission,
  requireUser,
} from '@/lib/workspace/server';
import type { JobOpening } from '@/models/hiring';
import { JOB_OPENING_STATUS } from '@/models/hiring';

export const dynamic = 'force-dynamic';

/**
 * Openings in one company (`?companyId=`), or across every company where the
 * caller can read hiring. Each opening carries its applicants per stage.
 */
export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId');
  const includeArchived =
    request.nextUrl.searchParams.get('includeArchived') === 'true';

  let companyIds: string[];
  if (companyId) {
    const { response } = await requireCompanyPermission(
      companyId,
      'hiring:read',
    );
    if (response) return response;
    companyIds = [companyId];
  } else {
    const { response, user } = await requireUser();
    if (response || !user)
      return response ?? fail(401, 'Authentication required.');
    const workspace = await getWorkspaceForUser(user);
    companyIds = workspace
      .filter((w) => hasPermission(w.permissions, 'hiring:read'))
      .map((w) => w.company.id);
  }
  if (!companyIds.length) return ok({ openings: [] });

  const openings: JobOpening[] = await db.jobOpening.findMany({
    where: {
      companyId: { in: companyIds },
      ...(!includeArchived && {
        status: { notIn: [JOB_OPENING_STATUS.ARCHIVED] },
      }),
    },
    orderBy: { createdAt: 'desc' },
  });
  const counts = await countByStage(openings.map((o) => o.id));

  return ok({
    openings: openings.map((o) => ({
      ...o,
      counts: counts[o.id] ?? emptyStageCounts(),
    })),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const companyId = typeof body.companyId === 'string' ? body.companyId : '';
  const { response, user } = await requireCompanyPermission(
    companyId,
    'hiring:create',
  );
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const { data, error } = parseOpeningInput({
    status: JOB_OPENING_STATUS.DRAFT,
    fields: [],
    ...body,
  });
  if (error) return fail(400, error);
  if (!data.title) return fail(400, 'Give the opening a title.');
  const leadProblem = await hiringLeadProblem(companyId, data.hiringLeadId);
  if (leadProblem) return fail(400, leadProblem);

  const now = nowIso();
  const opening = await db.jobOpening.create({
    data: {
      companyId,
      title: data.title,
      slug: await uniqueOpeningSlug(data.title),
      department: data.department ?? null,
      location: data.location ?? null,
      employmentType: data.employmentType ?? null,
      description: data.description ?? null,
      details: data.details ?? null,
      notes: data.notes ?? null,
      status: data.status,
      fields: data.fields ?? [],
      task: data.task ?? null,
      hiringLeadId: data.hiringLeadId ?? null,
      createdById: user.id,
      publishedAt: null,
      closedAt: null,
      ...statusTimestamps(data.status),
      createdAt: now,
      updatedAt: now,
    },
  });
  return ok(
    { opening: { ...opening, counts: emptyStageCounts() } },
    { status: 201 },
  );
}
