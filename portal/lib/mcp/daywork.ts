import type { TaskMove } from '@/lib/daywork/server';
import {
  CLOSED_STATUSES,
  createDayTask,
  isMine,
  loadDay,
  mineWhere,
  moveTask,
  PERSONAL,
  renderDays,
} from '@/lib/daywork/server';
import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import type { LinkCandidates } from '@/lib/worklogs/linker';
import { linkCandidates } from '@/lib/worklogs/linker';
import { PERSONAL_COMPANY } from '@/lib/worklogs/personal';
import type { WorkLogs } from '@/models/worklogs';
import type { Task, WorkPoint } from '@/models/workspace';
import { TASK_SIZE, TASK_STATUS } from '@/models/workspace';

import { ToolError } from './shared';
import type { PointInput } from './worklog';
import { type PointTask, taskForPoint } from './workspace';

/*
 * The assistant's side of tasks first: every point it logs goes under one
 * of the person's tasks, found by its id or words, or a new task it makes
 * when there is none. Server only.
 */

/** Above this many tasks of its own in a day, log_work nudges towards notes. */
export const BOT_TASKS_PER_DAY_HINT = 4;

const same = (a: string, b: string) =>
  a.trim().toLowerCase().replace(/\s+/g, ' ') ===
  b.trim().toLowerCase().replace(/\s+/g, ' ');

const plain = (text: string) => text.replace(/[^\p{L}\p{N}]/gu, '');

/** A task as the assistant sees it. */
function taskView(task: Task, c: LinkCandidates) {
  const project = c.projects.find((p) => p.id === task.projectId);
  const company = c.companies.find((x) => x.id === task.companyId);
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    ...(task.flag && { flag: task.flag }),
    ...(project
      ? { project: project.name }
      : task.companyId === PERSONAL
        ? { project: PERSONAL_COMPANY.name }
        : company
          ? { company: company.name }
          : {}),
    ...(task.forDate && { forDate: task.forDate }),
    ...(task.madeBy && task.madeBy !== 'person' && { madeBy: task.madeBy }),
  };
}

/**
 * The person's task a point names: by id, or by its words among their open
 * tasks (then their recent ones).
 */
