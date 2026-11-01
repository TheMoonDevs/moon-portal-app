/*
 * Monthly "buff": the month's points set the level shown on the worklogs
 * page and the leaderboard. Points come from tasks and their work points
 * (see workScore); the worklog line counts below are kept for days typed
 * before tasks. Pure, so the browser and the server agree.
 */

import type { Task, WorkPoint } from '@/models/workspace';
import { TASK_SIZE, TASK_STATUS } from '@/models/workspace';

export enum BUFF_LEVEL {
  TRUTH_SEEKER = 'TRUTH_SEEKER',
  SEEDLING_SPROUT = 'SEEDLING_SPROUT',
  BABY_GROOT = 'BABY_GROOT',
  WORK_HULK = 'WORK_HULK',
  NIGHT_OWL = 'NIGHT_OWL',
  ROCKET_FOX = 'ROCKET_FOX',
  STORM_RHINO = 'STORM_RHINO',
  VAMPIRE_LORD = 'VAMPIRE_LORD',
  DEEP_KRAKEN = 'DEEP_KRAKEN',
  ALIEN_PREDATOR = 'ALIEN_PREDATOR',
  DEVIL = 'DEVIL',
  PHOENIX_RISING = 'PHOENIX_RISING',
  MOON_TITAN = 'MOON_TITAN',
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
    next: 25,
    title: 'Tiny Chirp',
    src: '/images/buff/tinyChirp.png',
  },
  {
    level: BUFF_LEVEL.SEEDLING_SPROUT,
    marker: 25,
    next: 50,
    title: 'Seedling Sprout',
    src: '/images/buff/seedlingSprout.png',
  },
  {
    level: BUFF_LEVEL.BABY_GROOT,
    marker: 50,
    next: 100,
    title: 'Baby Groot',
    src: '/images/buff/babyGroot.png',
  },
  {
    level: BUFF_LEVEL.WORK_HULK,
    marker: 100,
    next: 200,
    title: 'Work Hulk',
    src: '/images/buff/workHulk.png',
  },
  {
    level: BUFF_LEVEL.NIGHT_OWL,
    marker: 200,
    next: 300,
    title: 'Night Owl',
    src: '/images/buff/nightOwl.png',
  },
  {
    level: BUFF_LEVEL.ROCKET_FOX,
    marker: 300,
    next: 400,
    title: 'Rocket Fox',
    src: '/images/buff/rocketFox.png',
  },
  {
    level: BUFF_LEVEL.STORM_RHINO,
    marker: 400,
    next: 500,
    title: 'Storm Rhino',
    src: '/images/buff/stormRhino.png',
  },
  {
    level: BUFF_LEVEL.VAMPIRE_LORD,
    marker: 500,
    next: 600,
    title: 'Vampire Streak',
    src: '/images/buff/vampireLord.png',
  },
  {
    level: BUFF_LEVEL.DEEP_KRAKEN,
    marker: 600,
    next: 700,
    title: 'Deep Kraken',
    src: '/images/buff/deepKraken.png',
  },
  {
    level: BUFF_LEVEL.ALIEN_PREDATOR,
    marker: 700,
    next: 800,
    title: 'Dragon Force',
    src: '/images/buff/dragonForce.png',
  },
  {
    level: BUFF_LEVEL.DEVIL,
    marker: 800,
    next: 900,
    title: 'Moon Devil',
    src: '/images/buff/moonDevil.png',
  },
  {
    level: BUFF_LEVEL.PHOENIX_RISING,
    marker: 900,
    next: 1000,
    title: 'Phoenix Rising',
    src: '/images/buff/phoenixRising.png',
  },
  {
    level: BUFF_LEVEL.MOON_TITAN,
    marker: 1000,
    next: 1100,
    title: 'Moon Titan',
    src: '/images/buff/moonTitan.png',
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
    case BUFF_LEVEL.SEEDLING_SPROUT:
      return ['#8BC34A', '#C5E1A5'];
    case BUFF_LEVEL.NIGHT_OWL:
      return ['#3F51B5', '#7986CB'];
    case BUFF_LEVEL.ROCKET_FOX:
      return ['#FF7043', '#26A69A'];
    case BUFF_LEVEL.STORM_RHINO:
      return ['#1E88E5', '#4FC3F7'];
    case BUFF_LEVEL.DEEP_KRAKEN:
      return ['#7E57C2', '#26C6DA'];
    case BUFF_LEVEL.PHOENIX_RISING:
      return ['#FF6D00', '#FFD54F'];
    case BUFF_LEVEL.MOON_TITAN:
      return ['#EC407A', '#CE93D8'];
    default:
      return ['#e0e0e0', '#9e9e9e'];
  }
};
