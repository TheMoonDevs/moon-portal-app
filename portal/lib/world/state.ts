import type { Look } from '@/lib/avatar/look';
import { brandKitDefaults } from '@/lib/brandKit';

/*
 * The world: companies are towns, projects are squares in them, each goal
 * is a row of buildings that grows a floor per task done for it, each
 * target a record tower, and the week's other tasks are small houses. Every person has a bot for each project their Claude worked
 * on today. Pure: used by the API and by the 3D scene.
 */

export type BotState = 'waiting' | 'blocked' | 'working' | 'done' | 'asleep';

export type BotTool = 'crane' | 'hammer' | 'laptop';

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
  /** The lot it works at, when its work is linked to a task. */
  siteId: string | null;
  /** The house it works on, on a homes lot. */
  houseId: string | null;
  /** What it works with: a crane on big tasks, a hammer on others. */
  tool: BotTool;
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

/** A task from this week that counts towards no goal: a small house. */
export type WorldHouse = {
  id: string;
  title: string;
  done: boolean;
  /** A big task: a bigger house, and a crane while it is worked on. */
  major: boolean;
};

export type SiteKind = 'goal' | 'target' | 'homes';

/**
 * A lot in a project square. A repeating goal is a row of buildings that
 * grow a floor per task done for it, a new building every ten floors, and
 * crack when its last period was missed. A target goal is the record tower,
 * as tall as it is near its number, standing on the targets it reached
 * before. Tasks for no goal are small houses, four to a lot, kept for the
 * week they were for: next week the homes make way for new ones.
 */
export type WorldSite = {
  id: string;
  name: string;
  kind: SiteKind;
  /** Its own bright colour. */
  color: string;
  /** Goal: tasks done for it ever. Target: its running total. Homes: houses done. */
  done: number;
  /** Open tasks for it right now. */
  open: number;
  /** Repeating goal: this period. */
  period?: { label: string; done: number; target: number; percent: number };
  /** Repeating goal: the last period that ended was missed. */
  missed?: boolean;
  /** Repeating goal: periods met in a row, up to the last one that ended. */
  streak?: number;
  /** Target goal: the number to reach, how near it is, and reached before. */
  target?: number;
  percent?: number;
  achieved?: boolean;
  records?: number[];
  /** Homes: this week's tasks for no goal. */
  houses?: WorldHouse[];
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

/** Houses on one homes lot. */
export const HOUSES_PER_LOT = 4;

/** Floors in one goal building: past this a new one is started. */
export const FLOORS = 10;

/** A repeating goal's buildings: full ones and the one going up. */
export function goalTowers(done: number) {
  const full = Math.floor(done / FLOORS);
  const rest = done % FLOORS;
  return { full, rest, total: full + (rest || !full ? 1 : 0) };
}

/** Bright, friendly colours for buildings, picked by id. */
export const CANDY = [
  '#60a5fa',
  '#f472b6',
  '#34d399',
  '#fbbf24',
  '#a78bfa',
  '#fb7185',
  '#22d3ee',
  '#fb923c',
  '#4ade80',
  '#818cf8',
];

export const candyOf = (id: string) =>
  CANDY[
    (Array.from(id).reduce((n, c) => (n * 31 + c.charCodeAt(0)) | 0, 7) >>> 0) %
      CANDY.length
  ];

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
