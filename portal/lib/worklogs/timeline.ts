/*
 * The statuses a work point can move its task to, and a task's timeline of
 * points: when it started, every status it moved through and the notes on
 * the way, so the time from start to finish can be shown. Kept free of
 * server imports so the screens can use it too.
 */

export const POINT_STATUSES = {
  doing: { emoji: '🟡', label: 'Doing' },
  done: { emoji: '✅', label: 'Done' },
  not_done: { emoji: '❌', label: 'Not done' },
  blocked: { emoji: '🔴', label: 'Blocked' },
  waiting: { emoji: '❓', label: 'Waiting on you' },
} as const;

export type PointStatus = keyof typeof POINT_STATUSES;

/** Marks work that moved on to a later day. */
export const MOVED_EMOJI = '➡️';

export type PointEvent = {
  key: string;
  /** ISO time. */
  at: string;
  status: PointStatus | null;
  /** What happened, e.g. "v6 rendered". */
  note?: string;
  by: 'claude' | 'person';
};

const FINISHED: (PointStatus | null)[] = ['done', 'not_done'];

/** When a point started and, if it has, finished. */
export function pointSpan(events: PointEvent[]) {
  if (!events.length) return null;
  const startedAt = events[0].at;
  const last = events[events.length - 1];
  const finishedAt = FINISHED.includes(last.status) ? last.at : null;
  return { startedAt, finishedAt, updates: events.length };
}
