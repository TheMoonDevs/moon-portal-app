import type { PointEvent } from './timeline';

/*
 * Whether a work point was planned, came up unexpectedly, or is late. Free
 * of server imports so the worklog and user pages can use it too.
 *
 * - planned: the point, or the task it is on, was written down before its
 *   day started (e.g. the evening before, or a task made last week).
 * - unexpected: nothing about it existed until the day had begun.
 * - delayed: it was meant for an earlier day: carried over from one, on
 *   several days, or on a task due (or scheduled) before this day.
 */

export type PointOrigin = 'planned' | 'unexpected' | 'delayed';

export const POINT_ORIGINS: Record<
  PointOrigin,
  { label: string; hint: string }
> = {
  planned: {
    label: 'Planned',
    hint: 'Written down before the day started',
  },
  unexpected: {
    label: 'Unexpected',
    hint: 'Came up after the day started',
  },
  delayed: {
    label: 'Delayed',
    hint: 'Meant for an earlier day',
  },
};

export const ORIGIN_KEYS = Object.keys(POINT_ORIGINS) as PointOrigin[];

/** The note on a point's event when it moved on to a later day. */
export const CARRIED_NOTE = 'Carried over';

const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Midnight at the start of `day` (YYYY-MM-DD) in `timezone`, as epoch ms.
 * Falls back to India time, the portal's default, then to UTC.
 */
export function dayStartMs(day: string, timezone?: string | null) {
  const utc = Date.parse(`${day}T00:00:00Z`);
  const offsetAt = (timeZone: string) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
        .formatToParts(new Date(utc))
        .map((p) => [p.type, p.value]),
    );
    const local = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    return local - utc;
  };
  for (const zone of [timezone, DEFAULT_TIMEZONE]) {
    if (!zone) continue;
    try {
      return utc - offsetAt(zone);
    } catch {
      // An unknown timezone: try the next one.
    }
  }
  return utc;
}

export type OriginTask = {
  createdAt?: string | Date | null;
  dueDate?: string | null;
  forDate?: string | null;
};

const time = (value?: string | Date | null) =>
  value ? new Date(value).getTime() : NaN;

/**
 * Where a point on `day` came from. `startMs` is when that day began for the
 * person; `events` its timeline (from every day it was on); `task` the task it
 * is on; `days` every day it was on. Null when there is nothing to tell by:
 * an older line with no history and no task.
 */
export function originOf({
  day,
  startMs,
  events,
  task,
  days,
}: {
  day: string;
  startMs: number;
  events: PointEvent[];
  task?: OriginTask | null;
  days?: string[];
}): PointOrigin | null {
  const carried = events.some(
    (e) => e.note?.startsWith(CARRIED_NOTE) && time(e.at) >= startMs,
  );
  const meantFor = task?.forDate || task?.dueDate?.slice(0, 10) || null;
  if (carried || (meantFor && meantFor < day) || (days && days.length > 1))
    return 'delayed';

  const seen = [...events.map((e) => time(e.at)), time(task?.createdAt)].filter(
    (t) => !Number.isNaN(t),
  );
  if (!seen.length) return null;
  return Math.min(...seen) < startMs ? 'planned' : 'unexpected';
}

/** How many points of each origin, and how many could not be told. */
export function countOrigins(origins: (PointOrigin | null)[]) {
  const counts = { planned: 0, unexpected: 0, delayed: 0, unknown: 0 };
  for (const o of origins) counts[o ?? 'unknown'] += 1;
  return counts;
}
