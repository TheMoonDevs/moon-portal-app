import { NextResponse } from 'next/server';

import { moveTask } from '@/lib/daywork/server';
import { db } from '@/lib/mongodb/db-client';
import { enforcePermission, getSessionUser } from '@/lib/permissions/server';
import { setPointStatus } from '@/lib/worklogs/points';
import type { PointStatus } from '@/lib/worklogs/timeline';
import { POINT_STATUSES } from '@/lib/worklogs/timeline';
import type { WorkLogs } from '@/models/worklogs';
import type { Task } from '@/models/workspace';

export const dynamic = 'force-dynamic';

const fail = (status: number, error: string) =>
  NextResponse.json({ status: 'fail', error }, { status });

/**
 * One click on a work point's status: `{ key, status }` with the day as
 * `worklogId` (the worklog screen) or `date` (the user page). The line's
 * emoji and its timeline both change; returns the saved worklog.
 */
export async function PATCH(request: Request) {
  const denied = await enforcePermission('worklogs:edit');
  if (denied) return denied;
  const user = await getSessionUser();
  if (!user) return fail(401, 'Authentication required.');

  const body = await request.json().catch(() => ({}));
  const { key, status, worklogId, date } = body ?? {};
  if (typeof key !== 'string' || !key) return fail(400, 'key is required.');
  if (!(status in POINT_STATUSES)) return fail(400, 'Unknown status.');
  const hasId = typeof worklogId === 'string' && worklogId.length > 2;
  const hasDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
  if (!hasId && !hasDate) return fail(400, 'worklogId or date is required.');

  // A day kept as tasks: the point is a task, and the task moves.
  const log: WorkLogs | null = hasId
    ? await db.workLogs.findFirst({ where: { id: worklogId } })
    : await db.workLogs.findFirst({
        where: { userId: user.id, logType: 'dayLog', date },
        orderBy: { updatedAt: 'desc' },
      });
  if (log?.tasksFirst) {
    if (log.userId !== user.id)
      return fail(403, 'You can only change your own work points.');
    const taskId = (log.links ?? []).find((l) => l.key === key)?.taskId;
    const task: Task | null = taskId
      ? await db.task.findFirst({ where: { id: taskId } })
      : null;
    if (!task)
      return fail(404, 'That point has changed. Refresh and try again.');
    await moveTask(task, status as PointStatus, {
      userId: user.id,
      date: log.date ?? undefined,
    });
    return NextResponse.json({
      status: 'success',
      data: {
        workLogs: await db.workLogs.findFirst({ where: { id: log.id } }),
      },
    });
  }
  const result = await setPointStatus(
    user.id,
    hasId ? { worklogId } : { date },
    key,
    status as PointStatus,
  );
  if ('error' in result) return fail(result.status ?? 400, result.error!);
  return NextResponse.json({
    status: 'success',
    data: { workLogs: result.worklog },
  });
}
