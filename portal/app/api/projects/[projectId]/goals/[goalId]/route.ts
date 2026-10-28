import { changeGoal, removeGoal } from '@/lib/workspace/goals';
import { fail, ok, requireProjectPermission } from '@/lib/workspace/server';
import type { Project } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; goalId: string } };

/** Changes one goal: `{ goal }` holds the fields to change. */
export async function PATCH(request: Request, { params }: Params) {
  const { response, project, user } = await requireProjectPermission(
    params.projectId,
    'projects:edit',
  );
  if (response || !project || !user)
    return response ?? fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  const goal = await changeGoal(
    project,
    params.goalId,
    body.goal ?? {},
    user.id,
  );
  if (!goal) return fail(404, 'That goal is gone. Refresh and try again.');
  return ok({ goal });
}

/** Removes the goal. Its tasks stay; they stop counting towards it. */
export async function DELETE(_request: Request, { params }: Params) {
  const { response, project, user } = await requireProjectPermission(
    params.projectId,
    'projects:edit',
  );
  if (response || !project || !user)
    return response ?? fail(401, 'Authentication required.');
  if (!((project as Project).goals ?? []).some((g) => g.id === params.goalId))
    return fail(404, 'That goal is gone. Refresh and try again.');
  await removeGoal(project, params.goalId, user.id);
  return ok({ removed: params.goalId });
}
