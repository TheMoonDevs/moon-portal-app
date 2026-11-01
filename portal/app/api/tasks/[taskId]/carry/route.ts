import { db } from '@/lib/mongodb/db-client';
import {
  cannotCarry,
  carryGoalTask,
  mergeTargets,
} from '@/lib/workspace/goalCarry';
import {
  asDay,
  fail,
  ok,
  requireProjectPermission,
} from '@/lib/workspace/server';
import type { Task } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { taskId: string } };

/*
 * An overdue goal task, carried on: GET lists the later tasks of its goal
 * it can merge into; POST moves it to another day ({ mode: 'move', day })
 * or merges it into one of them ({ mode: 'merge', intoId }). Either way
 * the goal missed the task's day.
 */

async function guard(taskId: string) {
  const task: Task | null = await db.task.findFirst({ where: { id: taskId } });
  if (!task || !task.projectId)
    return { response: fail(404, 'Task not found.'), task: null, user: null };
  const { response, user } = await requireProjectPermission(
    task.projectId,
    'tasks:edit',
  );
  return { response, task, user };
}

export async function GET(_request: Request, { params }: Params) {
  const { response, task } = await guard(params.taskId);
  if (response || !task) return response ?? fail(404, 'Task not found.');
  const targets = await mergeTargets(task);
  return ok({
    targets: targets.map((t) => ({
      id: t.id,
      title: t.title,
      forDate: t.forDate,
    })),
  });
}

export async function POST(request: Request, { params }: Params) {
  const { response, task, user } = await guard(params.taskId);
  if (response || !task || !user)
    return response ?? fail(401, 'Authentication required.');
  const why = cannotCarry(task);
  if (why) return fail(400, why);

  const body = await request.json().catch(() => ({}));
  try {
    if (body.mode === 'move') {
      const day = asDay(body.day);
      if (!day) return fail(400, 'Pick the day to move it to.');
      if (day === task.forDate) return fail(400, 'Pick another day.');
      return ok(await carryGoalTask(task, user.id, { mode: 'move', day }));
    }
    if (body.mode === 'merge') {
      const intoId = typeof body.intoId === 'string' ? body.intoId : '';
      if (!intoId) return fail(400, 'Pick the task to merge it into.');
      return ok(await carryGoalTask(task, user.id, { mode: 'merge', intoId }));
    }
    return fail(400, 'Move it to a day, or merge it into a later task.');
  } catch (err) {
    return fail(400, err instanceof Error ? err.message : 'Could not move it.');
  }
}
