import { AssignError, assignTask } from '@/lib/daywork/assign';
import { db } from '@/lib/mongodb/db-client';
import { fail, ok, requireProjectPermission } from '@/lib/workspace/server';
import type { Task } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { taskId: string } };

/**
 * Gives a task to someone in its company: `{userId, note?, keep?}`. Without
 * `keep` it is shifted to them (off the caller's day); with it they are
 * added and the caller stays on it. They get a notification either way.
 */
export async function POST(request: Request, { params }: Params) {
  const task: Task | null = await db.task.findFirst({
    where: { id: params.taskId },
  });
  if (!task) return fail(404, 'Task not found.');
  if (!task.projectId)
    return fail(
      400,
      'Put the task in a project first, then it can be given to someone.',
    );
  const { response, user } = await requireProjectPermission(
    task.projectId,
    'tasks:edit',
  );
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === 'string' ? body.userId : '';
  if (!userId) return fail(400, 'Pick who to give it to.');
  try {
    const updated = await assignTask(task, user, {
      userId,
      note: typeof body.note === 'string' ? body.note : '',
      keep: body.keep === true,
    });
    return ok({ task: updated });
  } catch (e) {
    if (e instanceof AssignError) return fail(e.status, e.message);
    throw e;
  }
}
