import { db } from '@/lib/mongodb/db-client';
import type {
  GoalPeriod,
  Project,
  ProjectGoal,
  TaskSchedule,
} from '@/models/workspace';

import { sanitizeGoals, toDay } from './projects';

/*
 * Task schedules used to stand on their own. Now a scheduled goal is the
 * schedule, so each older schedule moves into a goal, once:
 *
 * - one already set up for a goal (that has none of its own yet) becomes
 *   that goal's schedule, and the goal takes its days;
 * - any other becomes a new scheduled goal with its title, days, count,
 *   people and plan, and the tasks it made count towards that goal.
 *
 * Nothing is deleted: the schedule keeps running and keeps its tasks, it
 * is just run by the goal from then on.
 */

const PERIOD: Record<string, GoalPeriod> = {
  day: 'day',
  week: 'week',
  month: 'month',
};

/** The goal an older schedule stands for. */
export function goalFromSchedule(s: TaskSchedule): Omit<ProjectGoal, 'id'> {
  const period = PERIOD[s.every] ?? 'week';
  const count = Math.max(1, s.count || 1);
  const weekdays = s.weekdays?.length ? s.weekdays : [1];
  // A Monday batch due by Sunday is the default; anything else names days.
  const namedDays =
    period === 'week' &&
    !(weekdays.length === 1 && weekdays[0] === 1 && (s.dueInDays ?? 0) >= 6);
  return {
    title: s.title,
    kind: 'scheduled',
    period,
    target: period === 'week' ? count * weekdays.length : count,
    since: s.createdAt ? toDay(new Date(s.createdAt as string)) : toDay(),
    ...(namedDays && { days: weekdays }),
    ...(period === 'month' && { monthDay: s.monthDay || 1 }),
    ...(s.active === false && { makeTasks: false }),
    ...(s.assigneeIds?.length && { assigneeIds: s.assigneeIds }),
    ...(s.planId && { planId: s.planId }),
  };
}

/** Moves the older schedules of these projects (or all) into goals. */
export async function moveSchedulesIntoGoals(
  where: { projectId?: { in: string[] }; companyId?: { in: string[] } } = {},
) {
  const older: TaskSchedule[] = await db.taskSchedule.findMany({
    where: {
      ...where,
      fromGoal: { notIn: [true] },
      migratedAt: { in: [null] },
    },
  });
  for (const schedule of older) {
    // Claim it, so it moves once however many requests run this.
    const claimed = await db.taskSchedule.updateMany({
      where: { id: schedule.id, migratedAt: { in: [null] } },
      data: { migratedAt: new Date().toISOString() },
    });
    if (!claimed.count) continue;
    try {
      await moveOne(schedule);
    } catch (err) {
      console.error('[goals] could not move schedule', schedule.id, err);
    }
  }
}

async function moveOne(schedule: TaskSchedule) {
  const project: Project | null = await db.project.findFirst({
    where: { id: schedule.projectId },
  });
  if (!project) return;
  const goals = project.goals ?? [];
  const now = new Date().toISOString();

  // Set up for a goal that has no schedule of its own: it becomes the
  // goal's, and the goal takes its days.
  const goal = goals.find((g) => g.id === schedule.goalId);
  if (goal) {
    const taken = await db.taskSchedule.findFirst({
      where: {
        projectId: project.id,
        fromGoal: true,
        goalId: goal.id,
        goalPartId: schedule.goalPartId ?? null,
      },
    });
    if (!taken) {
      const from = goalFromSchedule(schedule);
      if (!goal.parts?.length && from.period === goal.period) {
        const next = goals.map((g) =>
          g.id === goal.id
            ? {
                ...g,
                days: from.days,
                monthDay: from.monthDay,
                assigneeIds: g.assigneeIds?.length
                  ? g.assigneeIds
                  : from.assigneeIds,
                planId: g.planId ?? from.planId,
              }
            : g,
        );
        await db.project.update({
          where: { id: project.id },
          data: { goals: sanitizeGoals(next, goals), updatedAt: now },
        });
      }
      await db.taskSchedule.update({
        where: { id: schedule.id },
        data: { fromGoal: true, updatedAt: now },
      });
      return;
    }
  }

  // Anything else becomes a goal of its own.
  const [made] = sanitizeGoals([goalFromSchedule(schedule)]);
  await db.project.update({
    where: { id: project.id },
    // Pushed, so goals moved at the same time by another request stay.
    data: {
      goals: project.goals ? { push: made } : [made],
      updatedAt: now,
    },
  });
  await db.taskSchedule.update({
    where: { id: schedule.id },
    data: {
      fromGoal: true,
      goalId: made.id,
      goalPartId: null,
      updatedAt: now,
    },
  });
  // What it already made counts towards its new goal.
  await db.task.updateMany({
    where: { scheduleId: schedule.id, goalId: { in: [null] } },
    data: { goalId: made.id, goalPartId: null, updatedAt: now },
  });
}
