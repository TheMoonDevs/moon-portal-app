import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import { syncTaskPoints } from '@/lib/progress/server';
import { localClock } from '@/lib/push/dayReminders';
import type { LinkCandidates } from '@/lib/worklogs/linker';
import { guessPlaces, linkCandidates } from '@/lib/worklogs/linker';
import { PERSONAL_COMPANY_ID, PERSONAL_TITLE } from '@/lib/worklogs/personal';
import { fitGoal } from '@/lib/workspace/goalFit';
import type { Task, WorkPoint, WorkPointStatus } from '@/models/workspace';
import { OPEN_TASK_STATUSES, TASK_SIZE, TASK_STATUS } from '@/models/workspace';

import { renderDay } from './render';

/*
 * Tasks first: a task is the one thing a person plans and finishes, and
 * work points are what gets logged under it, by the person or by a bot. A
 * person's day is the tasks planned for it, the ones still pending from
 * before, and the ones worked on or finished that day. Nothing is carried
 * between days: an unfinished task stays pending until it is done or
 * archived. Server only.
 */

export const PERSONAL = PERSONAL_COMPANY_ID;

/** Closed: nothing more to do on it. */
export const CLOSED_STATUSES: string[] = [
  TASK_STATUS.DONE,
  TASK_STATUS.ARCHIVED,
  TASK_STATUS.IGNORED,
];

/** A point status, or the two a person can also set on a task. */
export type TaskMove = WorkPointStatus | 'todo' | 'archived';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const isDay = (value: unknown): value is string =>
  typeof value === 'string' && DAY.test(value);

/** The person's own today, in their timezone. */
export async function todayOf(userId: string) {
  const user = await db.user.findFirst({
    where: { id: userId },
    select: { timezone: true },
  });
  return localClock(user?.timezone, new Date()).date;
}

/** Their own work: written by them, or theirs to do. */
export const isMine = (task: Task, userId: string) =>
  task.ownerId === userId ||
  task.createdById === userId ||
  (task.assigneeIds ?? []).includes(userId);

/** Seen by its owner only: personal, or not placed yet. */
export const isOwnerOnly = (task: Pick<Task, 'companyId' | 'projectId'>) =>
  !task.projectId && (!task.companyId || task.companyId === PERSONAL);

/** Tasks a person can see as theirs. */
export const mineWhere = (userId: string) => ({
  OR: [{ ownerId: userId }, { assigneeIds: userId }],
});

const nowIso = () => new Date().toISOString();

/**
 * Moves a task: to do, under way, blocked or waiting, done, not done (it
 * stays open) or archived, with a work point that says so. The day sheets
 * it is on are written again for the screens that still read them.
 */
