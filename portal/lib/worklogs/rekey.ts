import { db } from '@/lib/mongodb/db-client';
import type { WorklogLink } from '@/models/worklogs';
import type { Task } from '@/models/workspace';
import { TASK_STATUS } from '@/models/workspace';

import type { PointEvent } from './timeline';
import { sectionLines } from './timeline';

/*
 * A line's key comes from its words, so rewording a point gives it a new
 * key. The worklog screen says which lines it reworded and which it took
 * out, so a point keeps its project, task and history when its words
 * change, and a task made from a plan that was taken out again is put away.
 * Server only.
 */

export type Rename = { from: string; to: string };

const KEY = /^[a-z0-9]{1,16}$/;

/** Renames worth applying: well formed, and only the newest per line. */
export function readRenames(value: unknown): Rename[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (r): r is Rename =>
        typeof r?.from === 'string' &&
        typeof r?.to === 'string' &&
        KEY.test(r.from) &&
        KEY.test(r.to) &&
        r.from !== r.to,
    )
    .slice(0, 200);
}

export const readKeys = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((k): k is string => typeof k === 'string' && KEY.test(k))
    : [];

/**
 * Moves links and history from each old key to its new one. A rename is
 * skipped when the old line is still there or the new one already has a
 * place of its own. Tasks made from the old line follow the new words.
 */
export async function applyRenames(
  works: unknown,
  links: WorklogLink[],
  timeline: PointEvent[],
  renames: Rename[],
) {
  if (!renames.length) return { links, timeline, changed: false };
  const keys = new Set(sectionLines(works).map((l) => l.key));
  const text = new Map(sectionLines(works).map((l) => [l.key, l.text]));
  let changed = false;
  let nextLinks = links;
  let nextTimeline = timeline;
  for (const { from, to } of renames) {
    if (keys.has(from) || !keys.has(to)) continue;
    const old = nextLinks.find((l) => l.key === from);
    const taken = nextLinks.find((l) => l.key === to);
    if (old && (!taken || taken.source === 'none')) {
      nextLinks = nextLinks
        .filter((l) => l.key !== to)
        .map((l) =>
          l.key === from ? { ...l, key: to, text: text.get(to) ?? l.text } : l,
        );
      changed = true;
    }
    // Other lines that pointed at the old one.
    nextLinks = nextLinks.map((l) =>
      l.sameAs === from || l.parentKey === from
        ? {
            ...l,
            ...(l.sameAs === from && { sameAs: to }),
            ...(l.parentKey === from && { parentKey: to }),
          }
        : l,
    );
    if (nextTimeline.some((e) => e.key === from)) {
      nextTimeline = nextTimeline.map((e) =>
        e.key === from ? { ...e, key: to } : e,
      );
      changed = true;
    }
    const taskId = old?.taskId;
    if (taskId) {
      const task: Task | null = await db.task.findFirst({
        where: { id: taskId },
      });
      if (
        task &&
        task.fromLine === from &&
        task.status !== TASK_STATUS.ARCHIVED &&
        task.status !== TASK_STATUS.IGNORED
      )
        await db.task.update({
          where: { id: task.id },
          data: {
            title: (text.get(to) ?? task.title).slice(0, 200),
            fromLine: to,
            updatedAt: new Date().toISOString(),
          },
        });
    }
  }
  return { links: nextLinks, timeline: nextTimeline, changed };
}

/**
 * Tasks made from lines that were taken out before any work happened on
 * them are put away (archived, never deleted). Anything started, done, or
 * made some other way stays as it is.
 */
export async function putAwayRemoved(
  userId: string,
  works: unknown,
  links: WorklogLink[],
  removed: string[],
) {
  const keys = new Set(sectionLines(works).map((l) => l.key));
  const gone = removed.filter((k) => !keys.has(k));
  if (!gone.length) return 0;
  const tasks: Task[] = await db.task.findMany({
    where: {
      fromLine: { in: gone },
      createdById: userId,
      status: TASK_STATUS.TODO,
    },
  });
  // Still on another line of the day (e.g. the same task typed again).
  const linked = new Set(
    links.filter((l) => keys.has(l.key)).map((l) => l.taskId),
  );
  let count = 0;
  for (const task of tasks) {
    if (linked.has(task.id)) continue;
    await db.task.update({
      where: { id: task.id },
      data: {
        status: TASK_STATUS.ARCHIVED,
        updatedAt: new Date().toISOString(),
      },
    });
    count += 1;
  }
  return count;
}
