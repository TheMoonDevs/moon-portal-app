import { db } from '@/lib/mongodb/db-client';
import type { Task, WorkPoint } from '@/models/workspace';
import { TASK_STATUS } from '@/models/workspace';

import { CLOSED_STATUSES, renderDays } from './server';

/*
 * Copies of one task. Before tasks first, carrying a day over could write an
 * open task a second time (same words, a new task), and the move to tasks
 * kept both. A copy made while the first was still open is the same work:
 * its points go under the first and it is archived, so the work is one task
 * across its days. A task with the same words written after the first was
 * finished is new work (a daily habit) and stays as it is. Server only.
 */

/** How far back copies are looked for. */
const WINDOW_DAYS = 21;
/** The longest gap between a task and its copy. */
const COPY_DAYS = 14;
/** Checked at most this often per person. */
const EVERY_MS = 10 * 60 * 1000;

const checked = new Map<string, number>();

const words = (title: string) =>
  title
    .replace(/&#x20;/g, ' ')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const ms = (iso?: string | Date | null) =>
  iso ? new Date(iso as any).getTime() : NaN;

/**
 * Folds the person's copies into the task they copy. Returns how many
 * copies were folded in.
 */
export async function mergeCopies(userId: string, force = false) {
  const last = checked.get(userId) ?? 0;
  if (!force && Date.now() - last < EVERY_MS) return 0;
  checked.set(userId, Date.now());

  const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString();
  const tasks: Task[] = await db.task.findMany({
    where: {
      ownerId: userId,
      createdAt: { gte: since },
      status: { notIn: [TASK_STATUS.ARCHIVED, TASK_STATUS.IGNORED] },
    },
    orderBy: { createdAt: 'asc' },
    take: 1500,
  });
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    // A scheduled goal makes a task with the same words for each run.
    if (task.scheduleId) continue;
    const key = words(task.title ?? '');
    if (key.replace(/[^\p{L}\p{N}]/gu, '').length < 3) continue;
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }

  let merged = 0;
  const days = new Set<string>();
  for (const group of Array.from(groups.values())) {
    if (group.length < 2) continue;
    let first = group[0];
    for (const copy of group.slice(1)) {
      const made = ms(copy.createdAt as any);
      const finished = ms(first.completedAt as any);
      const isCopy =
        made - ms(first.createdAt as any) <= COPY_DAYS * 86400000 &&
        // Still open when the copy was written.
        (!CLOSED_STATUSES.includes(first.status) ||
          (first.status === TASK_STATUS.DONE && finished > made));
      if (!isCopy) {
        first = copy;
        continue;
      }
      first = await fold(first, copy, days);
      merged += 1;
    }
  }
  if (days.size) await renderDays(userId, Array.from(days));
  return merged;
}

/** Puts a copy's points under the first task and archives the copy. */
async function fold(first: Task, copy: Task, days: Set<string>) {
  const at = new Date().toISOString();
  const points: WorkPoint[] = await db.workPoint.findMany({
    where: { taskId: copy.id },
  });
  const doneBefore = (point: WorkPoint) =>
    first.status === TASK_STATUS.DONE &&
    ms(first.completedAt as any) <= ms(point.at as any);
  for (const point of points) {
    days.add(point.date as string);
    // A bare status on the copy after the first was finished says nothing
    // new, and would only show the finished task on another day.
    if (!point.text?.trim() && doneBefore(point))
      await db.workPoint.deleteMany({ where: { id: point.id } });
    else
      await db.workPoint.update({
        where: { id: point.id },
        data: { taskId: first.id, updatedAt: at },
      });
  }
  // The copy is newer: unless the first was finished, it takes the copy's
  // state.
  let kept = first;
  if (first.status !== TASK_STATUS.DONE)
    kept = await db.task.update({
      where: { id: first.id },
      data: {
        status: copy.status,
        flag: copy.flag ?? null,
        startedAt: first.startedAt ?? copy.startedAt ?? null,
        completedAt: copy.completedAt ?? null,
        completedByIds: copy.completedByIds ?? [],
        updatedAt: at,
      },
    });
  await db.task.update({
    where: { id: copy.id },
    data: { status: TASK_STATUS.ARCHIVED, mergedInto: first.id, updatedAt: at },
  });
  for (const day of [first.forDate, copy.forDate])
    if (day) days.add(day as string);
  return kept;
}
