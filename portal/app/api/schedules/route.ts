import type { NextRequest } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { requirePlan } from '@/lib/workspace/planServer';
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

  // Set up from a plan: the plan must be one they can edit, in this company.
  let planId: string | null = null;
  if (typeof body.planId === 'string' && body.planId) {
    const { response: denied, plan } = await requirePlan(body.planId, 'edit');
    if (denied || !plan) return denied ?? fail(404, 'Plan not found.');
    if (plan.companyId !== project.companyId)
      return fail(400, 'Pick a project in the plan’s company.');
    planId = plan.id;
  }

  const now = nowIso();
  const schedule = await db.taskSchedule.create({
    data: {
      ...data,
      companyId: project.companyId,
      projectId: project.id,
      planId,
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
