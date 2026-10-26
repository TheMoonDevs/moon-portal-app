import type { NextRequest } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { readScheduleBody } from '@/lib/workspace/scheduleInput';
import { runDueSchedules } from '@/lib/workspace/schedules';
import {
  fail,
  nowIso,
  ok,
  requireProjectPermission,
} from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/** Scheduled tasks of a project (`?projectId=`). */
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId') ?? '';
  if (!projectId) return fail(400, 'projectId is required.');
  const { response } = await requireProjectPermission(projectId, 'tasks:read');
  if (response) return response;
  const schedules = await db.taskSchedule.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  });
  return ok({ schedules });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  if (!projectId) return fail(400, 'projectId is required.');
  const { response, user, project } = await requireProjectPermission(
    projectId,
    'tasks:create',
  );
  if (response || !user || !project)
    return response ?? fail(401, 'Authentication required.');

  const { data, error } = readScheduleBody(body, project);
  if (error || !data) return fail(400, error ?? 'Invalid schedule.');

  const now = nowIso();
  const schedule = await db.taskSchedule.create({
    data: {
      ...data,
      companyId: project.companyId,
      projectId: project.id,
      lastRunOn: null,
      createdById: user.id,
      createdAt: now,
      updatedAt: now,
    },
  });
  // A schedule that runs today creates today's tasks straight away.
  await runDueSchedules({ projectId: { in: [project.id] } });
  return ok({ schedule }, { status: 201 });
}
