import { isDay, loadDays } from '@/lib/daywork/server';
import { fail, ok, requireUser } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/** Most days asked for at once. */
const MAX_DAYS = 62;

/**
 * The caller's days from `?from=` to `?to=` (YYYY-MM-DD): each day's task
 * lines, for the list of days beside the open one.
 */
export async function GET(request: Request) {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  const search = new URL(request.url).searchParams;
  const from = search.get('from');
  const to = search.get('to');
  if (!isDay(from) || !isDay(to) || from > to)
    return fail(400, 'Use YYYY-MM-DD for from and to.');
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > MAX_DAYS)
    return fail(400, `At most ${MAX_DAYS} days at once.`);
  return ok({ from, to, days: await loadDays(user.id, from, to) });
}
