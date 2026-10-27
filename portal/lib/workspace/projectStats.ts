import { db } from '@/lib/mongodb/db-client';
import type { Project, ProjectResult, Task } from '@/models/workspace';

import { tallyRowsFor } from './goalTally';
import type { DoneTask } from './projects';
import {
  goalHistory,
  goalProgress,
  metricsWithData,
  rankProjects,
  toDay,
} from './projects';
import { summarizeTasks } from './server';

const EMPTY_PROGRESS = {
  total: 0,
  done: 0,
  major: 0,
  majorDone: 0,
  percent: 0,
};

/**
 * Adds task progress, goal progress and result standings to projects.
 * Standings rank each project against the other projects of its company.
 */
export async function withProjectStats(projects: Project[]) {
  if (!projects.length) return [];
  const projectIds = projects.map((p) => p.id);
  const companyIds = Array.from(new Set(projects.map((p) => p.companyId)));

  const [tasks, results, tallies] = await Promise.all([
    db.task.findMany({
      where: { projectId: { in: projectIds } },
      select: {
        projectId: true,
        status: true,
        size: true,
        goalId: true,
        goalPartId: true,
        forDate: true,
        completedAt: true,
      },
    }) as Promise<Task[]>,
    // Every project of these companies takes part in the ranking.
    db.projectResult.findMany({
      where: { companyId: { in: companyIds } },
      select: {
        companyId: true,
        projectId: true,
        metric: true,
        value: true,
        date: true,
      },
    }) as Promise<ProjectResult[]>,
    tallyRowsFor(projectIds),
  ]);
  const progress = summarizeTasks(tasks);

  const standingsByCompany = new Map<
    string,
    Record<string, ReturnType<typeof rankProjects>>
  >();
  for (const companyId of companyIds) {
    const mine = results.filter((r) => r.companyId === companyId);
    standingsByCompany.set(
      companyId,
      Object.fromEntries(
        metricsWithData(mine).map((m) => [m, rankProjects(mine, m)]),
      ),
    );
  }

  return projects.map((p) => {
    const byMetric = standingsByCompany.get(p.companyId) ?? {};
    const standings = Object.entries(byMetric)
      .map(([metric, rows]) => {
        const row = rows.find((r) => r.projectId === p.id);
        return row ? { metric, of: rows.length, ...row } : null;
      })
      .filter(Boolean);
    const goalIds = new Set((p.goals ?? []).map((g) => g.id));
    // Done tasks and progress added by hand.
    const mine: DoneTask[] = [
      ...tasks.filter((t) => t.projectId === p.id),
      ...tallies.filter((t) => goalIds.has(t.goalId ?? '')),
    ];
    const created = p.createdAt ? toDay(new Date(p.createdAt as string)) : null;
    return {
      ...p,
      progress: progress[p.id] ?? EMPTY_PROGRESS,
      goalProgress: goalProgress(p.goals ?? [], mine),
      goalHistory: Object.fromEntries(
        (p.goals ?? []).map((g) => [
          g.id,
          goalHistory(g, mine, 6, toDay(), g.since ?? created),
        ]),
      ),
      standings,
    };
  });
}
