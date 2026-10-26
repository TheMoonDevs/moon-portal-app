import type { NextRequest } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { toDay } from '@/lib/workspace/projects';
import {
  fail,
  nowIso,
  ok,
  requireCompanyPermission,
  requireProjectPermission,
} from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/** Result readings of a project (`?projectId=`) or a company (`?companyId=`). */
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  const companyId = request.nextUrl.searchParams.get('companyId');
  if (projectId) {
    const { response } = await requireProjectPermission(
      projectId,
      'projects:read',
    );
    if (response) return response;
  } else {
    const { response } = await requireCompanyPermission(
      companyId,
      'projects:read',
    );
    if (response) return response;
  }
  const results = await db.projectResult.findMany({
    where: projectId ? { projectId } : { companyId },
    orderBy: { date: 'desc' },
  });
  return ok({ results });
}

/** Record a reading, e.g. `{ projectId, metric: 'subscribers', value: 1200 }`. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  if (!projectId) return fail(400, 'projectId is required.');
  const { response, user, project } = await requireProjectPermission(
    projectId,
    'projects:edit',
  );
  if (response || !user || !project)
    return response ?? fail(401, 'Authentication required.');

  const metric =
    typeof body.metric === 'string'
      ? body.metric.trim().toLowerCase().slice(0, 40)
      : '';
  if (!metric) return fail(400, 'Pick what you are measuring.');
  const value = Number(body.value);
  if (!Number.isFinite(value)) return fail(400, 'Enter a number.');
  const date =
    typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : toDay();

  const now = nowIso();
  const result = await db.projectResult.create({
    data: {
      companyId: project.companyId,
      projectId: project.id,
      metric,
      value,
      date,
      note:
        typeof body.note === 'string' && body.note.trim()
          ? body.note.trim().slice(0, 300)
          : null,
      createdById: user.id,
      createdAt: now,
      updatedAt: now,
    },
  });
  return ok({ result }, { status: 201 });
}
