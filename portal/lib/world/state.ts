/*
 * The world: companies are towns, projects are buildings, and every person
 * has a bot for each project their Claude worked on today. Pure: used by the
 * API and by the 3D scene.
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
  isMe: boolean;
  townIds: string[];
  /** Lines the person wrote themselves today. */
  ownPoints: number;
  /** Times today they answered their bot when it was waiting on them. */
  guidance: number;
};

export type WorldBuilding = {
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
  buildings: WorldBuilding[];
  people: WorldPerson[];
  bots: WorldBot[];
};

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
