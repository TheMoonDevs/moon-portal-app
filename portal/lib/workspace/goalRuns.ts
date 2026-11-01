import { db } from '@/lib/mongodb/db-client';
import { syncTaskPoints } from '@/lib/progress/server';
import type { Task, TaskSchedule, WorkPoint } from '@/models/workspace';
import { TASK_STATUS } from '@/models/workspace';

import { addDays, runCovering, runsFrom, runsOn, toDay } from './projects';
import { scheduleTask } from './scheduleRuns';

/*
 * A scheduled goal makes one task (or a few) for each of its runs. Other
 * tasks can stand for a run too: one written on the worklog and linked to
 * the goal, one Claude made, or one done early for next week. When such a
 * task is linked to the goal (by hand or automatically), it takes the run
 * over: it is attached to the goal's schedule, and the task the schedule
 * made for that run, if still untouched, gives it its notes and goes. So a
 * run never has its own task and a second one doing the same job.
 */

const SET_ASIDE = [TASK_STATUS.ARCHIVED, TASK_STATUS.IGNORED];
const OPEN = [TASK_STATUS.TODO, TASK_STATUS.IN_PROGRESS, TASK_STATUS.IN_REVIEW];

/** Runs looked ahead for one with room, for work done early. */
const RUNS_AHEAD = 8;

const samePart = (a?: string | null, b?: string | null) =>
  (a ?? null) === (b ?? null);

/** The schedule running a task's goal (or part of one), if it makes tasks. */
export async function scheduleOf(
  task: Pick<Task, 'projectId' | 'goalId' | 'goalPartId'>,
): Promise<TaskSchedule | null> {
  if (!task.projectId || !task.goalId) return null;
  const all: TaskSchedule[] = await db.taskSchedule.findMany({
    where: { projectId: task.projectId, goalId: task.goalId, active: true },
  });
  const mine = all.filter((s) => samePart(s.goalPartId, task.goalPartId));
  return mine.find((s) => s.fromGoal) ?? mine[0] ?? null;
}

/**
 * A missed goal task moved to another day (lib/workspace/goalCarry): it
 * makes up for the day it missed, so it never takes another run.
 */
const carried = (task: Task) =>
  !!(task as { carriedFrom?: string | null }).carriedFrom;

/** Whether a task stands for one of the schedule's runs. */
export const ofSchedule = (schedule: TaskSchedule, task: Task) =>
  task.scheduleId === schedule.id ||
  (!carried(task) &&
    !!schedule.goalId &&
    task.goalId === schedule.goalId &&
    samePart(task.goalPartId, schedule.goalPartId));

/**
 * The tasks standing for a schedule's runs from `from` to `to`: those it
 * made and others linked to its goal, not put away.
 */
export async function runTasks(
  schedule: TaskSchedule,
  from: string,
  to: string,
): Promise<Task[]> {
  const tasks: Task[] = await db.task.findMany({
    where: {
      projectId: schedule.projectId,
      status: { notIn: SET_ASIDE },
      forDate: { gte: from, lte: to },
      OR: [
        { scheduleId: schedule.id },
        ...(schedule.goalId ? [{ goalId: schedule.goalId }] : []),
      ],
    },
  });
  return tasks.filter((t) => ofSchedule(schedule, t));
}

/** The run a task counts for: the run its day belongs to. */
export const runOf = (schedule: TaskSchedule, task: Task) =>
  task.forDate ? runCovering(schedule, task.forDate) : null;

/** A task the schedule made itself, as it made it ("Post short (2/3)"). */
const madeBySchedule = (schedule: TaskSchedule, task: Task) =>
  task.scheduleId === schedule.id &&
  !task.ownerId &&
  (task.title === schedule.title ||
    task.title.startsWith(`${schedule.title} (`));

/**
 * Takes a schedule-made task out for the task that took its run: its notes
 * move over (bare status changes say nothing and go), then it is deleted.
 */
async function absorb(made: Task, into: Task) {
  const points: WorkPoint[] = await db.workPoint.findMany({
    where: { taskId: made.id },
  });
  const at = new Date().toISOString();
  for (const point of points) {
    if (point.text?.trim())
      await db.workPoint.update({
        where: { id: point.id },
        data: { taskId: into.id, updatedAt: at },
      });
  }
  await db.workPoint.deleteMany({ where: { taskId: made.id } });
  await db.task.delete({ where: { id: made.id } });
  await syncTaskPoints(null, made.id);
}

