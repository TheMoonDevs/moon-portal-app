import dayjs from 'dayjs';

import { db } from '@/lib/mongodb/db-client';
import { workScore } from '@/lib/progress/buff';
import { workInRange } from '@/lib/progress/server';
import {
  fail,
  getWorkspaceForUser,
  ok,
  requireUser,
} from '@/lib/workspace/server';
import type { PointEntry } from '@/models/progress';

export const dynamic = 'force-dynamic';

/** How far back the points that order the user's companies reach. */
const WINDOW_DAYS = 90;

/**
 * The signed-in user's points in each of their companies over the last 90
 * days, counted as on the leaderboard (finished tasks in the ledger plus a
 * point for each day of work on one of the company's tasks). The home page
 * orders its company tabs by these, and each company's projects by the
 * user's points in them: `{ points: { [companyId]: n }, projects: { [projectId]: n } }`.
 */
export async function GET() {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const companies = await getWorkspaceForUser(user);
  const companyIds = companies.map((c) => c.company.id);
  const to = dayjs().format('YYYY-MM-DD');
  const from = dayjs().subtract(WINDOW_DAYS, 'day').format('YYYY-MM-DD');

  const [entries, work] = await Promise.all([
    companyIds.length
      ? (db.pointEntry.findMany({
          where: {
            userId: user.id,
            companyId: { in: companyIds },
            date: { gte: from, lte: to },
          },
        }) as Promise<PointEntry[]>)
      : Promise.resolve([] as PointEntry[]),
    workInRange([user.id], from, to),
  ]);

  const points: Record<string, number> = {};
  for (const companyId of companyIds) {
    // The company's tasks and unplaced ones, as the leaderboard counts them.
    const tasks = new Map(
      Array.from(work.tasks).filter(
        ([, t]) => t.companyId === companyId || !t.companyId,
      ),
    );
    const ledger = entries
      .filter((e) => e.companyId === companyId)
      .reduce((sum, e) => sum + (e.points || 0), 0);
    points[companyId] = ledger + workScore(work.points, tasks).taskDays;
  }

  // Per project: finished tasks in the ledger plus days of work on its tasks.
  const projects: Record<string, number> = {};
  for (const e of entries) {
    if (e.projectId)
      projects[e.projectId] = (projects[e.projectId] ?? 0) + (e.points || 0);
  }
  const projectIds = new Set(
    Array.from(work.tasks.values())
      .map((t) => t.projectId)
      .filter(Boolean),
  );
  projectIds.forEach((projectId) => {
    const tasks = new Map(
      Array.from(work.tasks).filter(([, t]) => t.projectId === projectId),
    );
    projects[projectId] =
      (projects[projectId] ?? 0) + workScore(work.points, tasks).taskDays;
  });

  return ok({ points, projects });
}
