import { db } from '@/lib/mongodb/db-client';
import type { Project, ProjectGoal, TaskSchedule } from '@/models/workspace';
import { TASK_SIZE } from '@/models/workspace';

import { goalRule, isTarget, nextRunOnOrAfter, toDay } from './projects';
import { runDueSchedules } from './schedules';

/*
 * A scheduled goal makes its own dated tasks: there is no separate task
 * schedule any more, the goal is the schedule. Underneath, each scheduled
 * goal (or each part of one) runs one TaskSchedule that the goal fully
 * decides: its days, how many tasks each run makes, who they are for (the
 * goal's people, or the whole team) and the plan they link to. Changing the
 * goal changes it; a target goal, a goal that makes no tasks, or a removed
 * goal or part stops it. The tasks already made always stay.
 */

type Unit = { partId: string | null; title: string; target: number };

const unitsOf = (goal: ProjectGoal): Unit[] =>
  goal.parts?.length
    ? goal.parts.map((p) => ({
        partId: p.id,
        title: `${goal.title}: ${p.label}`,
        target: p.target,
      }))
    : [{ partId: null, title: goal.title, target: goal.target }];

const sameUnit = (s: TaskSchedule, goalId: string, partId: string | null) =>
  s.goalId === goalId && (s.goalPartId ?? null) === partId;

const makesTasks = (goal: ProjectGoal) =>
  !isTarget(goal) && goal.makeTasks !== false;

/** Who a goal's tasks are for: its people, else the whole team. */
export const goalPeople = (project: Project, goal: ProjectGoal) =>
  goal.assigneeIds?.length
    ? goal.assigneeIds
    : Array.from(
        new Set([...(project.leadIds ?? []), ...(project.memberIds ?? [])]),
      );

const sameList = (a: number[] | string[] = [], b: number[] | string[] = []) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/** Keeps the project's goal schedules in step with its goals and team. */
export async function syncGoalSchedules(
  project: Project,
  _before: ProjectGoal[],
  userId: string,
) {
  const goals = project.goals ?? [];
  const schedules: TaskSchedule[] = await db.taskSchedule.findMany({
    where: { projectId: project.id, fromGoal: true },
  });
  const now = new Date().toISOString();
  const today = toDay();
  const kept = new Set<string>();
  let changed = false;

  for (const goal of goals.filter(makesTasks)) {
    const people = goalPeople(project, goal);
    for (const unit of unitsOf(goal)) {
      const rule = goalRule(goal, unit.target);
      const count = Math.min(50, rule.count);
      const mine = schedules.find((s) => sameUnit(s, goal.id, unit.partId));
      const want = {
        title: unit.title,
        assigneeIds: people,
        every: rule.every,
        weekdays: rule.weekdays,
        monthDay: rule.monthDay,
        dueInDays: rule.dueInDays,
        count,
        planId: goal.planId ?? mine?.planId ?? null,
      };
      if (mine) {
        kept.add(mine.id);
        const sameDays =
          mine.every === rule.every &&
          sameList(mine.weekdays ?? [], rule.weekdays) &&
          (mine.monthDay ?? null) === rule.monthDay;
        if (
          sameDays &&
          mine.active &&
          mine.title === want.title &&
          mine.count === count &&
          (mine.dueInDays ?? null) === rule.dueInDays &&
          (mine.planId ?? null) === want.planId &&
          sameList(mine.assigneeIds ?? [], people)
        )
          continue;
        await db.taskSchedule.update({
          where: { id: mine.id },
          data: {
            ...want,
            active: true,
            // New days: the next run is the first of them from today.
            ...((!sameDays || !mine.active) && {
              nextRunOn: nextRunOnOrAfter(rule, today),
            }),
            updatedAt: now,
          },
        });
        changed = true;
        continue;
      }
      const created: TaskSchedule = await db.taskSchedule.create({
        data: {
          companyId: project.companyId,
          projectId: project.id,
          ...want,
          description: null,
          size: TASK_SIZE.MINOR,
          goalId: goal.id,
          goalPartId: unit.partId,
          active: true,
          // This period's tasks are made now, then on each run day.
          nextRunOn:
            rule.every === 'week' && rule.dueInDays === 0
              ? nextRunOnOrAfter(rule, today)
              : today,
          lastRunOn: null,
          fromGoal: true,
          createdById: userId,
          createdAt: now,
          updatedAt: now,
        },
      });
      kept.add(created.id);
      changed = true;
    }
  }

  // Goals, parts and kinds that no longer make tasks: theirs stop.
  const gone = schedules.filter((s) => !kept.has(s.id));
  if (gone.length) {
    await db.taskSchedule.deleteMany({
      where: { id: { in: gone.map((s) => s.id) } },
    });
    changed = true;
  }
  if (changed) await runDueSchedules({ projectId: { in: [project.id] } });
}
