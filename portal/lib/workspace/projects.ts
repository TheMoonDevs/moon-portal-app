/*
 * Project goals, task schedules and result rankings. Pure: safe on client and
 * server. Dates are plain `YYYY-MM-DD` strings in UTC.
 */

import type {
  GoalKind,
  GoalPeriod,
  GoalSlot,
  ProjectGoal,
  ScheduleEvery,
} from '@/models/workspace';

/* ---------------------------------- Dates --------------------------------- */

export const toDay = (d: Date = new Date()) => d.toISOString().slice(0, 10);

const parseDay = (day: string) => new Date(`${day}T00:00:00Z`);

export const addDays = (day: string, n: number) => {
  const d = parseDay(day);
  d.setUTCDate(d.getUTCDate() + n);
  return toDay(d);
};

/** The Monday of the week that holds `day`. */
export const mondayOf = (day: string) =>
  addDays(day, -((parseDay(day).getUTCDay() + 6) % 7));

/** Whole weeks from the week of `a` to the week of `b`. */
const weeksBetween = (a: string, b: string) =>
  Math.round(
    (parseDay(mondayOf(b)).getTime() - parseDay(mondayOf(a)).getTime()) /
      (7 * 86400000),
  );

/** Days in the month of `day`. */
const monthLength = (day: string) => {
  const d = parseDay(`${day.slice(0, 7)}-01`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.getUTCDate();
};

/**
 * First and last day of the period that contains `day` (weeks start
 * Monday; quarters are Jan-Mar, Apr-Jun, Jul-Sep and Oct-Dec). A
 * fortnight is two weeks counted from the week of `anchor` (the day a
 * fortnightly goal was set).
 */
export function periodRange(
  period: GoalPeriod,
  day: string = toDay(),
  anchor?: string | null,
) {
  if (period === 'day') return { from: day, to: day };
  if (period === 'week') {
    const from = mondayOf(day);
    return { from, to: addDays(from, 6) };
  }
  if (period === 'fortnight') {
    const monday = mondayOf(day);
    const odd = anchor ? Math.abs(weeksBetween(anchor, day)) % 2 === 1 : false;
    const from = odd ? addDays(monday, -7) : monday;
    return { from, to: addDays(from, 13) };
  }
  const month = Number(day.slice(5, 7));
  const first = period === 'quarter' ? month - ((month - 1) % 3) : month;
  const from = `${day.slice(0, 4)}-${String(first).padStart(2, '0')}-01`;
  const next = parseDay(from);
  next.setUTCMonth(next.getUTCMonth() + (period === 'quarter' ? 3 : 1));
  return { from, to: addDays(toDay(next), -1) };
}

export const PERIOD_LABELS: Record<GoalPeriod, string> = {
  day: 'a day',
  week: 'a week',
  fortnight: 'every 2 weeks',
  month: 'a month',
  quarter: 'a quarter',
};

/** The period as a noun: "day", "week", "fortnight", "month", "quarter". */
export const PERIOD_NOUN: Record<GoalPeriod, string> = {
  day: 'day',
  week: 'week',
  fortnight: 'fortnight',
  month: 'month',
  quarter: 'quarter',
};

/* ---------------------------------- Goals --------------------------------- */

const shortId = () => Math.random().toString(36).slice(2, 10);

const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export const PERIODS: GoalPeriod[] = [
  'day',
  'week',
  'fortnight',
  'month',
  'quarter',
];

/** Well-formed days of a month or quarter, at most 31, in order. */
export function sanitizeSlots(input: unknown, quarter: boolean): GoalSlot[] {
  if (!Array.isArray(input)) return [];
  const out: GoalSlot[] = [];
  for (const raw of input.slice(0, 31)) {
    const r = raw as any;
    const month = quarter ? clampInt(r?.month ?? 1, 1, 3, 1) : undefined;
    let slot: GoalSlot | null = null;
    if (r?.nth != null && r?.weekday != null)
      slot = {
        nth: clampInt(r.nth, 1, 5, 1),
        weekday: clampInt(r.weekday, 0, 6, 1),
      };
    else if (r?.date != null) slot = { date: clampInt(r.date, 1, 31, 1) };
    if (!slot) continue;
    if (month) slot = { month, ...slot };
    if (!out.some((x) => slotKey(x) === slotKey(slot!))) out.push(slot);
  }
  return out.sort((a, b) => slotOrder(a) - slotOrder(b));
}

const slotKey = (s: GoalSlot) =>
  `${s.month ?? 1}:${s.date ?? ''}:${s.nth ?? ''}:${s.weekday ?? ''}`;

/** Roughly where in its period a slot falls, for ordering. */
const slotOrder = (s: GoalSlot) =>
  ((s.month ?? 1) - 1) * 100 +
  (s.date ?? ((s.nth ?? 1) === 5 ? 29 : ((s.nth ?? 1) - 1) * 7 + 1)) +
  (s.weekday ?? 0) / 10;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const KINDS: GoalKind[] = ['scheduled', 'target'];

const ids = (v: unknown) =>
  Array.isArray(v)
    ? Array.from(new Set(v.filter((x): x is string => typeof x === 'string')))
    : [];

export const isTarget = (g: Pick<ProjectGoal, 'kind'>) => g.kind === 'target';

/**
 * Keeps well-formed goals only; gives new goals and parts an id. A goal
 * keeps the day it was set: from the input, else from `previous` (the
 * stored goals), else `oldSince` for a goal that existed before that day
 * was kept, else today. A target goal keeps the day it was reached.
 */
export function sanitizeGoals(
  input: unknown,
  previous: ProjectGoal[] = [],
  oldSince?: string | null,
): ProjectGoal[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, 40)
    .map((g): ProjectGoal | null => {
      const title = typeof g?.title === 'string' ? g.title.trim() : '';
      if (!title) return null;
      const before = previous.find((p) => p.id === g.id);
      const kind: GoalKind = KINDS.includes(g.kind) ? g.kind : 'scheduled';
      const target = kind === 'target';
      const parts =
        !target && Array.isArray(g.parts)
          ? g.parts
              .slice(0, 12)
              .map((p: any) => {
                const label =
                  typeof p?.label === 'string'
                    ? p.label.trim().slice(0, 60)
                    : '';
                return label
                  ? {
                      id: typeof p.id === 'string' && p.id ? p.id : shortId(),
                      label,
                      target: clampInt(p.target, 1, 10000, 1),
                    }
                  : null;
              })
              .filter(Boolean)
          : [];
      const period: GoalPeriod = PERIODS.includes(g.period) ? g.period : 'week';
      const days =
        !target &&
        (period === 'week' || period === 'fortnight') &&
        Array.isArray(g.days)
          ? Array.from(
              new Set(
                g.days
                  .map((d: unknown) => clampInt(d, 0, 6, -1))
                  .filter((d: number) => d >= 0),
              ),
            ).sort()
          : [];
      const slots =
        !target && (period === 'month' || period === 'quarter')
          ? sanitizeSlots(g.slots, period === 'quarter')
          : [];
      const assigneeIds = ids(g.assigneeIds);
      return {
        id: typeof g.id === 'string' && g.id ? g.id : shortId(),
        title: title.slice(0, 120),
        kind,
        since:
          typeof g.since === 'string' && DAY.test(g.since)
            ? g.since
            : (before?.since ?? (before && oldSince ? oldSince : toDay())),
        period,
        // With parts, the target is their sum.
        target: parts.length
          ? parts.reduce((n: number, p: { target: number }) => n + p.target, 0)
          : clampInt(g.target, 1, target ? 1e9 : 10000, 1),
        ...(parts.length && { parts }),
        ...(days.length && { days }),
        ...(slots.length && { slots }),
        ...(!target &&
          period === 'month' &&
          g.monthDay != null && { monthDay: clampInt(g.monthDay, 1, 28, 1) }),
        ...(!target && g.makeTasks === false && { makeTasks: false }),
        ...(assigneeIds.length && { assigneeIds }),
        ...(target &&
          (g.achievedAt ?? before?.achievedAt) && {
            achievedAt: (g.achievedAt ?? before?.achievedAt) as string,
          }),
        ...(target &&
          typeof g.previousId === 'string' &&
          g.previousId && { previousId: g.previousId }),
        ...(typeof g.planId === 'string' && g.planId && { planId: g.planId }),
      };
    })
    .filter((g): g is ProjectGoal => !!g);
}

