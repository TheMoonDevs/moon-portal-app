import { db } from '@/lib/mongodb/db-client';
import { syncTaskPoints } from '@/lib/progress/server';
import {
  asStringArray,
  fail,
  goalLink,
  nowIso,
  ok,
  pick,
  requireCompanyPermission,
} from '@/lib/workspace/server';
import type { Task } from '@/models/workspace';
import { TASK_SIZE, TASK_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { taskId: string } };

const EDITABLE = [
  'title',
  'description',
  'size',
  'status',
  'assigneeIds',
  'dueDate',
  'goalId',
  'goalPartId',
] as const;

async function guard(taskId: string, permission: string) {
  const task: Task | null = await db.task.findFirst({ where: { id: taskId } });
  if (!task) return { response: fail(404, 'Task not found.'), task: null };
  const { response } = await requireCompanyPermission(
    task.companyId,
    permission,
  );
  return { response, task };
}

export async function PATCH(request: Request, { params }: Params) {
  const { response, task } = await guard(params.taskId, 'tasks:edit');
  if (response || !task)
    return response ?? fail(401, 'Authentication required.');

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = pick(body, EDITABLE);

  if ('title' in data) {
    const title = typeof data.title === 'string' ? data.title.trim() : '';
    if (!title) return fail(400, 'Task title is required.');
    data.title = title;
  }
  if (
    'size' in data &&
    !Object.values(TASK_SIZE).includes(data.size as TASK_SIZE)
  ) {
    return fail(400, 'Unknown task size.');
  }
  if ('status' in data) {
    if (!Object.values(TASK_STATUS).includes(data.status as TASK_STATUS)) {
      return fail(400, 'Unknown task status.');
    }
    const nowDone = data.status === TASK_STATUS.DONE;
    if (nowDone && task.status !== TASK_STATUS.DONE)
      data.completedAt = nowIso();
    if (!nowDone) data.completedAt = null;
  }
  if ('assigneeIds' in data) data.assigneeIds = asStringArray(data.assigneeIds);
  if ('dueDate' in data) data.dueDate = data.dueDate || null;
  if ('goalId' in data || 'goalPartId' in data) {
    const project = await db.project.findFirst({
      where: { id: task.projectId },
    });
    Object.assign(
      data,
      goalLink(project, {
        goalId: 'goalId' in data ? data.goalId : task.goalId,
        goalPartId: 'goalPartId' in data ? data.goalPartId : task.goalPartId,
      }),
    );
  }

  const updated = await db.task.update({
    where: { id: task.id },
    data: { ...data, updatedAt: nowIso() },
  });
  await syncTaskPoints(updated);
  return ok({ task: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { response, task } = await guard(params.taskId, 'tasks:delete');
  if (response || !task)
    return response ?? fail(401, 'Authentication required.');
  await db.task.delete({ where: { id: task.id } });
  await syncTaskPoints(null, task.id);
  return ok({ task });
}
