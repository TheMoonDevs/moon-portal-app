import { db } from '@/lib/mongodb/db-client';
import { syncTaskPoints } from '@/lib/progress/server';
import { isPersonalLink } from '@/lib/worklogs/personal';
import type { PointStatus } from '@/lib/worklogs/timeline';
import { sectionLines } from '@/lib/worklogs/timeline';
import type { WorklogLink } from '@/models/worklogs';
import type { Task, TaskSchedule } from '@/models/workspace';
import { TASK_SIZE, TASK_STATUS } from '@/models/workspace';

import { addDays, toDay } from './projects';
import { finish, matchSchedule } from './scheduleRuns';

/*
 * Every running work point is a task. A point that is under way, done,
 * blocked or waiting, and placed in a project, is linked to that project's
 * open task for the same work, or a task is made for it. A task made from a
 * point follows it: done when the point is ticked off, open again when it is
 * not. A point about an existing minor task finishes it too; a major task
 * takes many points, so it is only marked in progress. Scheduled tasks are
 * left to their schedule.
 */

const RUNNING: PointStatus[] = ['doing', 'done', 'blocked', 'waiting'];

/** Most tasks made in one go, so a pasted page cannot flood a project. */
const MAX_NEW = 10;

/** Days back a worklog still makes tasks; older days are history. */
const DAYS_BACK = 7;

const OPEN = [TASK_STATUS.TODO, TASK_STATUS.IN_PROGRESS, TASK_STATUS.IN_REVIEW];

const same = (a: string, b: string) =>
  a.trim().toLowerCase().replace(/\s+/g, ' ') ===
  b.trim().toLowerCase().replace(/\s+/g, ' ');

const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);

/** Mostly the same words both ways: a line with a typo fixed or a word added. */
const close = (a: string, b: string) => {
  const x = words(a);
  const y = new Set(words(b));
  if (!x.length || !y.size) return false;
  const hit = x.filter((w) => y.has(w)).length;
  return hit / x.length >= 0.75 && hit / y.size >= 0.75;
};

/** Under way again, or for the first time. */
async function inProgress(task: Task) {
  const updated: Task = await db.task.update({
    where: { id: task.id },
    data: {
      status: TASK_STATUS.IN_PROGRESS,
      completedAt: null,
      completedByIds: [],
      updatedAt: new Date().toISOString(),
    },
  });
  await syncTaskPoints(updated);
  return updated;
}

/** Brings a task in step with the point linked to it. */
async function follow(
  task: Task,
  status: PointStatus,
  key: string,
  userId: string,
) {
  const mine = task.fromLine === key;
  // Put away or dropped on purpose: a point does not bring it back.
  if (
    task.status === TASK_STATUS.ARCHIVED ||
    task.status === TASK_STATUS.IGNORED
  )
    return task;
  if (status === 'done') {
    if (task.status === TASK_STATUS.DONE) return task;
    if (mine || task.size !== TASK_SIZE.MAJOR) return finish(task, userId);
  }
  // Ticked off by mistake and opened again.
  if (mine && task.status === TASK_STATUS.DONE && status !== 'done')
    return inProgress(task);
  if (task.status === TASK_STATUS.TODO) return inProgress(task);
  return task;
}

/**
 * Links a day's running points to tasks, making the ones missing. Only for
 * projects in `projectIds` (the ones the person is on), and only for a day
 * of the last week. Returns the links, with each point's task.
 */