export type GoalProgress = {
  goalId: string;
  kind: GoalKind;
  done: number;
  /** How much of `done` was added by hand. */
  manual: number;
  target: number;
  percent: number;
  from: string;
  to: string;
  /** Who finished the work counted, most first. */
  contributors: { userId: string; done: number }[];
  /** Target goals: reached, now or before. */
  achieved?: boolean;
  parts?: {
    id: string;
    label: string;
    done: number;
    manual: number;
    target: number;
  }[];
};

/** A done task, or progress added by hand (`amount`, counted on forDate). */
export type DoneTask = {
  status: string;
  goalId?: string | null;
  goalPartId?: string | null;
  forDate?: string | null;
  completedAt?: unknown;
  amount?: number;
  completedByIds?: string[] | null;
  assigneeIds?: string[] | null;
};

/** Progress added by hand, in the shape goals count. */
export const tallyRows = (
  tallies: {
    goalId: string;
    goalPartId?: string | null;
    from: string;
    amount: number;
  }[],
): DoneTask[] =>
  tallies.map((t) => ({
    status: 'DONE',
    goalId: t.goalId,
    goalPartId: t.goalPartId ?? null,
    forDate: t.from,
    amount: t.amount,
  }));

const sum = (rows: DoneTask[], manualOnly = false) =>
  rows.reduce(
    (n, r) => n + (r.amount !== undefined ? r.amount : manualOnly ? 0 : 1),
    0,
  );

