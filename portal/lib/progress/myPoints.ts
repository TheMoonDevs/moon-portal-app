import dayjs from 'dayjs';

import { db } from '@/lib/mongodb/db-client';
import { workScore } from '@/lib/progress/buff';
import { workInRange } from '@/lib/progress/server';
import type { PointEntry } from '@/models/progress';

/** How far back the points that order a person's companies reach. */
export const RECENT_POINTS_DAYS = 90;

/**
 * A person's points over the last 90 days in each of the given companies
 * and in each project they worked on, counted as on the leaderboard:
 * finished tasks in the ledger plus a point for each day of work on a task
 * (unplaced tasks count for every company, as there). Companies are listed
 * everywhere by these, most first.
 */
export async function recentPoints(
  userId: string,
  companyIds: string[],
): Promise<{
  companies: Record<string, number>;
  projects: Record<string, number>;
}> {
  const to = dayjs().format('YYYY-MM-DD');
  const from = dayjs().subtract(RECENT_POINTS_DAYS, 'day').format('YYYY-MM-DD');

  const [entries, work] = await Promise.all([
    companyIds.length
      ? (db.pointEntry.findMany({
          where: {
            userId,
            companyId: { in: companyIds },
            date: { gte: from, lte: to },
          },
        }) as Promise<PointEntry[]>)
      : Promise.resolve([] as PointEntry[]),
    workInRange([userId], from, to),
  ]);

  const companies: Record<string, number> = {};
  for (const companyId of companyIds) {
    const tasks = new Map(
      Array.from(work.tasks).filter(
        ([, t]) => t.companyId === companyId || !t.companyId,
      ),
    );
    const ledger = entries
      .filter((e) => e.companyId === companyId)
      .reduce((sum, e) => sum + (e.points || 0), 0);
    companies[companyId] = ledger + workScore(work.points, tasks).taskDays;
  }

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

  return { companies, projects };
}

/** Sorts by a person's recent points in each company, most first (stable). */
export async function sortByRecentPoints<T>(
  userId: string,
  items: T[],
  companyIdOf: (item: T) => string,
): Promise<T[]> {
  if (items.length < 2) return items;
  const { companies } = await recentPoints(userId, items.map(companyIdOf));
  return [...items].sort(
    (a, b) =>
      (companies[companyIdOf(b)] ?? 0) - (companies[companyIdOf(a)] ?? 0),
  );
}
