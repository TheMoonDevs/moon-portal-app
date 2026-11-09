import type { NextRequest } from 'next/server';

import { buildFunnel } from '@/lib/hiring/funnel';
import { db } from '@/lib/mongodb/db-client';
import { fail, ok, requireCompanyPermission } from '@/lib/workspace/server';
import type { JobApplication, JobOpening } from '@/models/hiring';
import { JOB_OPENING_STATUS } from '@/models/hiring';

export const dynamic = 'force-dynamic';

/**
 * The funnel and stage timing for each of the company's openings
 * (`?companyId=`), archived ones only with `?archived=1`.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const companyId = params.get('companyId');
  const { response, user } = await requireCompanyPermission(
    companyId,
    'hiring:read',
  );
  if (response || !user || !companyId)
    return response ?? fail(401, 'Authentication required.');
  const withArchived = params.get('archived') === '1';

  const openings: Array<Pick<JobOpening, 'id' | 'title' | 'status'>> =
    await db.jobOpening.findMany({
      where: withArchived
        ? { companyId }
        : { companyId, status: { not: JOB_OPENING_STATUS.ARCHIVED } },
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  if (!openings.length) return ok({ openings: [] });

  const applications: JobApplication[] = await db.jobApplication.findMany({
    where: { companyId, openingId: { in: openings.map((o) => o.id) } },
  });
  const byOpening = new Map<string, JobApplication[]>();
  for (const a of applications)
    byOpening.set(a.openingId, [...(byOpening.get(a.openingId) ?? []), a]);

  return ok({
    openings: openings.map((o) => ({
      id: o.id,
      title: o.title,
      status: o.status,
      funnel: buildFunnel(byOpening.get(o.id) ?? []),
    })),
  });
}
