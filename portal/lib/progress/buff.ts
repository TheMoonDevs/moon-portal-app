/*
 * Monthly "buff": the month's points set the level shown on the worklogs
 * page and the leaderboard. Points come from tasks and their work points
 * (see workScore); the worklog line counts below are kept for days typed
 * before tasks. Pure, so the browser and the server agree.
 */

import { lineKey, PRIVATE_LINE } from '@/lib/worklogs/lines';
import type { Task, WorkPoint } from '@/models/workspace';
import { TASK_SIZE, TASK_STATUS } from '@/models/workspace';

export enum BUFF_LEVEL {
  TRUTH_SEEKER = 'TRUTH_SEEKER',
  BABY_GROOT = 'BABY_GROOT',
  WORK_HULK = 'WORK_HULK',
  VAMPIRE_LORD = 'VAMPIRE_LORD',
  ALIEN_PREDATOR = 'ALIEN_PREDATOR',
  DEVIL = 'DEVIL',
}

export interface BuffInfo {
  level: BUFF_LEVEL;
  marker: number;
  /** Points where the next level starts. */
  next: number;
  title: string;
  src: string;
}

const LEVELS: BuffInfo[] = [
  {
    level: BUFF_LEVEL.TRUTH_SEEKER,
    marker: 1,
    next: 10,
    title: 'Tiny Chirp',
    src: '/images/buff/tinyChirp.png',
  },
  {
    level: BUFF_LEVEL.BABY_GROOT,
    marker: 10,
    next: 25,
    title: 'Baby Groot',
    src: '/images/buff/babyGroot.png',
  },
  {
    level: BUFF_LEVEL.WORK_HULK,
    marker: 25,
    next: 100,
    title: 'Work Hulk',
    src: '/images/buff/workHulk.png',
  },
  {
    level: BUFF_LEVEL.VAMPIRE_LORD,
    marker: 100,
    next: 150,
    title: 'Vampire Streak',
    src: '/images/buff/vampireLord.png',
  },
  {
    level: BUFF_LEVEL.ALIEN_PREDATOR,
    marker: 150,
    next: 200,
    title: 'Dragon Force',
    src: '/images/buff/dragonForce.png',
  },
  {
    level: BUFF_LEVEL.DEVIL,
    marker: 200,
    next: 250,
    title: 'Moon Devil',
    src: '/images/buff/moonDevil.png',
  },
];

export const getBuffLevelAndTitle = (points: number): BuffInfo =>
  [...LEVELS].reverse().find((l) => points >= l.marker && l.marker > 1) ??
  LEVELS[0];

/** The level after this one, or null at the top. */
export const nextBuffLevel = (level: BUFF_LEVEL): BuffInfo | null =>
  LEVELS[LEVELS.findIndex((l) => l.level === level) + 1] ?? null;

/* ------------------------------ from tasks ------------------------------- */

/** Points for finishing a task, on top of its days of work. */
export const FINISH_POINTS: Record<TASK_SIZE, number> = {
  [TASK_SIZE.MAJOR]: 3,
  [TASK_SIZE.MINOR]: 1,
};

type ScorePoint = Pick<WorkPoint, 'taskId' | 'date' | 'status' | 'text'>;
type ScoreTask = Pick<Task, 'size' | 'status'>;

/**
 * Work on a task, not bookkeeping: "not done", and archiving or opening a
 * task again, are moves rather than work.
 */
export const isWorkedPoint = (p: ScorePoint) =>
  p.status !== 'not_done' &&
  !(!p.status && /^(archived|opened again)$/i.test((p.text ?? '').trim()));

export interface WorkScore {
  points: number;
  /** A task worked on, once per day it was worked on. */
  taskDays: number;
  /** Tasks finished. */
  finished: number;
  /** Days with any work. */
  days: number;
}

/**
 * A person's score over some days, from their work points. Each day a task
 * gets work is a point, however many notes it gets that day (so a bot's
 * many points count no more than one line did), and finishing a task adds
 * its size's points. Tasks only waiting on the sheet, or planned and not
 * started, earn nothing. Only points whose task is in `tasks` count, so a
 * caller can narrow to one company.
 */
export function workScore(
  points: ScorePoint[],
  tasks: Map<string, ScoreTask>,
): WorkScore {
  const taskDays = new Set<string>();
  const days = new Set<string>();
  const finished = new Set<string>();
  for (const p of points) {
    const task = tasks.get(p.taskId);
    if (!task || !isWorkedPoint(p)) continue;
    taskDays.add(`${p.taskId}|${p.date}`);
    days.add(p.date);
    if (p.status === 'done' && task.status === TASK_STATUS.DONE)
      finished.add(p.taskId);
  }
  let bonus = 0;
  finished.forEach((id) => (bonus += FINISH_POINTS[tasks.get(id)!.size] ?? 1));
  return {
    points: taskDays.size + bonus,
    taskDays: taskDays.size,
    finished: finished.size,
    days: days.size,
  };
}

export const getColorsForBuffLevel = (level: BUFF_LEVEL) => {
  switch (level) {
    case BUFF_LEVEL.TRUTH_SEEKER:
      return ['#FF8041', '#FF8041'];
    case BUFF_LEVEL.BABY_GROOT:
      return ['#4caf50', '#81c784'];
    case BUFF_LEVEL.WORK_HULK:
      return ['#f44336', '#ef5350'];
    case BUFF_LEVEL.VAMPIRE_LORD:
      return ['#f44336', '#d50000'];
    case BUFF_LEVEL.ALIEN_PREDATOR:
      return ['#f44336', '#FFAB36'];
    case BUFF_LEVEL.DEVIL:
      return ['#C677FF', '#D69CFF'];
    default:
      return ['#e0e0e0', '#9e9e9e'];
  }
};

export const isValidContent = (content: string) => {
  const trimmed = content.trim();
  return trimmed.length > 0 && /[a-zA-Z0-9]/.test(trimmed);
};

/** One point per line of a worklog section. */
export const getPoints = (content: string) =>
  (content?.match(/\n/g) || []).length + 1;

/** Points across a set of worklogs (usually one person's month). */
export const worklogPoints = (logs: { works?: unknown }[]) =>
  logs.reduce((total, log) => {
    const works = Array.isArray(log.works) ? log.works : [];
    return (
      total +
      works.reduce((sum: number, work: any) => {
        const content = typeof work?.content === 'string' ? work.content : '';
        return isValidContent(content) ? sum + getPoints(content) : sum;
      }, 0)
    );
  }, 0);

/**
 * Points for one company's leaderboard. A line linked to another company
 * counts there instead; lines not linked yet count everywhere, as before.
 * Private (`p:`) lines are Personal and never count for a company.
 */
export const worklogPointsForCompany = (
  logs: {
    works?: unknown;
    links?: { key: string; companyId: string | null }[] | null;
  }[],
  companyId: string,
) =>
  logs.reduce((total, log) => {
    const elsewhere = new Set(
      (log.links ?? [])
        .filter((l) => l.companyId && l.companyId !== companyId)
        .map((l) => l.key),
    );
    const works = Array.isArray(log.works) ? log.works : [];
    return (
      total +
      works.reduce((sum: number, work: any) => {
        const content = typeof work?.content === 'string' ? work.content : '';
        if (!isValidContent(content)) return sum;
        const skipped = content
          .split('\n')
          .filter(
            (line: string) =>
              PRIVATE_LINE.test(line) ||
              (elsewhere.size > 0 && elsewhere.has(lineKey(line))),
          ).length;
        return sum + Math.max(0, getPoints(content) - skipped);
      }, 0)
    );
  }, 0);
