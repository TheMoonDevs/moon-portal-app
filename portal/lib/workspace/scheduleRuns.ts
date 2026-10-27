import { db } from '@/lib/mongodb/db-client';
import { syncTaskPoints } from '@/lib/progress/server';
import { isPersonalLink } from '@/lib/worklogs/personal';
import { sectionLines } from '@/lib/worklogs/timeline';
import type { WorklogLink } from '@/models/worklogs';
import type { Task, TaskSchedule } from '@/models/workspace';
import { TASK_STATUS } from '@/models/workspace';

import { addDays, nextRunOnOrAfter, toDay } from './projects';

/*
 * Scheduled tasks and work points. A done point about a scheduled task
 * finishes that task for the day it names ("for 27th", "tomorrow",
 * "2026-10-30"), or else for the day it was written: the open run of that
 * day, an overdue one, or the next run ahead, so work done early counts for
 * the day it was scheduled.
 */

/** Runs looked ahead for one not finished yet, when no day is named. */
const RUNS_AHEAD = 8;

const SET_ASIDE = [TASK_STATUS.ARCHIVED, TASK_STATUS.IGNORED];

/** The task a schedule creates for the run on `runOn`, the `index`th of it. */
export function scheduleTask(
  schedule: TaskSchedule,
  runOn: string,
  index: number,
  now = new Date().toISOString(),
) {
  const count = Math.max(1, schedule.count || 1);
  return {
    companyId: schedule.companyId,
    projectId: schedule.projectId,
    title:
      count > 1 ? `${schedule.title} (${index + 1}/${count})` : schedule.title,
    description: schedule.description ?? null,
    size: schedule.size,
    status: TASK_STATUS.TODO,
    // Nobody named: it goes to the person who set it up, so it shows up.
    assigneeIds: schedule.assigneeIds?.length
      ? schedule.assigneeIds
      : [schedule.createdById],
    dueDate:
      schedule.dueInDays != null ? addDays(runOn, schedule.dueInDays) : null,
    completedAt: null,
    goalId: schedule.goalId ?? null,
    goalPartId: schedule.goalPartId ?? null,
    scheduleId: schedule.id,
    planId: schedule.planId ?? null,
    forDate: runOn,
    createdById: schedule.createdById,
    createdAt: now,
    updatedAt: now,
  };
}

/* --------------------------------- dates --------------------------------- */

const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];
const FULL_MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];
/** The month a word names ("oct", "october", "sept"), or -1. */
const monthOf = (word: string) =>
  MONTHS.findIndex(
    (name, i) =>
      word === name ||
      word === FULL_MONTHS[i] ||
      (name === 'sep' && word === 'sept'),
  );
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const isoDay = (y: number, m: number, d: number) => {
  const date = new Date(Date.UTC(y, m, d));
  return date.getUTCMonth() === m ? date.toISOString().slice(0, 10) : null;
};
const between = (a: string, b: string) =>
  Math.round((Date.parse(a) - Date.parse(b)) / 86400000);

/** Of several candidate days, the one nearest `ref` (the later on a tie). */
const nearest = (days: (string | null)[], ref: string) =>
  days
    .filter((d): d is string => !!d)
    .sort(
      (a, b) =>
        Math.abs(between(a, ref)) - Math.abs(between(b, ref)) ||
        b.localeCompare(a),
    )[0] ?? null;

/**
 * The day a work point names, if any: "2026-10-30", "27 Oct", "Oct 27",
 * "27th", "for the 27th", "today", "tomorrow", "yesterday", "for Monday".
 * Days without a month or year are taken nearest to `ref`.
 */