/**
 * Attaches a goal-linked task to the run of the goal's schedule it stands
 * for, taking over the task the schedule made for that run.
 *
 * - With `runOn`, that run (a person picked it); the task moves to its day.
 * - Otherwise the run its day belongs to and, for a finished task with
 *   `ahead`, the next runs with room: work done early counts for its day,
 *   and the task takes that day.
 *
 * An open task only takes the run its own day belongs to: it is moved to
 * another day only when a person says so. Returns the task as saved.
 */
export async function attachToRun(
  task: Task,
  options: { runOn?: string | null; ahead?: boolean } = {},
): Promise<Task> {
  if (
    !task.goalId ||
    !task.projectId ||
    SET_ASIDE.includes(task.status) ||
    carried(task)
  )
    return task;
  const schedule = await scheduleOf(task);
  if (!schedule) return task;
  if (!options.runOn && task.scheduleId === schedule.id) return task;

  const done = task.status === TASK_STATUS.DONE;
  const day =
    task.forDate ??
    (task.completedAt ? toDay(new Date(task.completedAt as string)) : toDay());
  const runs: string[] = [];
  if (options.runOn) {
    runs.push(
      runsOn(schedule, options.runOn)
        ? options.runOn
        : (runCovering(schedule, options.runOn) ?? options.runOn),
    );
  } else {
    const current = runCovering(schedule, day);
    if (current) runs.push(current);
    if (done && options.ahead)
      runs.push(...runsFrom(schedule, addDays(day, 1), RUNS_AHEAD));
  }
  if (!runs.length) return task;

  const count = Math.max(1, schedule.count || 1);
  const around = await runTasks(
    schedule,
    runs[0],
    addDays(runs[runs.length - 1], 62),
  );
  for (const run of runs) {
    const others = around.filter(
      (t) => t.id !== task.id && runOf(schedule, t) === run,
    );
    const made = others.find(
      (t) => madeBySchedule(schedule, t) && OPEN.includes(t.status),
    );
    if (!made && others.length >= count && !options.runOn) continue;
    if (made) await absorb(made, task);
    // Its day stays when it is already in that run's days.
    const move =
      !!options.runOn || (done && runCovering(schedule, day) !== run);
    return db.task.update({
      where: { id: task.id },
      data: {
        scheduleId: schedule.id,
        goalChecked: true,
        ...(move && task.forDate !== run && { forDate: run }),
        updatedAt: new Date().toISOString(),
      },
    });
  }
  return task;
}

/**
 * Clears the schedule-made tasks of runs that will no longer happen: those
 * still ahead (after today), untouched and with no notes, of schedules that
 * stopped, or on days a schedule no longer runs on. Past and worked-on
 * tasks always stay.
 */
export async function clearRunsAhead(
  schedules: TaskSchedule[],
  keep: (schedule: TaskSchedule, day: string) => boolean = () => false,
) {
  if (!schedules.length) return 0;
  const tasks: Task[] = await db.task.findMany({
    where: {
      scheduleId: { in: schedules.map((s) => s.id) },
      status: TASK_STATUS.TODO,
      forDate: { gt: toDay() },
    },
  });
  const gone = tasks.filter((t) => {
    const schedule = schedules.find((s) => s.id === t.scheduleId)!;
    return madeBySchedule(schedule, t) && !keep(schedule, t.forDate!);
  });
  if (!gone.length) return 0;
  const worked: WorkPoint[] = await db.workPoint.findMany({
    where: { taskId: { in: gone.map((t) => t.id) } },
    select: { taskId: true },
  });
  const ids = gone
    .map((t) => t.id)
    .filter((id) => !worked.some((p) => p.taskId === id));
  if (ids.length) await db.task.deleteMany({ where: { id: { in: ids } } });
  return ids.length;
}

/**
 * Unlinks a task from its goal's run, e.g. it was matched to the wrong
 * goal: it leaves the schedule, and a run that is today or still ahead
 * gets its own task back when it is now short of one.
 */
export async function releaseRun(task: Task): Promise<Task> {
  if (!task.scheduleId) return task;
  const schedule: TaskSchedule | null = await db.taskSchedule.findFirst({
    where: { id: task.scheduleId },
  });
  const released: Task = await db.task.update({
    where: { id: task.id },
    data: { scheduleId: null, updatedAt: new Date().toISOString() },
  });
  if (!schedule?.active || madeBySchedule(schedule, task)) return released;
  const run = runOf(schedule, task);
  if (!run || run < toDay()) return released;
  const count = Math.max(1, schedule.count || 1);
  const left = (await runTasks(schedule, run, addDays(run, 62))).filter(
    (t) => t.id !== task.id && runOf(schedule, t) === run,
  );
  if (left.length < count)
    await db.task.create({ data: scheduleTask(schedule, run, left.length) });
  return released;
}