export async function moveTask(
  task: Task,
  to: TaskMove,
  options: {
    userId: string;
    /** `person`, `claude` or another bot. */
    by?: string;
    note?: string;
    /** The day the point is logged on; the person's today by default. */
    date?: string;
  },
): Promise<Task> {
  const { userId } = options;
  const by = options.by ?? 'person';
  const date = options.date ?? (await todayOf(userId));
  const at = nowIso();
  const data: Partial<Task> = { updatedAt: at, flag: null };
  const done = to === 'done';
  if (done) {
    data.status = TASK_STATUS.DONE;
    if (task.status !== TASK_STATUS.DONE) {
      data.completedAt = at;
      data.completedByIds = [userId];
      // Whoever did it shares its points.
      data.assigneeIds = Array.from(
        new Set([...(task.assigneeIds ?? []), userId]),
      );
    }
  } else {
    data.completedAt = null;
    data.completedByIds = [];
    if (to === 'archived') data.status = TASK_STATUS.ARCHIVED;
    else if (to === 'todo') data.status = TASK_STATUS.TODO;
    else if (to === 'not_done')
      // Not done today: it stays to do (or under way) for another day.
      data.status =
        task.status === TASK_STATUS.IN_PROGRESS ||
        task.status === TASK_STATUS.IN_REVIEW
          ? task.status
          : TASK_STATUS.TODO;
    else {
      data.status =
        task.status === TASK_STATUS.IN_REVIEW
          ? TASK_STATUS.IN_REVIEW
          : TASK_STATUS.IN_PROGRESS;
      if (to === 'blocked' || to === 'waiting') data.flag = to;
    }
    if (
      (data.status === TASK_STATUS.IN_PROGRESS || to === 'doing') &&
      !task.startedAt
    )
      data.startedAt = at;
  }
  let updated: Task = await db.task.update({ where: { id: task.id }, data });
  if (updated.projectId) {
    if (done) updated = await fitGoal(updated);
    await syncTaskPoints(updated);
  }
  if (to !== 'todo' || task.status !== TASK_STATUS.TODO)
    await addPoint({
      task: updated,
      userId,
      date,
      text: options.note?.trim() ?? '',
      status: to === 'todo' || to === 'archived' ? null : to,
      by,
      ...(to === 'archived' && !options.note && { text: 'Archived' }),
      ...(to === 'todo' && !options.note && { text: 'Opened again' }),
    });
  await renderDays(userId, [date, updated.forDate]);
  return updated;
}

/** Logs one work point under a task. */
export async function addPoint(input: {
  task: Pick<Task, 'id' | 'companyId' | 'projectId'>;
  userId: string;
  date: string;
  text: string;
  status?: WorkPointStatus | null;
  by?: string;
  at?: string;
}): Promise<WorkPoint> {
  const at = input.at ?? nowIso();
  return db.workPoint.create({
    data: {
      taskId: input.task.id,
      userId: input.userId,
      date: input.date,
      text: input.text.trim().slice(0, 500),
      status: input.status ?? null,
      by: input.by ?? 'person',
      at,
      isPrivate: isOwnerOnly(input.task),
      createdAt: at,
      updatedAt: at,
    },
  });
}

/** Where a person put a task, or asked it to be guessed. */
export type PlaceInput =
  | { projectId: string }
  | { companyId: string }
  | { personal: true }
  | { none: true };

/** A place sent by a screen, if it is one. */
export function readPlace(value: any): PlaceInput | null {
  if (!value || typeof value !== 'object') return null;
  if (value.personal === true) return { personal: true };
  if (value.none === true) return { none: true };
  if (typeof value.projectId === 'string')
    return { projectId: value.projectId };
  if (typeof value.companyId === 'string')
    return { companyId: value.companyId };
  return null;
}

export const TASK_MOVES: TaskMove[] = [
  'todo',
  'doing',
  'done',
  'not_done',
  'blocked',
  'waiting',
  'archived',
];

/** A place as task fields, checked against what the person can reach. */
export function placeFields(
  place: PlaceInput,
  candidates: LinkCandidates,
): Pick<Task, 'companyId' | 'projectId' | 'placedBy'> | null {
  if ('personal' in place)
    return {
      companyId: PERSONAL,
      projectId: null as any,
      placedBy: 'personal',
    };
  if ('none' in place)
    return {
      companyId: null as any,
      projectId: null as any,
      placedBy: 'user',
    };
  if ('projectId' in place) {
    const project = candidates.projects.find((p) => p.id === place.projectId);
    return project
      ? {
          companyId: project.companyId,
          projectId: project.id,
          placedBy: 'user',
        }
      : null;
  }
  const company = candidates.companies.find((c) => c.id === place.companyId);
  // Company work goes in its CORE project.
  return company
    ? {
        companyId: company.id,
        projectId: (company.coreProjectId ?? null) as any,
        placedBy: 'user',
      }
    : null;
}

/**
 * Places tasks that were not placed by hand from their words: Personal when
 * written so ("p: …", "P - …", "personal: …"), else a project, or a company
 * alone. Returns the tasks as saved.
 */
