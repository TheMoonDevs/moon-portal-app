import { updateGoalProgress } from '@/lib/workspace/goalTally';
import { fail, ok, requireProjectPermission } from '@/lib/workspace/server';
import type { Project } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string } };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Adds to a goal's progress by hand, for work no task tracks:
 * `{ goalId, partId?, add }` (negative to take back) or `{ goalId, partId?,
 * done }` to set this period's total. `day` picks another period.
 */
export async function POST(request: Request, { params }: Params) {
  const { response, project, user } = await requireProjectPermission(
    params.projectId,
    'projects:edit',
  );
  if (response || !project || !user)
    return response ?? fail(401, 'Authentication required.');

  const body = await request.json().catch(() => ({}));
  const goal = ((project as Project).goals ?? []).find(
    (g) => g.id === body.goalId,
  );
  if (!goal) return fail(404, 'That goal is gone. Refresh and try again.');
  const part = goal.parts?.find((p) => p.id === body.partId);
  if (goal.parts?.length && !part)
    return fail(400, 'Pick which part of the goal to update.');
  const done = body.done == null ? NaN : Number(body.done);
  const add = body.add == null ? NaN : Number(body.add);
  if (!Number.isFinite(add) && !Number.isFinite(done))
    return fail(400, 'Say how much to add, or the new total.');
  if (body.day !== undefined && !DAY.test(String(body.day)))
    return fail(400, 'Use YYYY-MM-DD for the day.');

  const progress = await updateGoalProgress(project, user.id, {
    goal,
    partId: part?.id ?? null,
    ...(Number.isFinite(done) ? { done } : { add }),
    day: body.day,
  });
  return ok({ progress });
}