export function dayMentioned(text: string, ref: string): string | null {
  const t = text.toLowerCase();
  const iso = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return isoDay(+iso[1], +iso[2] - 1, +iso[3]);
  if (/\btomorrow\b/.test(t)) return addDays(ref, 1);
  if (/\byesterday\b/.test(t)) return addDays(ref, -1);
  if (/\btoday\b/.test(t)) return ref;

  const [y, m] = [+ref.slice(0, 4), +ref.slice(5, 7) - 1];
  const inYears = (month: number, day: number) =>
    nearest(
      [y - 1, y, y + 1].map((year) => isoDay(year, month, day)),
      ref,
    );
  for (const [, day, name] of Array.from(
    t.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]+)\b/g),
  ))
    if (monthOf(name) >= 0) return inYears(monthOf(name), +day);
  for (const [, name, day] of Array.from(
    t.matchAll(/\b([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/g),
  ))
    if (monthOf(name) >= 0) return inYears(monthOf(name), +day);
  // A bare day of the month needs "for", "on" or "the" before it, so
  // "3 shorts" or "3rd edit" is not one.
  const bare =
    t.match(/\b(?:for|on|by|the)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/) ??
    t.match(/\b(?:for|on|by)\s+(?:the\s+)?(\d{1,2})\b(?!\s*[a-z%])/);
  if (bare)
    return nearest(
      [m - 1, m, m + 1].map((month) =>
        isoDay(y + Math.floor(month / 12), (month + 12) % 12, +bare[1]),
      ),
      ref,
    );
  const weekday = t.match(
    /\b(?:for|on)\s+(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b|\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*'s\b/,
  );
  if (weekday) {
    const want = WEEKDAYS.indexOf(weekday[1] ?? weekday[2]);
    const from = new Date(`${ref}T00:00:00Z`).getUTCDay();
    // The nearest such day, this one or the next.
    const ahead = (want - from + 7) % 7;
    return addDays(ref, ahead > 3 ? ahead - 7 : ahead);
  }
  return null;
}

/* -------------------------------- matching -------------------------------- */

const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !/^\d/.test(w));

/** "post" matches "posted", "short" matches "shorts". */
const sameWord = (a: string, b: string) =>
  a === b ||
  (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)));

/**
 * The schedule a line is about: most of its title's words are in the line,
 * or half of them when the line is already in the schedule's project.
 */
export function matchSchedule(
  text: string,
  schedules: TaskSchedule[],
  projectId?: string | null,
) {
  const line = words(text);
  const scored = schedules
    .map((s) => {
      const title = words(s.title);
      const hits = title.filter((w) => line.some((l) => sameWord(w, l)));
      return { s, score: title.length ? hits.length / title.length : 0 };
    })
    .filter((x) => x.score >= (x.s.projectId === projectId ? 0.5 : 0.75))
    .sort((a, b) => b.score - a.score);
  // Two schedules equally likely: leave it for the person.
  if (scored.length > 1 && scored[0].score === scored[1].score) return null;
  return scored[0]?.s ?? null;
}

/* -------------------------------- finishing -------------------------------- */

async function finish(task: Task, userId: string) {
  const done: Task = await db.task.update({
    where: { id: task.id },
    data: {
      status: TASK_STATUS.DONE,
      completedAt: new Date().toISOString(),
      // Whoever did it shares the task's points.
      assigneeIds: Array.from(new Set([...(task.assigneeIds ?? []), userId])),
      updatedAt: new Date().toISOString(),
    },
  });
  await syncTaskPoints(done);
  return done;
}

/**
 * Finishes one task of a schedule's run for work `userId` did. With `exact`,
 * the run is the one on `day` (or the next after it). Otherwise it is the
 * open run of `day`, an overdue one, or the next run not finished yet, so
 * work done early counts for its day. A run not created yet is created,
 * already done. Returns the finished task, or null when that run is done.
 */
