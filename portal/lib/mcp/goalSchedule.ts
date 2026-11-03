import { WEEKDAYS } from '@/lib/workspace/projects';
import type { GoalPeriod, GoalSlot } from '@/models/workspace';

import { ToolError } from './shared';

/*
 * How a scheduled goal repeats, as the goal tools take it. Kept apart from
 * workspace.ts so the plan and schedule tools can use it at load time.
 */

/** "Mon", "monday" or 1 to the day number. */
export const weekday = (d: unknown) => {
  if (typeof d === 'number' && d >= 0 && d <= 6) return d;
  const name = String(d).trim().slice(0, 3).toLowerCase();
  const i = WEEKDAYS.findIndex((w) => w.toLowerCase() === name);
  if (i < 0) throw new ToolError(`Unknown day "${d}". Use Mon, Tue … Sun.`);
  return i;
};

export const PERIODS: GoalPeriod[] = [
  'day',
  'week',
  'fortnight',
  'month',
  'quarter',
];

/** How a scheduled goal repeats, as the goal tools take it. */
export const GOAL_SCHEDULE_PROPS = {
  period: {
    type: 'string',
    enum: PERIODS,
    description:
      'Scheduled goals: day, week, fortnight (every other week, counted from the week the goal is set), month or quarter (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec). The target is per period.',
  },
  days: {
    type: 'array',
    items: { type: 'string' },
    description:
      'Weekly and fortnightly goals: the weekdays its tasks are for, e.g. ["Mon", "Thu"]; the target is spread over them. A fortnightly goal makes them every other week, starting the week it is set. None: one batch on Monday, due by the period\'s last Sunday.',
  },
  slots: {
    type: 'array',
    items: { type: 'string' },
    description:
      'Monthly and quarterly goals: the days of the month its tasks are for; the target is spread over them. Each is a date ("1", "21st"; past a short month\'s end it falls on its last day) or an nth weekday ("1st Mon", "3rd Fri", "last Fri"). In a quarterly goal, prefix the month of the quarter: "m1 1st", "m2 15", "m3 last Fri" (no prefix is month 1).. E.g. 2 videos a month as ["1", "21"]. [] clears them: one batch at the start of the month (or monthDay) or quarter.',
  },
  monthDay: {
    type: 'integer',
    description:
      'Monthly goals with no slots: the day of the month (1 to 28) of its one batch.',
  },
};

const ORDINALS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  last: 5,
};

/**
 * One day of a month or quarter: 21, "21st", "3rd Fri", "last Friday",
 * "m2 15", "month 3: last Mon", or {month, date} / {month, nth, weekday}.
 */
export function parseSlot(input: unknown): GoalSlot {
  if (typeof input === 'number') return { date: input };
  if (input && typeof input === 'object') {
    const o = input as any;
    return {
      ...(o.month != null && { month: Number(o.month) }),
      ...(o.nth != null && o.weekday != null
        ? {
            nth: ORDINALS[String(o.nth).toLowerCase()] ?? Number(o.nth),
            weekday: weekday(o.weekday),
          }
        : { date: Number(o.date) }),
    };
  }
  let s = String(input ?? '')
    .trim()
    .toLowerCase();
  let month: number | undefined;
  const m = s.match(/^(?:m|month)\s*([1-3])\s*[:,-]?\s*/);
  if (m) {
    month = Number(m[1]);
    s = s.slice(m[0].length);
  }
  s = s.replace(/^(the|on)\s+/, '').replace(/\s+of\s+.*$/, '');
  const parts = s.split(/\s+/).filter(Boolean);
  const n = (w: string) =>
    ORDINALS[w] ?? Number(w.replace(/(st|nd|rd|th)$/, ''));
  let slot: GoalSlot | null = null;
  if (parts.length === 1 && Number.isFinite(n(parts[0])))
    slot = { date: n(parts[0]) };
  else if (parts.length === 2 && Number.isFinite(n(parts[0])))
    slot = { nth: n(parts[0]), weekday: weekday(parts[1]) };
  if (!slot || Object.values(slot).some((v) => !Number.isFinite(v)))
    throw new ToolError(
      `Unknown day "${input}". Use a date like "21st" or a weekday like "3rd Fri" or "last Fri" (in a quarter, "m2 15th").`,
    );
  return { ...(month && { month }), ...slot };
}