/**
 * The day a done task counts for: the day it was scheduled for, so work
 * done early fills the right week, or else the day it was done.
 */
export const countsOn = (t: DoneTask) =>
  t.forDate && DAY.test(t.forDate)
    ? t.forDate
    : t.completedAt
      ? toDay(new Date(t.completedAt as string))
      : null;

/** Who did a done task: who finished it, else the people on it. */
const doers = (t: DoneTask) =>
  t.completedByIds?.length ? t.completedByIds : (t.assigneeIds ?? []);

function contributorsOf(rows: DoneTask[]) {
  const count = new Map<string, number>();
  for (const r of rows)
    if (r.amount === undefined)
      for (const id of doers(r)) count.set(id, (count.get(id) ?? 0) + 1);
  return Array.from(count, ([userId, done]) => ({ userId, done })).sort(
    (a, b) => b.done - a.done,
  );
}

/**
 * The days a goal counts work in, around `day`: the period that holds it
 * for a scheduled goal; everything since it was set for a target goal.
 */
export function goalWindow(goal: ProjectGoal, day: string = toDay()) {
  if (isTarget(goal))
    return { from: goal.since ?? '2000-01-01', to: '9999-12-31' };
  return periodRange(goal.period, day, goal.since);
}

/** One goal's progress in the period from `from` to `to`. */
function progressIn(
  goal: ProjectGoal,
  tasks: DoneTask[],
  from: string,
  to: string,
): GoalProgress {
  const inPeriod = tasks.filter((t) => {
    if (t.status !== 'DONE' || t.goalId !== goal.id) return false;
    const day = countsOn(t);
    return !!day && day >= from && day <= to;
  });
  const parts = goal.parts?.map((p) => {
    const mine = inPeriod.filter((t) => t.goalPartId === p.id);
    return { ...p, done: sum(mine), manual: sum(mine, true) };
  });
  // With parts, extra work on one part does not make up for another.
  const done = parts
    ? parts.reduce((n, p) => n + Math.min(p.done, p.target), 0)
    : sum(inPeriod);
  const percent = Math.min(100, Math.round((done / goal.target) * 100));
  return {
    goalId: goal.id,
    kind: goal.kind ?? 'scheduled',
    done,
    manual: parts
      ? parts.reduce((n, p) => n + p.manual, 0)
      : sum(inPeriod, true),
    target: goal.target,
    percent: isTarget(goal) && goal.achievedAt ? 100 : percent,
    from,
    to,
    contributors: contributorsOf(inPeriod),
    ...(isTarget(goal) && { achieved: !!goal.achievedAt || percent >= 100 }),
    ...(parts && { parts }),
  };
}

/** Done tasks linked to each goal within that goal's current period. */
export function goalProgress(
  goals: ProjectGoal[] = [],
  tasks: DoneTask[],
  today: string = toDay(),
): GoalProgress[] {
  return goals.map((goal) => {
    const { from, to } = goalWindow(goal, today);
    return progressIn(goal, tasks, from, to);
  });
}

export type GoalPeriodResult = GoalProgress & {
  /** Met the target; null while the period is still running. */
  met: boolean | null;
};

/**
 * A goal's last `count` periods, oldest first and ending with the current
 * one: met when its tasks reached the target, missed when the period ended
 * short. Periods before `since` (when the goal was set) are left out.
 */
