import type { TaskMove } from '@/lib/daywork/server';
import {
  addPoint,
  isDay,
  isMine,
  moveTask,
  renderDays,
  TASK_MOVES,
  todayOf,
} from '@/lib/daywork/server';
import { db } from '@/lib/mongodb/db-client';
import { fail, ok, requireUser } from '@/lib/workspace/server';
import type { Task } from '@/models/workspace';

export const dynamic = 'force-dynamic';

/**
 * Logs a work point under one of the caller's tasks: `{taskId, text,
 * status?, date?}`. A status moves the task too.
 */
export async function POST(request: Request) {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  const task: Task | null =
    typeof body.taskId === 'string'
      ? await db.task.findFirst({ where: { id: body.taskId } })
      : null;
  if (!task) return fail(404, 'Task not found.');
  if (!isMine(task, user.id))
    return fail(403, 'Only your own tasks can be logged on here.');
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const date = isDay(body.date) ? body.date : await todayOf(user.id);
  if (TASK_MOVES.includes(body.status)) {
    const moved = await moveTask(task, body.status as TaskMove, {
      userId: user.id,
      note: text,
      date,
    });
    return ok({ task: moved });
  }
  if (!text) return fail(400, 'Write what happened.');
  const point = await addPoint({ task, userId: user.id, date, text });
  await renderDays(user.id, [date]);
  return ok({ point, task });
}
