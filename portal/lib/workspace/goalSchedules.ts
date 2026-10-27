import { db } from '@/lib/mongodb/db-client';
import type {
  GoalPeriod,
  Project,
  ProjectGoal,
  ScheduleEvery,
  TaskSchedule,
} from '@/models/workspace';
import { TASK_SIZE } from '@/models/workspace';

import { nextRunOnOrAfter, toDay } from './projects';
import { runDueSchedules } from './schedules';

/*
 * Goals and scheduled tasks go together. A new goal sets up a scheduled
 * task that makes its tasks at the start of each period, counting towards
 * it: one for the goal, or one per part when it has parts ("3 shorts on each
 * channel"). A changed target or period changes that scheduled task, and a
 * removed goal (or part) stops it; the tasks it made stay. A scheduled task
 * someone set up for the goal themselves is left alone, and one they removed
 * is not brought back.
 */

const RULES: Record<
  GoalPeriod,
  {
    every: ScheduleEvery;
    weekdays: number[];
    monthDay: number | null;
    dueInDays: number | null;
  }
> = {
  day: { every: 'day', weekdays: [], monthDay: null, dueInDays: 0 },
  // Made on Monday, due by Sunday.
  week: { every: 'week', weekdays: [1], monthDay: null, dueInDays: 6 },
  month: { every: 'month', weekdays: [], monthDay: 1, dueInDays: null },
};

type Unit = { partId: string | null; title: string; count: number };

const unitsOf = (goal: ProjectGoal): Unit[] =>
  goal.parts?.length
    ? goal.parts.map((p) => ({
        partId: p.id,
        title: `${goal.title}: ${p.label}`,
        count: p.target,
      }))
    : [{ partId: null, title: goal.title, count: goal.target }];

const sameUnit = (s: TaskSchedule, goalId: string, partId: string | null) =>
  s.goalId === goalId && (s.goalPartId ?? null) === partId;

/** Keeps the project's goal schedules in step after its goals changed. */
export async function syncGoalSchedules(
  project: Project,
  before: ProjectGoal[],
  userId: string,
) {
  const after = project.goals ?? [];
  const schedules: TaskSchedule[] = await db.taskSchedule.findMany({
    where: { projectId: project.id },
  });
  const now = new Date().toISOString();
  const today = toDay();
  let changed = false;

  for (const goal of after) {
    const old = before.find((g) => g.id === goal.id);
    const rule = RULES[goal.period] ?? RULES.week;
    const periodChanged = !!old && old.period !== goal.period;
    for (const unit of unitsOf(goal)) {
      const count = Math.min(50, Math.max(1, unit.count));
      const mine = schedules.find(
        (s) => s.fromGoal && sameUnit(s, goal.id, unit.partId),
      );
      if (mine) {
        if (mine.title === unit.title && mine.count === count && !periodChanged)
          continue;
        await db.taskSchedule.update({
          where: { id: mine.id },
          data: {
            title: unit.title,
            count,
            ...(periodChanged && {
              ...rule,
              nextRunOn: nextRunOnOrAfter(rule, today),
            }),
            updatedAt: now,
          },
        });
        changed = true;
        continue;
      }
      // Only a new goal, or a new part of one, sets one up.
      const isNew =
        !old ||
        (!!unit.partId && !old.parts?.some((p) => p.id === unit.partId));
      if (!isNew || schedules.some((s) => sameUnit(s, goal.id, unit.partId)))
        continue;
      await db.taskSchedule.create({
        data: {
          companyId: project.companyId,
          projectId: project.id,
          title: unit.title,
          description: null,
          size: TASK_SIZE.MINOR,
          assigneeIds: [],
          goalId: goal.id,
          goalPartId: unit.partId,
          ...rule,
          count,
          active: true,
          // This period's tasks are made now; then at each period's start.
          nextRunOn: today,
          lastRunOn: null,
          planId: null,
          fromGoal: true,
          createdById: userId,
          createdAt: now,
          updatedAt: now,
        },
      });
      changed = true;
    }
  }

  // Goals and parts that went: their goal schedules stop.
  const gone = schedules.filter((s) => {
    if (!s.fromGoal) return false;
    const goal = after.find((g) => g.id === s.goalId);
    return !goal || !unitsOf(goal).some((u) => sameUnit(s, goal.id, u.partId));
  });
  if (gone.length) {
    await db.taskSchedule.deleteMany({
      where: { id: { in: gone.map((s) => s.id) } },
    });
    changed = true;
  }
  if (changed) await runDueSchedules({ projectId: { in: [project.id] } });
}