export function goalHistory(
  goal: ProjectGoal,
  tasks: DoneTask[],
  count = 6,
  today: string = toDay(),
  since?: string | null,
): GoalPeriodResult[] {
  const out: GoalPeriodResult[] = [];
  // A target goal has no periods to meet or miss.
  if (isTarget(goal)) return out;
  let day = today;
  for (let i = 0; i < count; i++) {
    const { from, to } = periodRange(goal.period, day, goal.since);
    if (since && to < since) break;
    const p = progressIn(goal, tasks, from, to);
    out.unshift({
      ...p,
      met: p.done >= p.target ? true : to < today ? false : null,
    });
    day = addDays(from, -1);
  }
  return out;
}

/* -------------------------------- Schedules ------------------------------- */

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type ScheduleRule = {
  every: ScheduleEvery;
  weekdays?: number[] | null;
  monthDay?: number | null;
  slots?: GoalSlot[] | null;
  /** Fortnightly: a day in a week it runs in (it runs every other week). */
  anchor?: string | null;
};

/** Whether a day of a month or quarter falls on `day`. */
export function slotOn(slot: GoalSlot, day: string, quarter = false) {
  const d = parseDay(day);
  if (quarter && (d.getUTCMonth() % 3) + 1 !== (slot.month ?? 1)) return false;
  const date = d.getUTCDate();
  const last = monthLength(day);
  if (slot.nth != null) {
    if (d.getUTCDay() !== (slot.weekday ?? 1)) return false;
    return slot.nth >= 5 ? date + 7 > last : Math.ceil(date / 7) === slot.nth;
  }
  return date === Math.min(slot.date ?? 1, last);
}

const QUARTER_START: GoalSlot[] = [{ month: 1, date: 1 }];

/** Whether the schedule runs on `day`. */
export function runsOn(rule: ScheduleRule, day: string) {
  const d = parseDay(day);
  if (rule.every === 'day') return true;
  if (rule.every === 'week' || rule.every === 'fortnight') {
    const days = rule.weekdays?.length ? rule.weekdays : [1];
    if (!days.includes(d.getUTCDay())) return false;
    return (
      rule.every === 'week' ||
      !rule.anchor ||
      Math.abs(weeksBetween(rule.anchor, day)) % 2 === 0
    );
  }
  if (rule.every === 'quarter')
    return (rule.slots?.length ? rule.slots : QUARTER_START).some((s) =>
      slotOn(s, day, true),
    );
  if (rule.slots?.length) return rule.slots.some((s) => slotOn(s, day));
  return d.getUTCDate() === (rule.monthDay || 1);
}

/** The first run date on or after `day`. */
export function nextRunOnOrAfter(rule: ScheduleRule, day: string) {
  for (let i = 0; i < 400; i++) {
    const candidate = addDays(day, i);
    if (runsOn(rule, candidate)) return candidate;
  }
  return addDays(day, 1);
}

/**
 * The run a day belongs to: the latest run on or before it whose tasks are
 * still for that day. A run's tasks are for its own day plus `dueInDays`
 * (a Monday batch due Sunday covers the week), or, with no due day, until
 * the next run. Null when the day is between runs (Tue for a Mon and Thu
 * goal).
 */
export function runCovering(
  rule: ScheduleRule & { dueInDays?: number | null },
  day: string,
): string | null {
  for (let i = 0; i < 120; i++) {
    const run = addDays(day, -i);
    if (!runsOn(rule, run)) continue;
    const last =
      rule.dueInDays == null
        ? addDays(nextRunOnOrAfter(rule, addDays(run, 1)), -1)
        : addDays(run, rule.dueInDays);
    return last >= day ? run : null;
  }
  return null;
}

/** The first `n` run days on or after `from`. */
export function runsFrom(rule: ScheduleRule, from: string, n: number) {
  const runs: string[] = [];
  let day = nextRunOnOrAfter(rule, from);
  while (runs.length < n) {
    runs.push(day);
    day = nextRunOnOrAfter(rule, addDays(day, 1));
  }
  return runs;
}

export const ordinal = (n: number) =>
  `${n}${
    n % 10 === 1 && n !== 11
      ? 'st'
      : n % 10 === 2 && n !== 12
        ? 'nd'
        : n % 10 === 3 && n !== 13
          ? 'rd'
          : 'th'
  }`;

/** "21st", "3rd Fri", "last Mon"; in a quarter "15th of month 2". */
export function slotLabel(slot: GoalSlot, quarter = false) {
  const when =
    slot.nth != null
      ? `${slot.nth >= 5 ? 'last' : ordinal(slot.nth)} ${WEEKDAYS[slot.weekday ?? 1]}`
      : ordinal(slot.date ?? 1);
  return quarter ? `${when} of month ${slot.month ?? 1}` : when;
}