export async function completeScheduleRun(
  schedule: TaskSchedule,
  day: string,
  exact: boolean,
  userId: string,
): Promise<Task | null> {
  const tasks: Task[] = await db.task.findMany({
    where: { scheduleId: schedule.id, status: { notIn: SET_ASIDE } },
  });
  const count = Math.max(1, schedule.count || 1);
  const open = tasks
    .filter((t) => t.status !== TASK_STATUS.DONE && t.forDate)
    .sort((a, b) => a.forDate!.localeCompare(b.forDate!));
  const made = (runOn: string) =>
    tasks.filter((t) => t.forDate === runOn).length;

  const runs: string[] = [];
  if (exact) runs.push(nextRunOnOrAfter(schedule, day));
  else {
    const now = open.find((t) => t.forDate === day) ?? open[0];
    if (now && now.forDate! <= day) runs.push(now.forDate!);
    let next = nextRunOnOrAfter(schedule, day);
    for (let i = 0; i < RUNS_AHEAD; i++) {
      runs.push(next);
      next = nextRunOnOrAfter(schedule, addDays(next, 1));
    }
  }

  for (const runOn of runs) {
    const waiting = open.find((t) => t.forDate === runOn);
    if (waiting) return finish(waiting, userId);
    const index = made(runOn);
    if (index >= count) continue;
    const created: Task = await db.task.create({
      data: scheduleTask(schedule, runOn, index),
    });
    return finish(created, userId);
  }
  return null;
}

/**
 * Finishes scheduled tasks for a day's done lines. A done line linked to a
 * scheduled task, or whose words match one of the person's schedules, counts
 * for the run of the day it names or the day it was written (`day`);
 * `named` gives a line's day when the caller knows it. The line is then
 * linked to that task, so it is only ever counted once. Returns the links.
 */
export async function settleScheduledLines(
  userId: string,
  works: unknown,
  links: WorklogLink[],
  projectIds: string[],
  day: string = toDay(),
  named: Map<string, string> = new Map(),
): Promise<WorklogLink[]> {
  const done = sectionLines(works).filter(
    (l) => l.status === 'done' && !l.isPrivate,
  );
  if (!done.length || !projectIds.length) return links;
  const byKey = new Map(links.map((l) => [l.key, l]));
  const taskIds = done
    .map((l) => byKey.get(l.key)?.taskId)
    .filter((id): id is string => !!id);
  const [linked, schedules]: [Task[], TaskSchedule[]] = await Promise.all([
    taskIds.length
      ? db.task.findMany({ where: { id: { in: taskIds } } })
      : Promise.resolve([]),
    db.taskSchedule.findMany({
      where: { projectId: { in: projectIds }, active: true },
    }),
  ]);
  if (!schedules.length) return links;
  const taskById = new Map(linked.map((t) => [t.id, t]));

  let next = links;
  for (const line of done) {
    const link = byKey.get(line.key);
    if (!link || isPersonalLink(link)) continue;
    // The person said it is not project work.
    if (link.source === 'user' && !link.projectId) continue;
    const task = link.taskId ? taskById.get(link.taskId) : undefined;
    // Linked to another task, or already counted for a run.
    if (link.taskId && (!task?.scheduleId || task.status === TASK_STATUS.DONE))
      continue;
    const schedule = task
      ? schedules.find((s) => s.id === task.scheduleId)
      : matchSchedule(
          line.text,
          schedules.filter(
            (s) => !link.projectId || s.projectId === link.projectId,
          ),
          link.projectId,
        );
    if (!schedule) continue;
    const when = named.get(line.key) ?? dayMentioned(line.text, day);
    // The linked run is the one, unless the line names another day.
    const finished =
      task && (!when || when === task.forDate)
        ? await finish(task, userId)
        : await completeScheduleRun(schedule, when ?? day, !!when, userId);
    if (!finished) continue;
    next = next.map((l) =>
      l.key === line.key
        ? {
            ...l,
            companyId: finished.companyId,
            projectId: finished.projectId,
            taskId: finished.id,
            confidence: Math.max(l.confidence, 0.85),
            source: l.source === 'user' ? 'user' : 'auto',
          }
        : l,
    );
  }
  return next;
}
