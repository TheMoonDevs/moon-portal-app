import type { Look } from '@/lib/avatar/look';
import { brandKitDefaults } from '@/lib/brandKit';

/*
 * The world: companies are towns, projects are squares in them, and each
 * kind of task in a project is a building that grows a level every time the
 * task is done. Every person has a bot for each project their Claude worked
 * on today. Pure: used by the API and by the 3D scene.
 */

export type BotState = 'waiting' | 'blocked' | 'working' | 'done' | 'asleep';

export type PointStatus = 'doing' | 'done' | 'not_done' | 'blocked' | 'waiting';

export type BotPoint = { text: string; status: PointStatus | null };

export type LeaderRow = {
  id: string;
  name: string;
  avatar: string | null;
  points: number;
};

/** Colours and logo from a company's or project's brand kit. */
export type WorldBrand = {
  primary: string;
  secondary: string;
  logo: string | null;
  font: string | null;
};

export type WorldBot = {
  /** ownerId:projectId */
  id: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string | null;
  townId: string;
  /** null: work not tied to a project, done around the town hall. */
  projectId: string | null;
  /** The task building it works at, when its work is linked to a task. */
  siteId: string | null;
  state: BotState;
  current: string | null;
  points: BotPoint[];
  /** Finished steps (done or dropped) out of all steps. */
  progress: { done: number; total: number };
};

export type WorldPerson = {
  id: string;
  name: string;
  avatar: string | null;
  title: string | null;
  /** How their character looks. */
  look: Look;
  isMe: boolean;
  townIds: string[];
  /** Lines the person wrote themselves today. */
  ownPoints: number;
  /** Times today they answered their bot when it was waiting on them. */
  guidance: number;
};

/**
 * One kind of task in a project, e.g. "Publish a lyric video": the same task
 * done again and again is one building that grows with every time.
 */
export type WorldSite = {
  id: string;
  name: string;
  /** Times done, ever. */
  done: number;
  /** Open right now. */
  open: number;
};

export type WorldProject = {
  id: string;
  name: string;
  color: string | null;
  logo: string | null;
  brand: WorldBrand;
  townId: string;
  /** Position in the town's ranking, 1 is best. */
  rank: number;
  /** This week's points on the project (worklog lines and tasks). */
  weekPoints: number;
  rankedBy: string;
  leaderboard: LeaderRow[];
  /** Its kinds of task, most done first. */
  sites: WorldSite[];
};

export type WorldTown = {
  id: string;
  name: string;
  color: string | null;
  logo: string | null;
  brand: WorldBrand;
  weekPoints: number;
  leaderboard: LeaderRow[];
};

export type World = {
  date: string;
  towns: WorldTown[];
  projects: WorldProject[];
  people: WorldPerson[];
  bots: WorldBot[];
};

/** Task buildings to a project square. */
export const SITES_PER_SQUARE = 4;

/** Levels in a tier: past this a building upgrades, and levels cost 10×. */
export const LEVEL_STEP = 10;

/**
 * A task building's tier and level from the times it was done: 1 to 9 is
 * tier 1, levels 1 to 9. At 10 it upgrades to tier 2 and every level then
 * takes 10 more (20, 30, …), at 100 tier 3 and so on. 0 is still being
 * built.
 */
export function siteLevel(done: number) {
  if (done <= 0) return { tier: 0, level: 0, nextAt: 1 };
  let tier = 1;
  let unit = 1;
  while (done >= unit * LEVEL_STEP) {
    unit *= LEVEL_STEP;
    tier += 1;
  }
  const level = Math.floor(done / unit);
  return { tier, level, nextAt: (level + 1) * unit };
}

/** Answering a waiting bot is high-effort work, so it counts for more. */
export const GUIDANCE_WEIGHT = 3;

/** The one state a bot shows, most urgent first. */
export function botState(points: BotPoint[]): BotState {
  if (points.some((p) => p.status === 'waiting')) return 'waiting';
  if (points.some((p) => p.status === 'blocked')) return 'blocked';
  if (points.some((p) => p.status === 'doing')) return 'working';
  if (points.length) return 'done';
  return 'asleep';
}

export function currentPoint(points: BotPoint[], state: BotState) {
  const wanted: Partial<Record<BotState, PointStatus>> = {
    waiting: 'waiting',
    blocked: 'blocked',
    working: 'doing',
  };
  const status = wanted[state];
  const match = status
    ? [...points].reverse().find((p) => p.status === status)
    : points[points.length - 1];
  return match?.text ?? null;
}

export const botProgress = (points: BotPoint[]) => ({
  done: points.filter((p) => p.status === 'done' || p.status === 'not_done')
    .length,
  total: points.length,
});

/** Bots that are finished or need permission go back to their owner. */
export const goesToOwner = (state: BotState) =>
  state === 'waiting' || state === 'done';

export const BOT_STATE_LABEL: Record<BotState, string> = {
  waiting: 'Waiting for you',
  blocked: 'Blocked',
  working: 'Working',
  done: 'Done, back with its owner',
  asleep: 'Asleep',
};

export const BOT_STATE_COLOR: Record<BotState, string> = {
  waiting: '#38bdf8',
  blocked: '#f43f5e',
  working: '#facc15',
  done: '#34d399',
  asleep: '#a3a3a3',
};

export const STATUS_EMOJI: Record<PointStatus, string> = {
  doing: '🟡',
  done: '✅',
  not_done: '❌',
  blocked: '🔴',
  waiting: '❓',
};

const PALETTE = [
  '#2563eb',
  '#dc2626',
  '#7c3aed',
  '#059669',
  '#ea580c',
  '#0891b2',
  '#db2777',
];

/** A town's or building's look, from its brand kit with sensible fallbacks. */
export function brandOf(
  item: {
    id: string;
    color?: string | null;
    logo?: string | null;
    brandKit?: any;
  },
  fallback?: WorldBrand,
): WorldBrand {
  const kit = item.brandKit;
  const defaults = brandKitDefaults(kit);
  const hex = (v?: string | null) =>
    v && /^#[0-9a-f]{6}/i.test(v) ? v.slice(0, 7) : '';
  const primary =
    hex(defaults.color) ||
    hex(item.color) ||
    fallback?.primary ||
    PALETTE[
      Array.from(item.id).reduce((n, c) => n + c.charCodeAt(0), 0) %
        PALETTE.length
    ];
  const secondary =
    hex(
      kit?.colors?.find(
        (c: any) =>
          hex(c.hex) && hex(c.hex).toLowerCase() !== primary.toLowerCase(),
      )?.hex,
    ) ||
    fallback?.secondary ||
    '#111827';
  return {
    primary,
    secondary,
    logo: item.logo || defaults.logo || null,
    font: kit?.fonts?.[0]?.family || fallback?.font || null,
  };
}
