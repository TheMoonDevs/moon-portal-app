import dayjs from 'dayjs';

import { db } from '@/lib/mongodb/db-client';
import { FINISH_POINTS } from '@/lib/progress/buff';
import { publicWorklog } from '@/lib/worklogs/personal';
import type { Badge, PointEntry, UserBadge } from '@/models/progress';
import { BADGE_METRIC, POINT_SOURCE } from '@/models/progress';
import type { Task, WorkPoint } from '@/models/workspace';
import { TASK_SIZE, TASK_STATUS } from '@/models/workspace';

/** Points for finishing a task, per assignee. */
export const TASK_POINTS: Record<TASK_SIZE, number> = FINISH_POINTS;

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

/**
 * People's work points logged between two days (YYYY-MM-DD, inclusive) and
 * the tasks they are under, for workScore.
 */
export async function workInRange(
  userIds: string[],
  from: string,
  to: string,
): Promise<{
  points: Pick<WorkPoint, 'userId' | 'taskId' | 'date' | 'status' | 'text'>[];
  tasks: Map<string, Pick<Task, 'id' | 'size' | 'status' | 'companyId'>>;
}> {
  if (!userIds.length) return { points: [], tasks: new Map() };
  const points = await db.workPoint.findMany({
    where: { userId: { in: userIds }, date: { gte: from, lte: to } },
    select: {
      userId: true,
      taskId: true,
      date: true,
      status: true,
      text: true,
    },
  });
  const ids = Array.from(new Set(points.map((p: WorkPoint) => p.taskId)));
  const tasks: Pick<Task, 'id' | 'size' | 'status' | 'companyId'>[] = ids.length
    ? await db.task.findMany({
        where: { id: { in: ids } },
        select: { id: true, size: true, status: true, companyId: true },
      })
    : [];
  return { points, tasks: new Map(tasks.map((t) => [t.id, t])) };
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

/**
 * Sorted unique days on which the user wrote something in their worklog.
 * Badges are public, so personal (`p:`) lines alone do not make a day.
 */
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
            !!l.date && hasContent(publicWorklog(l)),
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