export async function taskLines(
  userId: string,
  works: unknown,
  links: WorklogLink[],
  projectIds: string[],
  day: string = toDay(),
): Promise<WorklogLink[]> {
  const today = toDay();
  if (day < addDays(today, -DAYS_BACK) || day > today) return links;
  const byKey = new Map(links.map((l) => [l.key, l]));
  const lines = sectionLines(works).filter((l) => {
    const link = byKey.get(l.key);
    return (
      !l.isPrivate &&
      !!l.status &&
      RUNNING.includes(l.status) &&
      !!link?.projectId &&
      !isPersonalLink(link) &&
      projectIds.includes(link.projectId)
    );
  });
  if (!lines.length) return links;

  const projects = Array.from(
    new Set(lines.map((l) => byKey.get(l.key)!.projectId!)),
  );
  const linkedIds = lines
    .map((l) => byKey.get(l.key)!.taskId)
    .filter((id): id is string => !!id);
  const [linked, open, schedules, recent]: [
    Task[],
    Task[],
    TaskSchedule[],
    Task[],
  ] = await Promise.all([
    linkedIds.length
      ? db.task.findMany({ where: { id: { in: linkedIds } } })
      : Promise.resolve([]),
    db.task.findMany({
      where: { projectId: { in: projects }, status: { in: OPEN } },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    }),
    db.taskSchedule.findMany({
      where: { projectId: { in: projects }, active: true },
    }),
    // Made from this person's lines lately, for a line they then edited.
    db.task.findMany({
      where: {
        projectId: { in: projects },
        createdById: userId,
        updatedAt: { gte: `${addDays(today, -2)}T00:00:00.000Z` },
      },
    }),
  ]);
  const taskById = new Map(linked.map((t) => [t.id, t]));
  const keys = new Set(sectionLines(works).map((l) => l.key));
  let edited = recent.filter(
    (t) =>
      !!t.fromLine &&
      !keys.has(t.fromLine) &&
      t.status !== TASK_STATUS.ARCHIVED &&
      t.status !== TASK_STATUS.IGNORED,
  );

  let made = 0;
  const next = new Map<string, Task>();
  for (const line of lines) {
    const link = byKey.get(line.key)!;
    const projectId = link.projectId!;
    let task = link.taskId ? taskById.get(link.taskId) : undefined;
    // Not linked yet, or its task is gone: find one or make it.
    if (!task) {
      // Work on a scheduled task counts for one of its runs instead.
      if (
        matchSchedule(
          line.text,
          schedules.filter((s) => s.projectId === projectId),
          projectId,
        )
      )
        continue;
      task = open.find(
        (t) => t.projectId === projectId && same(t.title, line.text),
      );
      // The line it was made from was reworded.
      task ??= edited.find(
        (t) => t.projectId === projectId && close(t.title, line.text),
      );
    }
    // Made from a line that was reworded: it follows the new words.
    if (
      task?.fromLine &&
      task.fromLine !== line.key &&
      !keys.has(task.fromLine)
    ) {
      const id = task.id;
      edited = edited.filter((t) => t.id !== id);
      task = (await db.task.update({
        where: { id },
        data: {
          title: line.text.slice(0, 200),
          fromLine: line.key,
          updatedAt: new Date().toISOString(),
        },
      })) as Task;
    }
    if (!task) {
      if (made >= MAX_NEW) continue;
      const now = new Date().toISOString();
      task = (await db.task.create({
        data: {
          companyId: link.companyId,
          projectId,
          title: line.text.slice(0, 200),
          description: null,
          size: TASK_SIZE.MINOR,
          status: TASK_STATUS.IN_PROGRESS,
          assigneeIds: [userId],
          dueDate: null,
          // A point from an earlier day counts for that day.
          forDate: day === today ? null : day,
          completedAt: null,
          goalId: null,
          goalPartId: null,
          fromLine: line.key,
          createdById: userId,
          createdAt: now,
          updatedAt: now,
        },
      })) as Task;
      made += 1;
      open.push(task);
    }
    // Finishing a task also finds the goal it fills.
    next.set(line.key, await follow(task, line.status!, line.key, userId));
  }

  return links.map((l) => {
    const task = next.get(l.key);
    return task
      ? {
          ...l,
          companyId: task.companyId,
          projectId: task.projectId,
          taskId: task.id,
          confidence: Math.max(l.confidence, 0.85),
        }
      : l;
  });
}
