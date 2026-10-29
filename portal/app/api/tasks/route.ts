import type { NextRequest } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { syncTaskPoints } from '@/lib/progress/server';
import { fitGoal } from '@/lib/workspace/goalFit';
import { runDueSchedules } from '@/lib/workspace/schedules';
import {
  asDay,
  asStringArray,
  fail,
  goalLink,
  nowIso,
  ok,
  requireCompanyPermission,
  requireProjectPermission,
} from '@/lib/workspace/server';
import { TASK_SIZE, TASK_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

/** Tasks of a project (`?projectId=`) or of a whole company (`?companyId=`). */
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  const companyId = request.nextUrl.searchParams.get('companyId');
  const assigneeId = request.nextUrl.searchParams.get('assigneeId');
  const includeArchived =
    request.nextUrl.searchParams.get('includeArchived') === 'true';

  if (projectId) {
    const { response } = await requireProjectPermission(
      projectId,
      'tasks:read',
    );
    if (response) return response;
  } else {
    const { response } = await requireCompanyPermission(
      companyId,
      'tasks:read',
    );
    if (response) return response;
  }

  if (projectId) await runDueSchedules({ projectId: { in: [projectId] } });
  const tasks = await db.task.findMany({
    where: {
      ...(projectId ? { projectId } : { companyId }),
      ...(assigneeId && { assigneeIds: assigneeId }),
      ...(!includeArchived && { status: { notIn: [TASK_STATUS.ARCHIVED] } }),
    },
    orderBy: { createdAt: 'asc' },
  });
  return ok({ tasks });
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

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return fail(400, 'Task title is required.');

  const status = Object.values(TASK_STATUS).includes(body.status)
    ? body.status
    : TASK_STATUS.TODO;
  const forDate = asDay(body.forDate);
  if (forDate === undefined) return fail(400, 'Use YYYY-MM-DD for the date.');
  // A follow-up to a task of the same project.
  let followsId: string | null = null;
  if (typeof body.followsId === 'string' && body.followsId) {
    const previous = await db.task.findFirst({
      where: { id: body.followsId, projectId: project.id },
      select: { id: true },
    });
    if (!previous)
      return fail(400, 'A follow-up goes in the same project as its task.');
    followsId = previous.id;
  }
  const now = nowIso();
  let task = await db.task.create({
    data: {
      companyId: project.companyId,
      projectId: project.id,
      title,
      description: body.description ?? null,
      size: body.size === TASK_SIZE.MAJOR ? TASK_SIZE.MAJOR : TASK_SIZE.MINOR,
      status,
      assigneeIds: asStringArray(body.assigneeIds),
      dueDate: body.dueDate || null,
      forDate,
      ...goalLink(project, body),
      // A goal picked (or left empty) by hand is not looked for again.
      ...('goalId' in body && { goalChecked: true }),
      ...(followsId && { followsId }),
      completedAt: status === TASK_STATUS.DONE ? now : null,
      completedByIds: status === TASK_STATUS.DONE ? [user.id] : [],
      createdById: user.id,
      createdAt: now,
      updatedAt: now,
    },
  });
  task = await fitGoal(task);
  await syncTaskPoints(task);
  return ok({ task }, { status: 201 });
}