export async function placeByWords(
  tasks: Task[],
  candidates: LinkCandidates,
): Promise<Task[]> {
  const unplaced = tasks.filter((t) => !t.placedBy || t.placedBy === 'auto');
  const out = new Map(tasks.map((t) => [t.id, t]));
  for (const task of unplaced.filter((t) => PERSONAL_TITLE.test(t.title)))
    out.set(
      task.id,
      await db.task.update({
        where: { id: task.id },
        data: {
          ...placeFields({ personal: true }, candidates)!,
          updatedAt: nowIso(),
        },
      }),
    );
  const open = unplaced.filter(
    (t) =>
      !PERSONAL_TITLE.test(t.title) &&
      t.title.replace(/[^\p{L}\p{N}]/gu, '').length >= 3,
  );
  if (!open.length) return tasks.map((t) => out.get(t.id) ?? t);
  const guesses = await guessPlaces(
    open.map((t) => ({ key: t.id, text: t.title })),
    candidates,
  );
  for (const task of open) {
    const guess = guesses.get(task.id);
    const companyId = guess?.companyId ?? null;
    const projectId = guess?.projectId ?? null;
    if (
      (task.companyId || null) === companyId &&
      (task.projectId || null) === projectId &&
      task.placedBy === 'auto'
    )
      continue;
    if (!guess && !task.placedBy) continue;
    out.set(
      task.id,
      await db.task.update({
        where: { id: task.id },
        data: {
          companyId,
          projectId,
          placedBy: guess ? 'auto' : null,
          updatedAt: nowIso(),
        },
      }),
    );
  }
  return tasks.map((t) => out.get(t.id) ?? t);
}

/** A new task on the person's day sheet, after `afterId` when given. */
export async function createDayTask(
  user: SessionUser,
  input: {
    title: string;
    date: string;
    place?: PlaceInput | null;
    afterId?: string | null;
    by?: string;
    status?: TaskMove;
  },
  candidates?: LinkCandidates,
): Promise<Task> {
  const at = nowIso();
  const reach = candidates ?? (await linkCandidates(user));
  const placed = input.place ? placeFields(input.place, reach) : null;
  const order = await orderAfter(user.id, input.date, input.afterId);
  let task: Task = await db.task.create({
    data: {
      companyId: placed?.companyId ?? null,
      projectId: placed?.projectId ?? null,
      placedBy: placed?.placedBy ?? null,
      title: input.title.trim().slice(0, 200),
      size: TASK_SIZE.MINOR,
      status: TASK_STATUS.TODO,
      assigneeIds: [user.id],
      ownerId: user.id,
      createdById: user.id,
      madeBy: input.by ?? 'person',
      forDate: input.date,
      order,
      createdAt: at,
      updatedAt: at,
    },
  });
  if (!placed && task.title) [task] = await placeByWords([task], reach);
  if (input.status && input.status !== 'todo')
    task = await moveTask(task, input.status, {
      userId: user.id,
      by: input.by,
      date: input.date,
    });
  else await renderDays(user.id, [input.date]);
  return task;
}

/** An order number that puts a new task right after another on a day. */
async function orderAfter(
  userId: string,
  date: string,
  afterId?: string | null,
): Promise<number> {
  const day: Task[] = await db.task.findMany({
    where: { ...mineWhere(userId), forDate: date },
    select: { id: true, order: true, createdAt: true },
  });
  const orderOf = (t: Task) =>
    typeof t.order === 'number'
      ? t.order
      : new Date(t.createdAt as any).getTime();
  const sorted = day.map(orderOf).sort((a, b) => a - b);
  const after = afterId ? day.find((t) => t.id === afterId) : undefined;
  if (!after) return (sorted.at(-1) ?? Date.now()) + 1000;
  const from = orderOf(after);
  const next = sorted.find((o) => o > from);
  return next === undefined ? from + 1000 : (from + next) / 2;
}

