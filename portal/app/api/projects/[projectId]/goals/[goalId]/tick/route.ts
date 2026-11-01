import { completeGoalUntil, tickGoalDay } from '@/lib/workspace/goalTicks';
import {
  asDay,
  fail,
  ok,
  requireProjectPermission,
} from '@/lib/workspace/server';
import type { Project } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; goalId: string } };

/**
 * Ticks a goal by hand, with or without a linked task: `{ day, done }`
 * ticks one day on or off; `{ until }` marks it done up to that day.
 */
export async function POST(request: Request, { params }: Params) {
  const { response, project, user } = await requireProjectPermission(
    params.projectId,
    'tasks:edit',
  );
  if (response || !project || !user)
    return response ?? fail(401, 'Authentication required.');
  const goal = ((project as Project).goals ?? []).find(
    (g) => g.id === params.goalId,
  );
  if (!goal) return fail(404, 'That goal is gone. Refresh and try again.');

  const body = await request.json().catch(() => ({}));
  if (body.until !== undefined) {
    const until = asDay(body.until);
    if (!until) return fail(400, 'Use YYYY-MM-DD for the day.');
    return ok(
      await completeGoalUntil(project as Project, goal, until, user.id),
    );
  }
  const day = asDay(body.day);
  if (!day) return fail(400, 'Pick the day to tick.');
  return ok(
    await tickGoalDay(
      project as Project,
      goal,
      day,
      body.done !== false,
      user.id,
    ),
  );
}
