import dayjs from 'dayjs';

import { db } from '@/lib/mongodb/db-client';
import type { Badge, PointEntry, UserBadge } from '@/models/progress';
import { BADGE_METRIC, POINT_SOURCE } from '@/models/progress';
import type { Task } from '@/models/workspace';
import { TASK_SIZE, TASK_STATUS } from '@/models/workspace';

/** Points for finishing a task, per assignee. */
export const TASK_POINTS: Record<TASK_SIZE, number> = {
  [TASK_SIZE.MAJOR]: 3,
  [TASK_SIZE.MINOR]: 1,
};

/**
 * Keeps the ledger in step with a task: one entry per assignee while the task
 * is done, none otherwise. Safe to call after any change, including delete
 * (pass `null` as the task with its id).
 */
export async function syncTaskPoints(task: Task | null, taskId?: string) {
  const id = task?.id ?? taskId;
  if (!id) return;
  await db.pointEntry.deleteMany({
    where: { taskId: id, source: POINT_SOURCE.TASK },
  });
  if (!task || task.status !== TASK_STATUS.DONE) return;
  const assignees = task.assigneeIds ?? [];
  if (!assignees.length) return;
  const date = dayjs(task.completedAt ?? undefined).format('YYYY-MM-DD');
  const now = new Date().toISOString();
  await db.pointEntry.createMany({
    data: assignees.map((userId) => ({
      userId,
      companyId: task.companyId,
      projectId: task.projectId,
      taskId: task.id,
      source: POINT_SOURCE.TASK,
      points: TASK_POINTS[task.size] ?? 1,
      note: task.title,
      date,
      createdAt: now,
      updatedAt: now,
    })),
  });
}

/* -------------------------------- metrics -------------------------------- */

/** Whether a worklog has any written line. */
export const hasContent = (worklog: { works?: unknown }) =>
  Array.isArray(worklog.works) &&
  worklog.works.some(
    (w: any) =>
      typeof w?.content === 'string' &&
      w.content.replace(/[\s*\-#]/g, '').length > 0,
  );

/** Longest run of consecutive calendar days in a sorted, unique list. */
export function longestStreak(dates: string[]): number {
  let best = 0;
  let run = 0;
  let prev: dayjs.Dayjs | null = null;
  for (const d of dates) {
    const day = dayjs(d);
    run = prev && day.diff(prev, 'day') === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

/** Sorted unique days on which the user wrote something in their worklog. */
export async function worklogDays(userId: string): Promise<string[]> {
  const logs = await db.workLogs.findMany({
    where: { userId, logType: 'dayLog' },
    select: { date: true, works: true },
  });
  return Array.from(
    new Set(
      logs
        .filter(
          (l: { date?: string | null; works?: unknown }) =>
            !!l.date && hasContent(l),
        )
        .map((l: { date: string }) => l.date),
    ),
  ).sort() as string[];
}

export type Metrics = Record<BADGE_METRIC, number>;

export async function getUserMetrics(user: {
  id: string;
  createdAt?: string | Date | null;
}): Promise<Metrics> {
  const [entries, days, doneTasks] = await Promise.all([
    db.pointEntry.findMany({
      where: { userId: user.id },
      select: { points: true },
    }) as Promise<Pick<PointEntry, 'points'>[]>,
    worklogDays(user.id),
    db.task.findMany({
      where: { assigneeIds: user.id, status: TASK_STATUS.DONE },
      select: { size: true },
    }) as Promise<Pick<Task, 'size'>[]>,
  ]);
  return {
    [BADGE_METRIC.POINTS]: entries.reduce((sum, e) => sum + (e.points || 0), 0),
    [BADGE_METRIC.WORKLOG_STREAK]: longestStreak(days),
    [BADGE_METRIC.WORKLOG_DAYS]: days.length,
    [BADGE_METRIC.TASKS_DONE]: doneTasks.length,
    [BADGE_METRIC.MAJOR_TASKS_DONE]: doneTasks.filter(
      (t) => t.size === TASK_SIZE.MAJOR,
    ).length,
    [BADGE_METRIC.DAYS_ON_PORTAL]: user.createdAt
      ? Math.max(0, dayjs().diff(dayjs(user.createdAt), 'day'))
      : 0,
  };
}

export interface BadgeProgress {
  badge: Badge;
  value: number;
  earnedAt: string | null;
}

/**
 * Works out the user's numbers, awards any badge they have reached and not
 * yet received, and returns every active badge with their progress. Earned
 * badges stay earned even if the rule changes later.
 */
export async function awardAndListBadges(user: {
  id: string;
  createdAt?: string | Date | null;
}): Promise<BadgeProgress[]> {
  const [badges, owned, metrics] = await Promise.all([
    db.badge.findMany({
      where: { isActive: true },
      orderBy: { threshold: 'asc' },
    }) as Promise<Badge[]>,
    db.userBadge.findMany({ where: { userId: user.id } }) as Promise<
      UserBadge[]
    >,
    getUserMetrics(user),
  ]);

  const earned = new Map(owned.map((ub) => [ub.badgeId, ub]));
  const now = new Date().toISOString();
  const fresh = badges.filter(
    (b) => !earned.has(b.id) && (metrics[b.metric] ?? 0) >= b.threshold,
  );
  if (fresh.length) {
    await db.userBadge.createMany({
      data: fresh.map((b) => ({
        userId: user.id,
        badgeId: b.id,
        earnedAt: now,
        createdAt: now,
        updatedAt: now,
      })),
    });
    fresh.forEach((b) =>
      earned.set(b.id, { badgeId: b.id, earnedAt: now } as UserBadge),
    );
  }

  return badges.map((badge) => ({
    badge,
    value: metrics[badge.metric] ?? 0,
    earnedAt: earned.has(badge.id)
      ? String(earned.get(badge.id)!.earnedAt)
      : null,
  }));
}
