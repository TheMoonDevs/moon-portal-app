/*
 * Monthly worklog "buff": every written worklog line is a point, and the
 * month's points set the buff level shown on the worklogs page and the
 * leaderboard. Pure, so the browser and the server agree.
 */

import { lineKey } from '@/lib/worklogs/lines';

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
        const skipped = elsewhere.size
          ? content
              .split('\n')
              .filter((line: string) => elsewhere.has(lineKey(line))).length
          : 0;
        return sum + Math.max(0, getPoints(content) - skipped);
      }, 0)
    );
  }, 0);
