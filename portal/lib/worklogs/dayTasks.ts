import { db } from '@/lib/mongodb/db-client';
import type { WorklogLink, WorkLogs } from '@/models/worklogs';
import type { Project, Task } from '@/models/workspace';
import { OPEN_TASK_STATUSES, TASK_STATUS } from '@/models/workspace';
import { LOGLINKTYPE } from '@/utils/@types/interfaces';

import { lineKey, normalizeLine } from './lines';
import type { PointEvent } from './timeline';
import { appendEvents, POINT_STATUSES, sectionLines } from './timeline';

/*
 * Tasks on a day's worklog. A task is a work point, so a person's tasks for
 * a day (scheduled for it or due on it) show up on that day's worklog by
 * themselves, and any other task of theirs can be put on a day by hand. Each
 * goes in its project's section, linked to the task. A task put on a day once
 * is not put back after it is taken off. Server only.
 */

type Section = { link_id?: string; content?: string; [k: string]: unknown };

const sectionsOf = (works: unknown): Section[] =>
  Array.isArray(works) ? (works as Section[]) : [];

const dayTitle = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  const month = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const weekday = d.toLocaleString('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  });
  return `${month} ${String(d.getUTCDate()).padStart(2, '0')}  - ${weekday}`;
};

const emptyBullet = (content: string) => content.replace(/[*\s]/g, '') === '';

/** The line a task is written as: under way ones are marked doing. */
const taskLine = (task: Task) =>
  task.status === TASK_STATUS.IN_PROGRESS ||
  task.status === TASK_STATUS.IN_REVIEW
    ? `* ${POINT_STATUSES.doing.emoji} ${normalizeLine(task.title)}`
    : `* ${normalizeLine(task.title)}`;

/** Open tasks of the person that are for `day` or due on it. */
export async function tasksForDay(userId: string, day: string) {
  const tasks: Task[] = await db.task.findMany({
    where: {
      assigneeIds: userId,
      status: { in: OPEN_TASK_STATUSES },
      OR: [{ forDate: day }, { dueDate: { startsWith: day } }],
    },
    take: 50,
  });
  return tasks;
}

/**
 * Puts tasks on the person's worklog for `day`: the given ones, or (with
 * `due`) every open task of theirs for that day not put there before.
 * Returns how many lines were added.
 */
export async function addTasksToDay(
  userId: string,
  day: string,
  { taskIds, due }: { taskIds?: string[]; due?: boolean },
) {
  const existing: WorkLogs | null = await db.workLogs.findFirst({
    where: { userId, logType: 'dayLog', date: day },
    orderBy: { updatedAt: 'desc' },
  });
  const already = new Set(existing?.addedTaskIds ?? []);
  let tasks: Task[] = [];
  if (taskIds?.length)
    tasks = await db.task.findMany({
      where: { id: { in: taskIds.slice(0, 30) }, assigneeIds: userId },
    });
  else if (due)
    tasks = (await tasksForDay(userId, day)).filter((t) => !already.has(t.id));
  tasks = tasks.filter(
    (t) =>
      t.status !== TASK_STATUS.ARCHIVED && t.status !== TASK_STATUS.IGNORED,
  );
  if (!tasks.length) return { added: 0 };

  const links = [...((existing?.links ?? []) as WorklogLink[])];
  // Already a point on the day, by its link or by the same words.
  const onDay = new Set(links.map((l) => l.taskId).filter(Boolean));
  const keys = new Set(sectionLines(existing?.works).map((l) => l.key));
  const projects: Project[] = await db.project.findMany({
    where: { id: { in: Array.from(new Set(tasks.map((t) => t.projectId))) } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(projects.map((p) => [p.id, p.name]));

  const works = sectionsOf(existing?.works).map((s) => ({ ...s }));
  if (!works.length)
    works.push({
      link_type: LOGLINKTYPE.GENERAL,
      link_id: 'general',
      title: 'General',
      icon: 'work',
      content: '* ',
    });
  const events: PointEvent[] = [];
  const at = new Date().toISOString();
  let added = 0;
  for (const task of tasks) {
    already.add(task.id);
    if (onDay.has(task.id)) continue;
    const raw = taskLine(task);
    const key = lineKey(raw);
    if (!keys.has(key)) {
      let index = works.findIndex((s) => s.link_id === task.projectId);
      if (index < 0) {
        works.push({
          link_type: LOGLINKTYPE.PROJECT,
          link_id: task.projectId,
          title: nameOf.get(task.projectId) ?? 'Project',
          icon: 'work',
          content: '',
        });
        index = works.length - 1;
      }
      const content = works[index].content ?? '';
      works[index] = {
        ...works[index],
        content: emptyBullet(content)
          ? raw
          : `${content.replace(/\n+$/, '')}\n${raw}`,
      };
      keys.add(key);
      events.push({
        key,
        at,
        status: raw.includes(POINT_STATUSES.doing.emoji) ? 'doing' : null,
        note: 'Added from tasks',
        by: 'person',
      });
    }
    const link: WorklogLink = {
      key,
      text: normalizeLine(raw),
      isPrivate: false,
      companyId: task.companyId,
      projectId: task.projectId,
      taskId: task.id,
      confidence: 1,
      source: 'user',
    };
    const linkIndex = links.findIndex((l) => l.key === key);
    if (linkIndex >= 0) links[linkIndex] = { ...links[linkIndex], ...link };
    else links.push(link);
    onDay.add(task.id);
    added += 1;
  }

  const now = new Date();
  const data = {
    works,
    links,
    timeline: appendEvents(existing?.timeline as PointEvent[], events),
    addedTaskIds: Array.from(already).slice(-500),
    updatedAt: now,
  };
  if (existing) await db.workLogs.update({ where: { id: existing.id }, data });
  else
    await db.workLogs.create({
      data: {
        userId,
        logType: 'dayLog',
        date: day,
        title: dayTitle(day),
        createdAt: now,
        ...data,
      },
    });
  return { added };
}
