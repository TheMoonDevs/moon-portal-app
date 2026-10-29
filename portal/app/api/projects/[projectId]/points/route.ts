import dayjs from 'dayjs';
import type { NextRequest } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import {
  fail,
  getPublicUsers,
  ok,
  requireProjectPermission,
} from '@/lib/workspace/server';
import type { Task, WorkPoint } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string } };

const MAX_DAYS = 365;

/**
 * The work points logged on the project's tasks over the last `?days=` (90
 * by default), oldest first, with the people on its tasks and points.
 * Worklogs and tasks are one thing now: a worklog is the points under a
 * task. Private points only show to whoever wrote them.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { response, project, user } = await requireProjectPermission(
    params.projectId,
    'projects:read',
  );
  if (response || !project || !user)
    return response ?? fail(401, 'Authentication required.');

  const asked = Number(request.nextUrl.searchParams.get('days'));
  const days = Math.min(MAX_DAYS, Math.max(1, asked || 90));
  const from = dayjs()
    .subtract(days - 1, 'day')
    .format('YYYY-MM-DD');

  const tasks: Task[] = await db.task.findMany({
    where: { projectId: project.id },
    select: { id: true, assigneeIds: true, completedByIds: true },
  });
  const points: WorkPoint[] = tasks.length
    ? await db.workPoint.findMany({
        where: { taskId: { in: tasks.map((t) => t.id) }, date: { gte: from } },
        orderBy: { at: 'asc' },
        take: 5000,
      })
    : [];
  const visible = points
    .filter((p) => !p.isPrivate || p.userId === user.id)
    .map((p) => ({
      id: p.id,
      taskId: p.taskId,
      userId: p.userId,
      date: p.date,
      text: p.text,
      status: p.status ?? null,
      by: p.by,
      at: p.at,
    }));

  const users = await getPublicUsers(
    Array.from(
      new Set([
        ...visible.map((p) => p.userId as string),
        ...tasks.flatMap((t) => [
          ...(t.assigneeIds ?? []),
          ...(t.completedByIds ?? []),
        ]),
      ]),
    ),
  );
  return ok({ from, days, points: visible, users });
}