/**
 * A person's day: the tasks on it with their points and the places they
 * can go. On today it includes every task still pending from before.
 */
export async function loadDay(userId: string, date: string) {
  const user = { id: userId };
  const today = await todayOf(userId);
  const dayPoints: WorkPoint[] = await db.workPoint.findMany({
    where: { userId: user.id, date },
    orderBy: { at: 'asc' },
    take: 500,
  });
  const pointTaskIds = Array.from(new Set(dayPoints.map((p) => p.taskId)));
  const ors: Record<string, unknown>[] = [
    { forDate: date },
    { completedAt: { gte: `${date}T00:00:00`, lte: `${date}T23:59:59.999Z` } },
  ];
  if (date === today)
    ors.push({
      forDate: { lt: date },
      status: { in: OPEN_TASK_STATUSES },
    });
  const [planned, worked]: [Task[], Task[]] = await Promise.all([
    db.task.findMany({
      where: { AND: [mineWhere(user.id), { OR: ors }] },
      take: 300,
    }),
    pointTaskIds.length
      ? db.task.findMany({ where: { id: { in: pointTaskIds } } })
      : [],
  ]);
  const byId = new Map<string, Task>();
  for (const t of [...planned, ...worked]) byId.set(t.id, t);
  const tasks = Array.from(byId.values())
    // Put away earlier: only on the day it was planned for.
    .filter(
      (t) =>
        !CLOSED_STATUSES.includes(t.status) ||
        t.forDate === date ||
        pointTaskIds.includes(t.id) ||
        t.status === TASK_STATUS.DONE,
    )
    // Someone else's task without a project is not theirs to see.
    .filter((t) => !isOwnerOnly(t) || isMine(t, user.id));
  const ids = tasks.map((t) => t.id);
  const points: WorkPoint[] = ids.length
    ? await db.workPoint.findMany({
        where: { taskId: { in: ids } },
        orderBy: { at: 'asc' },
        take: 1500,
      })
    : [];
  return {
    date,
    today,
    tasks: sortDay(tasks),
    // Others' private points stay theirs.
    points: points.filter((p) => !p.isPrivate || p.userId === user.id),
  };
}

const orderOf = (t: Task) =>
  typeof t.order === 'number'
    ? t.order
    : new Date(t.createdAt as any).getTime();

/** Pending from before first (oldest plan first), then the day in order. */
export const sortDay = (tasks: Task[]) =>
  tasks.slice().sort((a, b) => {
    const da = a.forDate ?? '';
    const db_ = b.forDate ?? '';
    if (da !== db_) return da.localeCompare(db_);
    return orderOf(a) - orderOf(b);
  });

/** Writes the day sheets again for the screens that still read worklogs. */
export async function renderDays(
  userId: string,
  dates: (string | null | undefined)[],
) {
  const unique = Array.from(new Set(dates.filter(isDay)));
  for (const date of unique) await renderDay(userId, date).catch(() => null);
}

/**
 * For a task's status changed elsewhere (the task screens, a bot's task
 * tools): the move goes on its history, and its days are written again.
 */
export async function noteStatusChange(
  before: Task,
  after: Task,
  userId: string,
  by = 'person',
) {
  if (after.status === before.status) return;
  const date = await todayOf(userId);
  const status =
    after.status === TASK_STATUS.DONE
      ? ('done' as const)
      : after.status === TASK_STATUS.IN_PROGRESS ||
          after.status === TASK_STATUS.IN_REVIEW
        ? ('doing' as const)
        : null;
  await addPoint({
    task: after,
    userId,
    date,
    text: status
      ? after.status === TASK_STATUS.IN_REVIEW
        ? 'Ready for review'
        : ''
      : after.status === TASK_STATUS.TODO
        ? 'Opened again'
        : 'Archived',
    status,
    by,
  });
  await renderDays(userId, [date, after.forDate]);
}
