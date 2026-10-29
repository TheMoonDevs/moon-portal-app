import type { TaskMove } from '@/lib/daywork/server';
import {
  isDay,
  isMine,
  moveTask,
  placeByWords,
  placeFields,
  readPlace,
  renderDays,
  TASK_MOVES,
  todayOf,
} from '@/lib/daywork/server';
import { db } from '@/lib/mongodb/db-client';
import { syncTaskPoints } from '@/lib/progress/server';
import { linkCandidates } from '@/lib/worklogs/linker';
import { fail, ok, requireUser } from '@/lib/workspace/server';
import type { Task } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { taskId: string } };

async function ownTask(taskId: string) {
  const { response, user } = await requireUser();
  if (response || !user)
    return { response: response ?? fail(401, 'Authentication required.') };
  const task: Task | null = await db.task.findFirst({ where: { id: taskId } });
  if (!task) return { response: fail(404, 'Task not found.') };
  if (!isMine(task, user.id))
    return {
      response: fail(403, 'Only tasks on your own day can be changed here.'),
    };
  return { user, task };
}

/**
 * Changes a task on the caller's day: `{title?, status?, note?, place?,
 * forDate?}`. A new title places it again from its words unless a person
 * picked its place.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { response, user, task } = await ownTask(params.taskId);
  if (response || !user || !task) return response;
  const body = await request.json().catch(() => ({}));

  const data: Partial<Task> = {};
  if (typeof body.title === 'string')
    data.title = body.title.trim().slice(0, 200);
  if ('forDate' in body) {
    if (body.forDate !== null && !isDay(body.forDate))
      return fail(400, 'Use YYYY-MM-DD for the date.');
    data.forDate = body.forDate;
  }
  const candidates =
    body.place || data.title !== undefined ? await linkCandidates(user) : null;
  const place = readPlace(body.place);
  if (place && candidates) {
    const fields = placeFields(place, candidates);
    if (!fields) return fail(400, 'You are not on that project.');
    Object.assign(data, fields);
  }
  let updated = task;
  if (Object.keys(data).length) {
    updated = await db.task.update({
      where: { id: task.id },
      data: { ...data, updatedAt: new Date().toISOString() },
    });
    if (data.title !== undefined && !place && candidates)
      [updated] = await placeByWords([updated], candidates);
    // Its points follow it to its new project.
    if (
      updated.projectId !== task.projectId ||
      updated.companyId !== task.companyId
    ) {
      await syncTaskPoints(updated.projectId ? updated : null, updated.id);
      await db.workPoint.updateMany({
        where: { taskId: task.id },
        data: {
          isPrivate:
            !updated.projectId &&
            (!updated.companyId || updated.companyId === 'personal'),
        },
      });
    }
  }
  if (TASK_MOVES.includes(body.status))
    updated = await moveTask(updated, body.status as TaskMove, {
      userId: user.id,
      note: typeof body.note === 'string' ? body.note : undefined,
    });
  else
    await renderDays(user.id, [
      await todayOf(user.id),
      task.forDate,
      updated.forDate,
    ]);
  return ok({ task: updated });
}

/**
 * Takes a task off the day for good: only one with nothing logged on it
 * yet, e.g. a line just written by mistake. Anything else is archived.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const { response, user, task } = await ownTask(params.taskId);
  if (response || !user || !task) return response;
  if (task.ownerId !== user.id)
    return fail(403, 'Only tasks you wrote can be taken out. Archive it.');
  const logged = await db.workPoint.count({ where: { taskId: task.id } });
  if (logged || task.status !== 'TODO')
    return fail(409, 'This task has work on it. Archive it instead.');
  await db.task.delete({ where: { id: task.id } });
  await renderDays(user.id, [await todayOf(user.id), task.forDate]);
  return ok({ task });
}
