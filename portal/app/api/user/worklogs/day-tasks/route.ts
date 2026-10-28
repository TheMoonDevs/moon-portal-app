import { NextResponse } from 'next/server';

import { enforcePermission, getSessionUser } from '@/lib/permissions/server';
import { addTasksToDay } from '@/lib/worklogs/dayTasks';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

const fail = (status: number, error: string) =>
  NextResponse.json({ status: 'fail', error }, { status });

/**
 * Puts tasks on the caller's worklog for a day, as points linked to them:
 * `{ date, taskIds }` for the ones they picked, or `{ date, due: true }` for
 * their open tasks for that day. Only from a week back to two weeks ahead.
 */
export async function POST(request: Request) {
  const denied = await enforcePermission('worklogs:edit');
  if (denied) return denied;
  const user = await getSessionUser();
  if (!user) return fail(401, 'Authentication required.');

  const body = await request.json().catch(() => ({}));
  const date = body?.date;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return fail(400, 'date is required.');
  const offset = (Date.parse(`${date}T12:00:00Z`) - Date.now()) / DAY_MS;
  if (offset < -8 || offset > 15)
    return fail(400, 'Tasks go on a day from a week back to two weeks ahead.');
  const taskIds = Array.isArray(body?.taskIds)
    ? body.taskIds.filter(
        (id: unknown): id is string =>
          typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id),
      )
    : [];
  if (!taskIds.length && body?.due !== true)
    return fail(400, 'Name the tasks, or ask for the ones due.');

  const result = await addTasksToDay(user.id, date, {
    taskIds,
    due: body?.due === true,
  });
  return NextResponse.json({ status: 'success', data: result });
}
