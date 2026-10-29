import { db } from '@/lib/mongodb/db-client';
import { lineKey, normalizeLine } from '@/lib/worklogs/lines';
import type { PointEvent } from '@/lib/worklogs/timeline';
import {
  ARCHIVED_EMOJI,
  CLAUDE_SECTION_ID,
  POINT_STATUSES,
} from '@/lib/worklogs/timeline';
import type { WorklogLink, WorkLogs } from '@/models/worklogs';
import type { Task, WorkPoint } from '@/models/workspace';
import { TASK_STATUS } from '@/models/workspace';
import { LOGLINKTYPE } from '@/utils/@types/interfaces';

/*
 * The day's worklog as markdown, written from the person's tasks and work
 * points, for the screens that still read worklogs (leaderboard, badge,
 * summaries, the World, project worklogs, reminders). It is a copy: the
 * tasks and points are what count. A day typed before the move to tasks is
 * never overwritten.
 */

const dayTitle = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  const month = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const weekday = d.toLocaleString('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  });
  return `${month} ${String(d.getUTCDate()).padStart(2, '0')}  - ${weekday}`;
};

/** The status emoji a task shows as on a worklog line. */
export function taskEmoji(task: Pick<Task, 'status' | 'flag'>) {
  if (task.status === TASK_STATUS.DONE) return POINT_STATUSES.done.emoji;
  if (
    task.status === TASK_STATUS.ARCHIVED ||
    task.status === TASK_STATUS.IGNORED
  )
    return ARCHIVED_EMOJI;
  if (task.flag === 'blocked') return POINT_STATUSES.blocked.emoji;
  if (task.flag === 'waiting') return POINT_STATUSES.waiting.emoji;
  if (
    task.status === TASK_STATUS.IN_PROGRESS ||
    task.status === TASK_STATUS.IN_REVIEW
  )
    return POINT_STATUSES.doing.emoji;
  return '';
}

const ownerOnly = (t: Pick<Task, 'companyId' | 'projectId'>) =>
  !t.projectId && (!t.companyId || t.companyId === 'personal');

/** The worklog line for a task. */
export function taskLine(task: Task) {
  const emoji = taskEmoji(task);
  return `* ${ownerOnly(task) ? 'p: ' : ''}${emoji ? `${emoji} ` : ''}${normalizeLine(task.title)}`;
}

export async function renderDay(userId: string, date: string) {
  // Imported here, as the day's loader imports this file.
  const { loadDay } = await import('./server');
  const existing: WorkLogs | null = await db.workLogs.findFirst({
    where: { userId, logType: 'dayLog', date },
    orderBy: { updatedAt: 'desc' },
  });
  if (existing && !existing.tasksFirst) return existing;

  const { tasks, points } = await loadDay(userId, date);
  const mine = tasks.filter((t) => t.title.trim());
  const dayPoints = points.filter(
    (p: WorkPoint) => p.date === date && p.userId === userId,
  );

  const general = mine.filter((t) => !t.projectId);
  const projectIds = Array.from(
    new Set(mine.map((t) => t.projectId).filter(Boolean)),
  );
  const projects: { id: string; name: string }[] = projectIds.length
    ? await db.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, name: true },
      })
    : [];
  const works = [
    {
      link_type: LOGLINKTYPE.GENERAL,
      link_id: 'general',
      title: 'General',
      icon: 'work',
      content: general.map(taskLine).join('\n') || '* ',
    },
    ...projectIds.map((id) => ({
      link_type: LOGLINKTYPE.PROJECT,
      link_id: id,
      title: projects.find((p) => p.id === id)?.name ?? 'Project',
      icon: 'work',
      content: mine
        .filter((t) => t.projectId === id)
        .map(taskLine)
        .join('\n'),
    })),
  ];
  // The bots' points of the day, as their own lines.
  const taskOf = new Map(mine.map((t) => [t.id, t]));
  const botPoints = dayPoints.filter((p) => p.by !== 'person');
  if (botPoints.length)
    works.push({
      link_type: LOGLINKTYPE.GENERAL,
      link_id: CLAUDE_SECTION_ID,
      title: 'Claude',
      icon: 'smart_toy',
      content: botPoints
        .map((p) => {
          const task = taskOf.get(p.taskId);
          const emoji = p.status ? POINT_STATUSES[p.status].emoji : '';
          const text = normalizeLine(p.text || task?.title || '');
          const priv = task && ownerOnly(task) ? 'p: ' : '';
          return `* ${priv}${emoji ? `${emoji} ` : ''}${text}`;
        })
        .filter((l) => l.replace(/[^\p{L}\p{N}]/gu, '').length >= 3)
        .join('\n'),
    });

  const links: WorklogLink[] = mine.map((t) => ({
    key: lineKey(taskLine(t)),
    text: normalizeLine(t.title),
    isPrivate: ownerOnly(t),
    companyId: t.companyId || null,
    projectId: t.projectId || null,
    taskId: t.id,
    confidence: 1,
    source: 'user',
  }));
  const timeline: PointEvent[] = dayPoints
    .filter((p) => taskOf.has(p.taskId))
    .map((p) => ({
      key: lineKey(taskLine(taskOf.get(p.taskId)!)),
      at: p.at,
      status: p.status ?? null,
      ...(p.text && { note: p.text }),
      by: p.by === 'person' ? ('person' as const) : ('claude' as const),
    }));

  const now = new Date();
  const data = { works, links, timeline, tasksFirst: true, updatedAt: now };
  if (existing) return db.workLogs.update({ where: { id: existing.id }, data });
  // Nothing to keep for a day with nothing on it.
  if (!mine.length) return null;
  return db.workLogs.create({
    data: {
      ...data,
      userId,
      logType: 'dayLog',
      date,
      title: dayTitle(date),
      createdAt: now,
    },
  });
}