async function findMine(userId: string, ref: string): Promise<Task | null> {
  const id = ref.trim();
  if (/^[a-f0-9]{24}$/i.test(id)) {
    const task: Task | null = await db.task.findFirst({ where: { id } });
    if (task && isMine(task, userId)) return task;
    // A work point's id names its task too.
    const point: WorkPoint | null = await db.workPoint.findFirst({
      where: { id },
    });
    if (point?.userId === userId)
      return db.task.findFirst({ where: { id: point.taskId } });
  }
  const tasks: Task[] = await db.task.findMany({
    where: {
      AND: [
        mineWhere(userId),
        { status: { notIn: [TASK_STATUS.ARCHIVED, TASK_STATUS.IGNORED] } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: 400,
  });
  return (
    tasks.find((t) => same(t.title, ref) && t.status !== TASK_STATUS.DONE) ??
    tasks.find((t) => same(t.title, ref)) ??
    null
  );
}

const STOP = new Set(
  'the and for with from into onto of to in on at by an my our new task work make made do doing done add update fix this that it its'.split(
    ' ',
  ),
);

/** A title's meaningful words, roughly stemmed. */
const keywords = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w && !STOP.has(w))
      .map((w) => w.replace(/(ing|ed|es|s)$/, '') || w),
  );

/**
 * The person's open task that is plainly the same work as `text`: every
 * word of the shorter title is in the other, and there are at least two.
 * Keeps a session on the task it belongs to when the words differ a little.
 */
async function findSimilar(userId: string, text: string) {
  const want = keywords(text);
  if (want.size < 2) return null;
  const since = new Date(Date.now() - 21 * 86400000).toISOString();
  const open: Task[] = await db.task.findMany({
    where: {
      AND: [
        mineWhere(userId),
        {
          status: {
            notIn: [
              TASK_STATUS.DONE,
              TASK_STATUS.ARCHIVED,
              TASK_STATUS.IGNORED,
            ],
          },
        },
        { updatedAt: { gte: since } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
  let best: { task: Task; shared: number } | null = null;
  for (const task of open) {
    if (task.scheduleId) continue;
    const have = keywords(task.title ?? '');
    const shared = Array.from(want).filter((w) => have.has(w)).length;
    const within = shared === Math.min(want.size, have.size);
    if (shared >= 2 && within && (!best || shared > best.shared))
      best = { task, shared };
  }
  return best?.task ?? null;
}

/** Where a new task goes, from what the assistant said. */
function placeFor(point: PointInput, c: LinkCandidates) {
  if (point.personal) return { personal: true as const };
  const name = point.company ?? point.project;
  const company = name
    ? c.companies.find((x) => x.id === name || same(x.name, name))
    : undefined;
  return company ? { companyId: company.id } : null;
}

type Logged = {
  task: string;
  title: string;
  status: string;
  created?: boolean;
  matched?: string;
  completed?: boolean;
  project?: string | null;
  company?: string;
  problem?: string;
};

/**
 * Logs the assistant's points for `date`. Each goes under a task: the one
 * `point`, `task` or `typedLine` names, the person's open task with the same
 * words, a project task (found or made, as before), or else a new task of
 * the assistant's own, placed from its words. The point moves the task (a
 * done point finishes it, but a major task only with `completeTask`).
 */
export async function logWork(
  user: SessionUser,
  points: (PointInput & PointTask)[],
  date: string,
) {
  const candidates = await linkCandidates(user);
  const logged: Logged[] = [];
  let guided = 0;
  let made = 0;
  for (const point of points) {
    const problems: string[] = [];
    let task: Task | null = null;
    let created = false;
    for (const ref of [point.point, point.typedLine, point.task]) {
      if (!task && ref?.trim()) task = await findMine(user.id, ref);
    }
    if (!task && point.text) task = await findMine(user.id, point.text);
    // Nearly the same words as an open task: the same work.
    let similar = false;
    for (const ref of [point.task, point.text]) {
      if (task || point.goal || !ref?.trim()) continue;
      task = await findSimilar(user.id, ref);
      similar = !!task;
    }
    // A project named: its task, found or made (a scheduled task's run).
    if (
      !task &&
      !point.personal &&
      point.project &&
      (point.task || point.goal || point.text)
    ) {
      try {
        const found = await taskForPoint(
          user,
          { ...point, task: point.task ?? point.text },
          date,
        );
        if (found) {
          task = found.task;
          created = found.created;
          if (created)
            task = await db.task.update({
              where: { id: task!.id },
              data: { ownerId: user.id, madeBy: 'claude', placedBy: 'user' },
            });
        }
      } catch (error) {
        if (!(error instanceof ToolError)) throw error;
        problems.push(error.message);
      }
    }
    if (!task) {
      // A new task is named by its words, never by a reference that matched
      // nothing (an id or a made-up word).
      const title = (point.task || point.text || '').trim();
      if (plain(title).length < 3) {
        logged.push({
          task: '',
          title: point.point ?? title,
          status: point.status,
          problem: point.point
            ? `No task matches "${point.point}". Name one from todayTasks or myTasks, or give text with a short name for a new task.`
            : 'No task was found for it. Give the point some words.',
        });
        continue;
      }
      task = await createDayTask(
        user,
        {
          title,
          date: point.forDate ?? date,
          place: placeFor(point, candidates),
          by: 'claude',
        },
        candidates,
      );
      created = true;
      made += 1;
    }

    const finish =
      point.status !== 'done' ||
      task.size !== TASK_SIZE.MAJOR ||
      point.completeTask ||
      task.status === TASK_STATUS.DONE;
    // A major task stays under way until it is finished on purpose.
    const move: TaskMove = finish ? point.status : 'doing';
    const note =
      point.note?.trim() ||
      (point.text && !same(point.text, task.title) ? point.text : '') ||
      (!finish ? 'A part of it is done' : '');
    // The same status again with nothing new to say is not a point.
    if (!created && !note && move === statusOfTask(task)) {
      logged.push({
        ...taskView(task, candidates),
        task: task.id,
        problem: `Already ${move}; nothing logged. Log a status only when it changes, or say what happened in note.`,
      });
      continue;
    }
    if (task.flag === 'waiting' && point.status !== 'waiting') guided += 1;
    task = await moveTask(task, move, {
      userId: user.id,
      by: point.byPerson ? 'person' : 'claude',
      note,
      date,
    });
    logged.push({
      ...taskView(task, candidates),
      task: task.id,
      ...(created && { created: true }),
      ...(similar && {
        matched: `Logged under your open task "${task.title}", which is the same work. Name it with point from now on.`,
      }),
      ...(move === 'done' && { completed: true }),
      ...(problems.length && { problem: problems.join(' ') }),
    });
  }

  if (guided) {
    // Each point that was waiting on the person and moved on is a time
    // they guided their assistant.
    const log: WorkLogs | null = await db.workLogs.findFirst({
      where: { userId: user.id, logType: 'dayLog', date },
      orderBy: { updatedAt: 'desc' },
    });
    if (log)
      await db.workLogs.update({
        where: { id: log.id },
        data: { guidance: (log.guidance ?? 0) + guided },
      });
  }
  const mine = made
    ? await db.task.count({
        where: { ownerId: user.id, madeBy: 'claude', forDate: date },
      })
    : 0;
  return {
    date,
    logged,
    ...(mine > BOT_TASKS_PER_DAY_HINT && {
      hint: `You made ${mine} tasks today. Keep it to one task per deliverable, and log rounds, versions and fixes as a note on its task (point + note) instead.`,
    }),
  };
}

/** The person's day for get_context: its tasks, with who logged on them. */
export async function todayTasks(user: SessionUser, date: string) {
  const [{ tasks, points }, candidates] = await Promise.all([
    loadDay(user.id, date),
    linkCandidates(user),
  ]);
  return tasks
    .filter((t) => t.title.trim())
    .map((t) => {
      const mine = points.filter((p) => p.taskId === t.id);
      const last = mine.at(-1);
      return {
        ...taskView(t, candidates),
        ...(t.forDate &&
          t.forDate < date &&
          !CLOSED_STATUSES.includes(t.status) && { pendingSince: t.forDate }),
        ...(mine.length && {
          points: mine.length,
          lastPoint: { by: last!.by, text: last!.text, at: last!.at },
        }),
      };
    });
}

export type TidyInput = {
  text: string;
  status: PointInput['status'];
  /** Ids or titles of the assistant's tasks this one replaces. */
  merge: string[];
};

/**
 * Turns several tasks the assistant made into fewer. The first task merged
 * into each new one keeps going under the new words, the others' points
 * move onto it and they are archived; dropped ones are archived. Only the
 * assistant's own tasks can be merged or dropped.
 */
export async function tidyTasks(
  user: SessionUser,
  groups: TidyInput[],
  drop: string[],
  date: string,
) {
  const day = await loadDay(user.id, date);
  const theirs = day.tasks.filter((t) => t.madeBy && t.madeBy !== 'person');
  const find = (ref: string) =>
    theirs.find((t) => t.id === ref.trim() || same(t.title, ref));
  const claimed = new Map<string, number>();
  const unknown: string[] = [];
  const claim = (ref: string, owner: number) => {
    const task = find(ref);
    if (!task) return unknown.push(ref);
    if (claimed.has(task.id) && claimed.get(task.id) !== owner)
      throw new ToolError(`"${task.title}" is merged into two tasks.`);
    claimed.set(task.id, owner);
  };
  groups.forEach((g, i) => g.merge.forEach((ref) => claim(ref, i)));
  drop.forEach((ref) => claim(ref, -1));
  if (unknown.length)
    throw new ToolError(
      `Not a task you made on ${date}: ${unknown.map((u) => `"${u}"`).join(', ')}. Tasks the person wrote cannot be tidied.`,
    );
  if (groups.some((g, i) => !theirs.some((t) => claimed.get(t.id) === i)))
    throw new ToolError('Each new task must merge at least one of yours.');

  const at = new Date().toISOString();
  const kept: Task[] = [];
  for (const [i, group] of Array.from(groups.entries())) {
    const merged = theirs.filter((t) => claimed.get(t.id) === i);
    const [first, ...rest] = merged;
    let task: Task = await db.task.update({
      where: { id: first.id },
      data: { title: group.text.trim().slice(0, 200), updatedAt: at },
    });
    for (const other of rest) {
      await db.workPoint.updateMany({
        where: { taskId: other.id },
        data: { taskId: task.id, updatedAt: at },
      });
      await moveTask(other, 'archived', {
        userId: user.id,
        by: 'claude',
        note: `Merged into "${task.title}"`,
        date,
      });
    }
    if (group.status !== statusOfTask(task))
      task = await moveTask(task, group.status, {
        userId: user.id,
        by: 'claude',
        date,
      });
    kept.push(task);
  }
  for (const task of theirs.filter((t) => claimed.get(t.id) === -1))
    await moveTask(task, 'archived', {
      userId: user.id,
      by: 'claude',
      note: 'Dropped when tidying',
      date,
    });
  await renderDays(user.id, [date]);
  const candidates = await linkCandidates(user);
  return {
    date,
    before: claimed.size,
    after: kept.length,
    tasks: kept.map((t) => taskView(t, candidates)),
    ...(drop.length && { dropped: drop.length }),
  };
}

const statusOfTask = (task: Task) =>
  task.status === TASK_STATUS.DONE
    ? 'done'
    : task.flag
      ? task.flag
      : task.status === TASK_STATUS.IN_PROGRESS
        ? 'doing'
        : null;
