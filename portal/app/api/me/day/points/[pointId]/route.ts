import { isMine, moveTask, renderDays } from '@/lib/daywork/server';
import { db } from '@/lib/mongodb/db-client';
import { fail, ok, requireUser } from '@/lib/workspace/server';
import type { Task, WorkPoint } from '@/models/workspace';
import { TASK_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { pointId: string } };

/**
 * Moves one of the caller's work points under another of their tasks:
 * `{taskId}`. A task a bot made just for it, with nothing else logged on
 * it, is archived.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  const point: WorkPoint | null = await db.workPoint.findFirst({
    where: { id: params.pointId },
  });
  if (!point || point.userId !== user.id)
    return fail(404, 'Work point not found.');
  const body = await request.json().catch(() => ({}));
  const [from, to]: (Task | null)[] = await Promise.all([
    db.task.findFirst({ where: { id: point.taskId } }),
    typeof body.taskId === 'string'
      ? db.task.findFirst({ where: { id: body.taskId } })
      : null,
  ]);
  if (!to || !isMine(to, user.id)) return fail(404, 'Task not found.');
  if (to.id === point.taskId) return ok({ point });

  const moved: WorkPoint = await db.workPoint.update({
    where: { id: point.id },
    data: {
      taskId: to.id,
      isPrivate:
        !to.projectId && (!to.companyId || to.companyId === 'personal'),
      updatedAt: new Date().toISOString(),
    },
  });
  // A status it carried now speaks for its new task.
  if (point.status)
    await moveTask(to, point.status, {
      userId: user.id,
      by: point.by,
      date: point.date,
      note: '',
    });
  if (
    from &&
    from.madeBy &&
    from.madeBy !== 'person' &&
    from.status !== TASK_STATUS.ARCHIVED &&
    !(await db.workPoint.count({ where: { taskId: from.id } }))
  )
    await moveTask(from, 'archived', {
      userId: user.id,
      note: `Its work moved to "${to.title}"`,
      date: point.date,
    });
  await renderDays(user.id, [point.date]);
  return ok({ point: moved });
}
