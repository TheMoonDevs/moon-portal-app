import type { NextRequest } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import {
  asStringArray,
  fail,
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

  const tasks = await db.task.findMany({
    where: {
      ...(projectId ? { projectId } : { companyId }),
      ...(assigneeId && { assigneeIds: assigneeId }),
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
  const now = nowIso();
  const task = await db.task.create({
    data: {
      companyId: project.companyId,
      projectId: project.id,
      title,
      description: body.description ?? null,
      size: body.size === TASK_SIZE.MAJOR ? TASK_SIZE.MAJOR : TASK_SIZE.MINOR,
      status,
      assigneeIds: asStringArray(body.assigneeIds),
      dueDate: body.dueDate ?? null,
      completedAt: status === TASK_STATUS.DONE ? now : null,
      createdById: user.id,
      createdAt: now,
      updatedAt: now,
    },
  });
  return ok({ task }, { status: 201 });
}