/** "a", "a and b", "a, b and c". */
const listed = (items: string[]) =>
  items.length > 1
    ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
    : (items[0] ?? '');

export function describeSchedule(rule: ScheduleRule & { count?: number }) {
  const count = rule.count && rule.count > 1 ? `${rule.count} tasks ` : '';
  if (rule.every === 'day') return `${count}every day`;
  if (rule.every === 'week' || rule.every === 'fortnight') {
    const days = (rule.weekdays?.length ? rule.weekdays : [1])
      .slice()
      .sort()
      .map((d) => WEEKDAYS[d]);
    return rule.every === 'week'
      ? `${count}every ${days.join(', ')}`
      : `${count}every other ${days.join(', ')}`;
  }
  if (rule.every === 'quarter') {
    const slots = rule.slots?.length ? rule.slots : QUARTER_START;
    return `${count}on the ${listed(slots.map((s) => slotLabel(s, true)))} of every quarter`;
  }
  const slots = rule.slots?.length
    ? rule.slots
    : [{ date: rule.monthDay || 1 }];
  return `${count}on the ${listed(slots.map((s) => slotLabel(s)))} of every month`;
}

/* ------------------------------ Goal schedules ----------------------------- */

export type GoalRule = {
  every: ScheduleEvery;
  weekdays: number[];
  monthDay: number | null;
  slots: GoalSlot[];
  /** Fortnightly: the Monday of the week the goal was set. */
  anchor: string | null;
  /** Tasks made each run. */
  count: number;
  dueInDays: number | null;
};

type GoalShape = Pick<
  ProjectGoal,
  'period' | 'days' | 'monthDay' | 'slots' | 'since'
>;

/**
 * When a scheduled goal makes its tasks, for a target of `target` a
 * period: every day; on its weekdays (the target spread over them, each
 * due that day) or else all on Monday, due by Sunday; every other week the
 * same way, from the week the goal was set; on its days of the month or
 * quarter (dates like the 21st, or weekdays like the 3rd Friday; the
 * target spread over them, each due that day), or else all at the start
 * of the month or quarter.
 */
export function goalRule(goal: GoalShape, target: number): GoalRule {
  const n = Math.max(1, target);
  const base = { weekdays: [], monthDay: null, slots: [], anchor: null };
  if (goal.period === 'day')
    return { ...base, every: 'day', count: n, dueInDays: 0 };
  if (goal.period === 'month' || goal.period === 'quarter') {
    const slots = goal.slots?.length ? goal.slots : null;
    if (slots)
      return {
        ...base,
        every: goal.period,
        slots,
        count: Math.max(1, Math.ceil(n / slots.length)),
        dueInDays: 0,
      };
    return goal.period === 'month'
      ? {
          ...base,
          every: 'month',
          monthDay: goal.monthDay || 1,
          count: n,
          dueInDays: null,
        }
      : {
          ...base,
          every: 'quarter',
          slots: QUARTER_START,
          count: n,
          dueInDays: null,
        };
  }
  const every = goal.period === 'fortnight' ? 'fortnight' : 'week';
  const anchor = every === 'fortnight' ? mondayOf(goal.since || toDay()) : null;
  const days = goal.days?.length ? goal.days : null;
  return days
    ? {
        ...base,
        every,
        weekdays: days,
        anchor,
        count: Math.max(1, Math.ceil(n / days.length)),
        dueInDays: 0,
      }
    : {
        ...base,
        every,
        weekdays: [1],
        anchor,
        count: n,
        dueInDays: every === 'week' ? 6 : 13,
      };
}

/** "1 task each Mon and Fri", "3 tasks every Monday, due Sunday". */
export function describeGoalSchedule(goal: GoalShape & { target: number }) {
  const rule = goalRule(goal, goal.target);
  const tasks = `${rule.count} task${rule.count === 1 ? '' : 's'}`;
  if (rule.every === 'day') return `${tasks} every day`;
  if (rule.every === 'month' || rule.every === 'quarter') {
    if (rule.dueInDays === 0)
      return `${tasks} ${describeSchedule({ ...rule, count: 1 }).replace(
        /^on /,
        rule.slots.length > 1 ? 'on each of ' : 'on ',
      )}`;
    return rule.every === 'quarter'
      ? `${tasks} at the start of every quarter, due by its end`
      : `${tasks} ${describeSchedule({ ...rule, count: 1 })}`;
  }
  if (rule.dueInDays === 6) return `${tasks} every Monday, due by Sunday`;
  if (rule.dueInDays === 13)
    return `${tasks} every other Monday, due by the Sunday after next`;
  const names = listed(rule.weekdays.map((d) => WEEKDAYS[d]));
  return rule.every === 'fortnight'
    ? `${tasks} for each ${names}, every other week`
    : `${tasks} for each ${names}`;
}

