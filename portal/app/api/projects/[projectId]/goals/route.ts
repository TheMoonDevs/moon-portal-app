import { addGoal } from '@/lib/workspace/goals';
import { fail, ok, requireProjectPermission } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string } };

/** Adds a goal to the project: `{ goal }`. */
export async function POST(request: Request, { params }: Params) {
  const { response, project, user } = await requireProjectPermission(
    params.projectId,
    'projects:edit',
  );
  if (response || !project || !user)
    return response ?? fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  if (typeof body.goal?.title !== 'string' || !body.goal.title.trim())
    return fail(400, 'Give the goal a title.');
  const { goal } = await addGoal(project, body.goal, user.id);
  return ok({ goal }, { status: 201 });
}
