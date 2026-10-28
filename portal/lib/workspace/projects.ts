/*
 * Project goals, task schedules and result rankings. Pure: safe on client and
 * server. Dates are plain `YYYY-MM-DD` strings in UTC.
 */

import type {
  GoalKind,
  GoalPeriod,
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

/** First and last day of the period that contains `day` (weeks start Monday). */
export function periodRange(period: GoalPeriod, day: string = toDay()) {
  const d = parseDay(day);
  if (period === 'day') return { from: day, to: day };
  if (period === 'week') {
    const from = addDays(day, -((d.getUTCDay() + 6) % 7));
    return { from, to: addDays(from, 6) };
  }
  const from = `${day.slice(0, 7)}-01`;
  const next = parseDay(from);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return { from, to: addDays(toDay(next), -1) };
}

export const PERIOD_LABELS: Record<GoalPeriod, string> = {
  day: 'a day',
  week: 'a week',
  month: 'a month',
};

/* ---------------------------------- Goals --------------------------------- */

const shortId = () => Math.random().toString(36).slice(2, 10);

const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const PERIODS: GoalPeriod[] = ['day', 'week', 'month'];

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
        !target && period === 'week' && Array.isArray(g.days)
          ? Array.from(
              new Set(
                g.days
                  .map((d: unknown) => clampInt(d, 0, 6, -1))
                  .filter((d: number) => d >= 0),
              ),
            ).sort()
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
  return periodRange(goal.period, day);
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
    const { from, to } = periodRange(goal.period, day);
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
};

/** Whether the schedule runs on `day`. */
export function runsOn(rule: ScheduleRule, day: string) {
  const d = parseDay(day);
  if (rule.every === 'day') return true;
  if (rule.every === 'week') {
    const days = rule.weekdays?.length ? rule.weekdays : [1];
    return days.includes(d.getUTCDay());
  }
  return d.getUTCDate() === (rule.monthDay || 1);
}

/** The first run date on or after `day`. */
export function nextRunOnOrAfter(rule: ScheduleRule, day: string) {
  for (let i = 0; i < 62; i++) {
    const candidate = addDays(day, i);
    if (runsOn(rule, candidate)) return candidate;
  }
  return addDays(day, 1);
}

export function describeSchedule(rule: ScheduleRule & { count?: number }) {
  const count = rule.count && rule.count > 1 ? `${rule.count} tasks ` : '';
  if (rule.every === 'day') return `${count}every day`;
  if (rule.every === 'week') {
    const days = (rule.weekdays?.length ? rule.weekdays : [1])
      .slice()
      .sort()
      .map((d) => WEEKDAYS[d]);
    return `${count}every ${days.join(', ')}`;
  }
  const n = rule.monthDay || 1;
  const suffix =
    n % 10 === 1 && n !== 11
      ? 'st'
      : n % 10 === 2 && n !== 12
        ? 'nd'
        : n % 10 === 3 && n !== 13
          ? 'rd'
          : 'th';
  return `${count}on the ${n}${suffix} of every month`;
}

/* ------------------------------ Goal schedules ----------------------------- */

export type GoalRule = {
  every: ScheduleEvery;
  weekdays: number[];
  monthDay: number | null;
  /** Tasks made each run. */
  count: number;
  dueInDays: number | null;
};

/**
 * When a scheduled goal makes its tasks, for a target of `target` a
 * period: every day; on its weekdays (the target spread over them, each
 * due that day) or else all on Monday, due by Sunday; or on its day of
 * the month.
 */
export function goalRule(
  goal: Pick<ProjectGoal, 'period' | 'days' | 'monthDay'>,
  target: number,
): GoalRule {
  const n = Math.max(1, target);
  if (goal.period === 'day')
    return {
      every: 'day',
      weekdays: [],
      monthDay: null,
      count: n,
      dueInDays: 0,
    };
  if (goal.period === 'month')
    return {
      every: 'month',
      weekdays: [],
      monthDay: goal.monthDay || 1,
      count: n,
      dueInDays: null,
    };
  const days = goal.days?.length ? goal.days : null;
  return days
    ? {
        every: 'week',
        weekdays: days,
        monthDay: null,
        count: Math.max(1, Math.ceil(n / days.length)),
        dueInDays: 0,
      }
    : { every: 'week', weekdays: [1], monthDay: null, count: n, dueInDays: 6 };
}

/** "1 task each Mon and Fri", "3 tasks every Monday, due Sunday". */
export function describeGoalSchedule(
  goal: Pick<ProjectGoal, 'period' | 'days' | 'monthDay' | 'target'>,
) {
  const rule = goalRule(goal, goal.target);
  const tasks = `${rule.count} task${rule.count === 1 ? '' : 's'}`;
  if (rule.every === 'day') return `${tasks} every day`;
  if (rule.every === 'month')
    return `${tasks} ${describeSchedule({ ...rule, count: 1 })}`;
  if (rule.dueInDays === 6) return `${tasks} every Monday, due by Sunday`;
  const names = rule.weekdays.map((d) => WEEKDAYS[d]);
  return `${tasks} for each ${
    names.length > 1
      ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
      : names[0]
  }`;
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