/** How often a goal repeats: "per day", "twice a week", "3 times a week". */
export function goalCadence(goal: GoalShape) {
  if (goal.period === 'day') return 'per day';
  if (goal.period === 'fortnight') {
    const days = new Set(goal.days ?? []).size;
    return days > 1 ? `${days} times every 2 weeks` : 'every 2 weeks';
  }
  if (goal.period === 'month' || goal.period === 'quarter') {
    const n = goal.slots?.length ?? 0;
    const per = goal.period === 'month' ? 'a month' : 'a quarter';
    if (n === 2) return `twice ${per}`;
    if (n > 2) return `${n} times ${per}`;
    return goal.period === 'month' ? 'per month' : 'per quarter';
  }
  const days = new Set(goal.days ?? []).size;
  if (days >= 7) return 'per day';
  if (days === 2) return 'twice a week';
  if (days > 2) return `${days} times a week`;
  return 'per week';
}

/**
 * What a goal's tasks are called: the project, the goal (and part) and how
 * often it repeats, e.g. "Moon Portal - Post shorts per day".
 */
export function goalTaskTitle(
  projectName: string | null | undefined,
  goal: Pick<ProjectGoal, 'title'> & GoalShape,
  partLabel?: string | null,
) {
  const what = partLabel ? `${goal.title}: ${partLabel}` : goal.title;
  const name = projectName?.trim();
  return `${name ? `${name} - ` : ''}${what} ${goalCadence(goal)}`;
}

/* --------------------------------- Results -------------------------------- */

export const RESULT_METRICS: { key: string; label: string; money?: boolean }[] =
  [
    { key: 'earnings', label: 'Earnings', money: true },
    { key: 'subscribers', label: 'Subscribers' },
    { key: 'views', label: 'Views' },
    { key: 'followers', label: 'Followers' },
    { key: 'streams', label: 'Streams' },
  ];

export const metricLabel = (key: string) =>
  RESULT_METRICS.find((m) => m.key === key)?.label ??
  key.charAt(0).toUpperCase() + key.slice(1);

export const formatMetric = (key: string, value: number) => {
  const money = RESULT_METRICS.find((m) => m.key === key)?.money;
  const n = Intl.NumberFormat('en', {
    notation: Math.abs(value) >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
  return money ? `$${n}` : n;
};

type ResultRow = {
  projectId: string;
  metric: string;
  value: number;
  date: string;
};

export type ProjectStanding = {
  projectId: string;
  value: number;
  /** Change against the latest reading at least 30 days older. */
  change: number | null;
  rank: number;
};

/**
 * Ranks projects on one metric by their latest reading. Projects with no
 * reading for it are left out.
 */
export function rankProjects(
  results: ResultRow[],
  metric: string,
): ProjectStanding[] {
  const byProject = new Map<string, ResultRow[]>();
  for (const r of results) {
    if (r.metric !== metric) continue;
    byProject.set(r.projectId, [...(byProject.get(r.projectId) ?? []), r]);
  }
  const rows = Array.from(byProject.entries()).map(([projectId, list]) => {
    const sorted = list.sort((a, b) => b.date.localeCompare(a.date));
    const latest = sorted[0];
    const monthBefore = addDays(latest.date, -30);
    const older = sorted.find((r) => r.date <= monthBefore);
    return {
      projectId,
      value: latest.value,
      change: older ? latest.value - older.value : null,
      rank: 0,
    };
  });
  rows.sort((a, b) => b.value - a.value);
  rows.forEach((r, i) => {
    // Ties share a rank.
    r.rank = i > 0 && rows[i - 1].value === r.value ? rows[i - 1].rank : i + 1;
  });
  return rows;
}

/** Metrics that have at least one reading, in a stable order. */
export function metricsWithData(results: { metric: string }[]) {
  const present = new Set(results.map((r) => r.metric));
  return [
    ...RESULT_METRICS.map((m) => m.key).filter((k) => present.has(k)),
    ...Array.from(present)
      .filter((k) => !RESULT_METRICS.some((m) => m.key === k))
      .sort(),
  ];
}
