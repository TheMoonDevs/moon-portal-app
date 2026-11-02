import { deleteTask } from '@/lib/daywork/server';
import { db } from '@/lib/mongodb/db-client';
import { syncTaskPoints } from '@/lib/progress/server';
import type {
  Project,
  ProjectGoal,
  Task,
  TaskSchedule,
} from '@/models/workspace';
import { OPEN_TASK_STATUSES, TASK_SIZE, TASK_STATUS } from '@/models/workspace';

import { goalPeople } from './goalSchedules';
import { addDays, goalTaskTitle, nextRunOnOrAfter, toDay } from './projects';
import { completeScheduleRun, finish, scheduleTask } from './scheduleRuns';

/*
 * Ticking a goal by hand. A repeating goal's day can be ticked on or off
 * whether or not a task is linked to it: ticking it finishes the day's
 * linked tasks, or makes one already done when there are none; ticking it
 * off opens them again (and takes away one a tick made). A goal can also be
 * marked done up to a date: every open task linked to it up to then is
 * finished, and its runs from today to that date that have no task yet get
 * one, already done.
 */

/** Made by ticking a goal day: taken away again when it is ticked off. */
export const TICK_MADE_BY = 'goal_tick';

const SET_ASIDE = [TASK_STATUS.ARCHIVED, TASK_STATUS.IGNORED];
const isOpen = (t: Task) => (OPEN_TASK_STATUSES as string[]).includes(t.status);

type Unit = { partId: string | null; title: string };
/** Each part's tasks (or the goal's), called "Project - goal per day". */
const unitsOf = (project: Project, goal: ProjectGoal): Unit[] =>
  goal.parts?.length
    ? goal.parts.map((p) => ({
        partId: p.id,
        title: goalTaskTitle(project.name, goal, p.label),
      }))
    : [{ partId: null, title: goalTaskTitle(project.name, goal) }];

async function goalSchedules(projectId: string, goalId: string) {
  const schedules: TaskSchedule[] = await db.taskSchedule.findMany({
    where: { projectId, goalId, active: true },
  });
  return schedules;
}

/** Ticks a goal's day on (`done`) or off. Returns the tasks it changed. */
export async function tickGoalDay(
  project: Project,
  goal: ProjectGoal,
  day: string,
  done: boolean,
  userId: string,
): Promise<{ finished: number; opened: number; made: number }> {
  const tasks: Task[] = await db.task.findMany({
    where: {
      projectId: project.id,
      goalId: goal.id,
      forDate: day,
      status: { notIn: SET_ASIDE },
    },
  });
  const result = { finished: 0, opened: 0, made: 0 };

  if (done) {
    for (const task of tasks.filter(isOpen)) {
      await finish(task, userId);
      result.finished += 1;
    }
    if (tasks.length) return result;
    // Nothing linked to that day: a task stands for the tick.
    const schedules = await goalSchedules(project.id, goal.id);
    const now = new Date().toISOString();
    for (const unit of unitsOf(project, goal)) {
      const schedule = schedules.find(
        (s) => (s.goalPartId ?? null) === unit.partId,
      );
      const base = schedule
        ? scheduleTask(schedule, day, 0, now)
        : {
            companyId: project.companyId,
            projectId: project.id,
            title: unit.title,
            description: null,
            size: TASK_SIZE.MINOR,
            status: TASK_STATUS.TODO,
            assigneeIds: goalPeople(project, goal).length
              ? goalPeople(project, goal)
              : [userId],
            dueDate: null,
            completedAt: null,
            goalId: goal.id,
            goalPartId: unit.partId,
            scheduleId: null,
            planId: goal.planId ?? null,
            forDate: day,
            createdById: userId,
            createdAt: now,
            updatedAt: now,
          };
      const created: Task = await db.task.create({
        data: {
          ...base,
          // One task stands for the day, so no "(1/3)".
          title: unit.title,
          goalChecked: true,
          madeBy: TICK_MADE_BY,
        },
      });
      await finish(created, userId);
      result.made += 1;
    }
    return result;
  }

  for (const task of tasks.filter((t) => t.status === TASK_STATUS.DONE)) {
    if (task.madeBy === TICK_MADE_BY) {
      await deleteTask(task);
    } else {
      const opened: Task = await db.task.update({
        where: { id: task.id },
        data: {
          status: TASK_STATUS.TODO,
          completedAt: null,
          completedByIds: [],
          updatedAt: new Date().toISOString(),
        },
      });
      await syncTaskPoints(opened);
    }
    result.opened += 1;
  }
  return result;
}

/**
 * Marks a goal done up to `until` (YYYY-MM-DD): its open linked tasks for
 * days up to then are finished, and a repeating goal's runs from today to
 * `until` that have no task yet get one, already done.
 */
export async function completeGoalUntil(
  project: Project,
  goal: ProjectGoal,
  until: string,
  userId: string,
): Promise<{ finished: number; made: number; days: string[] }> {
  const open: Task[] = await db.task.findMany({
    where: {
      projectId: project.id,
      goalId: goal.id,
      status: { in: OPEN_TASK_STATUSES },
    },
  });
  const days = new Set<string>();
  let finished = 0;
  for (const task of open) {
    const day = task.forDate ?? task.dueDate ?? null;
    if (day && day > until) continue;
    await finish(task, userId);
    finished += 1;
    if (day) days.add(day);
  }

  let made = 0;
  if (goal.kind !== 'target') {
    const today = toDay();
    for (const schedule of await goalSchedules(project.id, goal.id)) {
      const count = Math.max(1, schedule.count || 1);
      let run = nextRunOnOrAfter(schedule, today);
      for (let guard = 0; run <= until && guard < 400; guard++) {
        for (let i = 0; i < count; i++) {
          const task = await completeScheduleRun(schedule, run, true, userId);
          if (!task || task.forDate !== run) break;
          made += 1;
          days.add(run);
        }
        run = nextRunOnOrAfter(schedule, addDays(run, 1));
      }
    }
  }
  return { finished, made, days: Array.from(days).sort() };
}
