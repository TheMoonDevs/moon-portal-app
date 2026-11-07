import { db } from '@/lib/mongodb/db-client';
import { hasPermission } from '@/lib/permissions/matching';
import type {
  CalendarGoal,
  CalendarTally,
  CalendarTask,
} from '@/lib/workspace/goalCalendar';
import {
  addDays,
  type DoneTask,
  goalProgress,
  periodRange,
  toDay,
} from '@/lib/workspace/projects';
import { runDueSchedules } from '@/lib/workspace/schedules';
import {
  fail,
  getPublicUsers,
  getWorkspaceForUser,
  ok,
  requireUser,
} from '@/lib/workspace/server';
import type { GoalTally, Project, Task } from '@/models/workspace';
import { PROJECT_STATUS, TASK_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** The longest stretch one call shows. */
const MAX_DAYS = 400;

const dayOf = (value: unknown) =>
  value ? toDay(new Date(value as string)) : null;

/**
 * Every goal of every project the caller can read, across their companies,
 * for the goals calendar: each goal with its progress now, and the tasks
 * and hand-added progress of `from` to `to` (YYYY-MM-DD, this month when
 * left out), plus enough on either side to count the periods they touch.
 * Projects come with their effort, so the page can filter by it, and
 * `done` counts the tasks finished in each project on each day of the range.
 */
export async function GET(request: Request) {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const url = new URL(request.url);
  const today = toDay();
  const month = periodRange('month', today);
  const from = url.searchParams.get('from') ?? month.from;
  const to = url.searchParams.get('to') ?? month.to;
  if (!DAY.test(from) || !DAY.test(to) || from > to)
    return fail(400, 'Use YYYY-MM-DD for from and to, from first.');
  if (to > addDays(from, MAX_DAYS))
    return fail(400, `Pick at most ${MAX_DAYS} days at a time.`);

  const workspace = await getWorkspaceForUser(user);
  const companies = workspace
    .filter((w) => hasPermission(w.permissions, 'projects:read'))
    .map(({ company }) => ({
      id: company.id,
      name: company.name,
      color: company.color ?? null,
      logo: company.logo ?? null,
    }));
  const empty = {
    today,
    from,
    to,
    companies,
    projects: [],
    goals: [],
    tasks: [],
    tallies: [],
    done: [],
    users: [],
  };
  if (!companies.length) return ok(empty);

  const projects: Project[] = await db.project.findMany({
    where: {
      companyId: { in: companies.map((c) => c.id) },
      status: { notIn: [PROJECT_STATUS.ARCHIVED] },
    },
    orderBy: { createdAt: 'asc' },
  });
  if (!projects.length) return ok(empty);
  const ids = projects.map((p) => p.id);
  // Today's goal tasks are made before they are counted.
  await runDueSchedules({ projectId: { in: ids } });

  const goalIds = Array.from(
    new Set(projects.flatMap((p) => (p.goals ?? []).map((g) => g.id))),
  );
  const [tasks, tallies]: [Task[], GoalTally[]] = goalIds.length
    ? await Promise.all([
        db.task.findMany({
          where: {
            projectId: { in: ids },
            goalId: { in: goalIds },
            status: { notIn: [TASK_STATUS.ARCHIVED] },
          },
          select: {
            id: true,
            title: true,
            projectId: true,
            goalId: true,
            goalPartId: true,
            status: true,
            forDate: true,
            dueDate: true,
            completedAt: true,
            completedByIds: true,
            assigneeIds: true,
            goalMissed: true,
            carriedFrom: true,
          },
        }),
        db.goalTally.findMany({ where: { projectId: { in: ids } } }),
      ])
    : [[], []];

  // Periods run up to a quarter, so the calendar gets the days around it.
  const windowFrom = addDays(from, -92);
  const windowTo = addDays(to, 92);
  const inWindow = (day: string | null | undefined) =>
    !!day && day >= windowFrom && day <= windowTo;

  const goals: CalendarGoal[] = projects.flatMap((p) => {
    const own = p.goals ?? [];
    if (!own.length) return [];
    const ownIds = new Set(own.map((g) => g.id));
    const rows: DoneTask[] = [
      ...tasks.filter((t) => t.projectId === p.id),
      ...tallies
        .filter((t) => t.projectId === p.id && ownIds.has(t.goalId))
        .map((t) => ({
          status: 'DONE',
          goalId: t.goalId,
          goalPartId: t.goalPartId ?? null,
          forDate: t.from,
          amount: t.amount,
        })),
    ];
    const progress = goalProgress(own, rows, today);
    return own.map((g, i) => ({
      ...g,
      projectId: p.id,
      progress: progress[i],
    }));
  });

  const shownTasks: CalendarTask[] = tasks
    .filter(
      (t) =>
        // A task put aside counts only as a missed day.
        (t.status !== TASK_STATUS.IGNORED || !!t.goalMissed?.day) &&
        (inWindow(t.forDate) ||
          inWindow(dayOf(t.completedAt)) ||
          inWindow(t.goalMissed?.day)),
    )
    .map((t) => ({
      id: t.id,
      title: t.title,
      projectId: t.projectId,
      goalId: t.goalId as string,
      goalPartId: t.goalPartId ?? null,
      status: t.status,
      forDate: t.forDate ?? null,
      dueDate: t.dueDate ?? null,
      completedAt: t.completedAt
        ? new Date(t.completedAt as string).toISOString()
        : null,
      completedByIds: t.completedByIds ?? [],
      assigneeIds: t.assigneeIds ?? [],
      goalMissed: t.goalMissed?.day ? { day: t.goalMissed.day } : null,
      carriedFrom: t.carriedFrom ?? null,
    }));
  const shownTallies: CalendarTally[] = tallies
    .filter((t) => inWindow(t.from))
    .map((t) => ({
      projectId: t.projectId,
      goalId: t.goalId,
      goalPartId: t.goalPartId ?? null,
      from: t.from,
      amount: t.amount,
    }));

  // Every task finished in these projects from `from` to `to`, counted per
  // project and day, goal or not: the work done beside the goals.
  const finished: Task[] = await db.task.findMany({
    where: { projectId: { in: ids }, status: TASK_STATUS.DONE },
    select: { projectId: true, completedAt: true },
  });
  const doneCount = new Map<string, number>();
  for (const t of finished) {
    const day = dayOf(t.completedAt);
    if (!day || day < from || day > to) continue;
    const key = `${t.projectId}|${day}`;
    doneCount.set(key, (doneCount.get(key) ?? 0) + 1);
  }
  const done = Array.from(doneCount, ([key, count]) => {
    const [projectId, day] = key.split('|');
    return { projectId, day, count };
  });

  const userIds = new Set<string>();
  projects.forEach((p) =>
    [...(p.leadIds ?? []), ...(p.memberIds ?? [])].forEach((id) =>
      userIds.add(id),
    ),
  );
  goals.forEach((g) => (g.assigneeIds ?? []).forEach((id) => userIds.add(id)));
  shownTasks.forEach((t) =>
    [...(t.completedByIds ?? []), ...(t.assigneeIds ?? [])].forEach((id) =>
      userIds.add(id),
    ),
  );

  return ok({
    today,
    from,
    to,
    companies,
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      companyId: p.companyId,
      parentId: p.parentId ?? null,
      color: p.color ?? null,
      logo: p.logo ?? null,
      status: p.status,
      effort: p.effort ?? null,
      isCore: !!p.isCore,
      leadIds: p.leadIds ?? [],
      memberIds: p.memberIds ?? [],
    })),
    goals,
    tasks: shownTasks,
    tallies: shownTallies,
    done,
    users: await getPublicUsers(Array.from(userIds)),
  });
}
