import dayjs from 'dayjs';

import { workScore } from '@/lib/progress/buff';
import { workInRange } from '@/lib/progress/server';
import { fail, ok, requireUser } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * The caller's score for a month (`?month=YYYY-MM`, this month by default),
 * from their tasks and work points: what the worklog page's level card shows.
 */
export async function GET(request: Request) {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  const param = new URL(request.url).searchParams.get('month');
  if (param && !/^\d{4}-\d{2}$/.test(param))
    return fail(400, 'Use YYYY-MM for the month.');
  const month = dayjs(param ? `${param}-01` : undefined).startOf('month');
  const { points, tasks } = await workInRange(
    [user.id],
    month.format('YYYY-MM-DD'),
    month.endOf('month').format('YYYY-MM-DD'),
  );
  return ok({ month: month.format('YYYY-MM'), ...workScore(points, tasks) });
}
