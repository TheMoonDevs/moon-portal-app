/*
 * What the world shows for each person and their bot. Pure: used by the API
 * and by the 3D scene.
 */

export type BotState = 'waiting' | 'blocked' | 'working' | 'done' | 'asleep';

export type BotPoint = {
  text: string;
  status: 'doing' | 'done' | 'not_done' | 'blocked' | 'waiting' | null;
};

export type WorldPerson = {
  id: string;
  name: string;
  avatar: string | null;
  title: string | null;
  isMe: boolean;
  /** Lines the person wrote themselves today. */
  ownPoints: number;
  /** Times today they answered their bot when it was waiting on them. */
  guidance: number;
  bot: {
    state: BotState;
    /** What it is on now (or last did). */
    current: string | null;
    points: BotPoint[];
    counts: Record<
      'doing' | 'done' | 'not_done' | 'blocked' | 'waiting',
      number
    >;
  };
};

/** Answering a waiting bot is high-effort work, so it counts for more. */
export const GUIDANCE_WEIGHT = 3;

export const personEffort = (p: Pick<WorldPerson, 'ownPoints' | 'guidance'>) =>
  p.ownPoints + p.guidance * GUIDANCE_WEIGHT;

export const botEffort = (p: Pick<WorldPerson, 'bot'>) =>
  p.bot.counts.done + p.bot.counts.doing * 0.5;

/** The one state a bot shows, most urgent first. */
export function botState(points: BotPoint[]): BotState {
  if (points.some((p) => p.status === 'waiting')) return 'waiting';
  if (points.some((p) => p.status === 'blocked')) return 'blocked';
  if (points.some((p) => p.status === 'doing')) return 'working';
  if (points.length) return 'done';
  return 'asleep';
}

export function currentPoint(points: BotPoint[], state: BotState) {
  const wanted: Record<BotState, BotPoint['status'] | null> = {
    waiting: 'waiting',
    blocked: 'blocked',
    working: 'doing',
    done: null,
    asleep: null,
  };
  const status = wanted[state];
  const match = status
    ? [...points].reverse().find((p) => p.status === status)
    : points[points.length - 1];
  return match?.text ?? null;
}

export const BOT_STATE_LABEL: Record<BotState, string> = {
  waiting: 'Waiting on its owner',
  blocked: 'Blocked',
  working: 'Working',
  done: 'Done for now',
  asleep: 'Asleep',
};

export const BOT_STATE_COLOR: Record<BotState, string> = {
  waiting: '#38bdf8',
  blocked: '#f43f5e',
  working: '#facc15',
  done: '#34d399',
  asleep: '#737373',
};
