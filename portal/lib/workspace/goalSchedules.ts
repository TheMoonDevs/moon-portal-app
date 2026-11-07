import { db } from '@/lib/mongodb/db-client';
import type { Project, ProjectGoal, TaskSchedule } from '@/models/workspace';
import { TASK_SIZE } from '@/models/workspace';

import { clearRunsAhead, clearStaleRuns, retitleRunTasks } from './goalRuns';
import {
  goalRule,
  goalTaskTitle,
  isTarget,
  nextRunOnOrAfter,
  runCovering,
  toDay,
} from './projects';
import { runDueSchedules } from './schedules';

/*
 * A scheduled goal makes its own dated tasks: there is no separate task
 * schedule any more, the goal is the schedule. Underneath, each scheduled
 * goal (or each part of one) runs one TaskSchedule that the goal fully
 * decides: its days, how many tasks each run makes, who they are for (the
 * goal's people, or the whole team) and the plan they link to. Changing the
 * goal changes it; a target goal, a goal that makes no tasks, or a removed
 * goal or part stops it. Tasks already made stay, except untouched ones
 * not past their day that no longer fit the goal (new days, more or fewer
 * a run, other people or due day, or a goal that stopped): they are
 * cleared, and made again as the goal now says.
 */

type Unit = {
  partId: string | null;
  label: string | null;
  title: string;
  target: number;
};

const unitsOf = (goal: ProjectGoal): Unit[] =>
  goal.parts?.length
    ? goal.parts.map((p) => ({
        partId: p.id,
        label: p.label,
        title: `${goal.title}: ${p.label}`,
        target: p.target,
      }))
    : [{ partId: null, label: null, title: goal.title, target: goal.target }];

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
        taskTitle: goalTaskTitle(project.name, goal, unit.label),
        assigneeIds: people,
        every: rule.every,
        weekdays: rule.weekdays,
        monthDay: rule.monthDay,
        slots: rule.slots,
        anchor: rule.anchor,
        dueInDays: rule.dueInDays,
        count,
        planId: goal.planId ?? mine?.planId ?? null,
      };
      if (mine) {
        kept.add(mine.id);
        const sameDays =
          mine.every === rule.every &&
          sameList(mine.weekdays ?? [], rule.weekdays) &&
          (mine.monthDay ?? null) === rule.monthDay &&
          JSON.stringify(mine.slots ?? []) === JSON.stringify(rule.slots) &&
          (mine.anchor ?? null) === rule.anchor;
        const same =
          sameDays &&
          mine.active &&
          mine.title === want.title &&
          mine.taskTitle === want.taskTitle &&
          mine.count === count &&
          (mine.dueInDays ?? null) === rule.dueInDays &&
          (mine.planId ?? null) === want.planId &&
          sameList(mine.assigneeIds ?? [], people);
        // Its open tasks take the new name (the goal or project renamed).
        if (mine.taskTitle !== want.taskTitle)
          await retitleRunTasks(mine, want.taskTitle);
        const after: TaskSchedule = same
          ? mine
          : await db.taskSchedule.update({
              where: { id: mine.id },
              data: { ...want, active: true, updatedAt: now },
            });
        // Tasks still to do that the goal no longer makes as they are (other
        // days, more or fewer a run, other people or due day) are cleared,
        // and made again below as it now says. This also tidies ones left
        // behind by earlier changes.
        const cleared = await clearStaleRuns(mine, after);
        if (same && !cleared.length) continue;
        // The next run: the one covering today when a task of it was
        // cleared, so it is made again; else the first of its days from
        // today.
        const current = runCovering(after, today);
        const redo =
          !!current && cleared.some((t) => (t.forDate ?? '') <= today);
        if (cleared.length || !sameDays || !mine.active)
          await db.taskSchedule.update({
            where: { id: mine.id },
            data: {
              nextRunOn:
                redo && current ? current : nextRunOnOrAfter(rule, today),
              // So the coming run is shown again when it was cleared.
              lastRunOn: null,
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
          // This period's tasks are made now (for the run that covers
          // today, so a weekly batch set on a Saturday is still this week's
          // Monday batch, due Sunday), then on each run day.
          nextRunOn: runCovering(rule, today) ?? nextRunOnOrAfter(rule, today),
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
    await clearRunsAhead(gone);
    await db.taskSchedule.deleteMany({
      where: { id: { in: gone.map((s) => s.id) } },
    });
    changed = true;
  }
  if (changed) await runDueSchedules({ projectId: { in: [project.id] } });
}
