/*
 * The goals calendar: every goal of every project, day by day. Pure: safe
 * on client and server. Dates are plain `YYYY-MM-DD` strings in UTC, like
 * the rest of the goal code (lib/workspace/projects).
 *
 * A repeating goal has days it is due on (its runs) and work done for
 * them; a day is done, partly done, missed, still open or coming up. A
 * target goal has no days of its own; the calendar shows the days work
 * moved it, and the day it was reached.
 */

import type { PROJECT_EFFORT, ProjectGoal } from '@/models/workspace';

import {
  addDays,
  countsOn,
  type DoneTask,
  type GoalProgress,
  goalRule,
  isTarget,
  nextRunOnOrAfter,
  periodRange,
  runsOn,
  toDay,
} from './projects';

/* ---------------------------------- data ---------------------------------- */

export type CalendarTask = {
  id: string;
  title: string;
  projectId: string;
  goalId: string;
  goalPartId?: string | null;
  status: string;
  forDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  completedByIds?: string[] | null;
  assigneeIds?: string[] | null;
  goalMissed?: { day: string } | null;
  carriedFrom?: string | null;
};

/** Progress added by hand, counted on the first day of its period. */
export type CalendarTally = {
  projectId: string;
  goalId: string;
  goalPartId?: string | null;
  from: string;
  amount: number;
};

export type CalendarGoal = ProjectGoal & {
  projectId: string;
  /** Its progress now: this period, or in total for a target. */
  progress: GoalProgress;
};

export type CalendarProject = {
  id: string;
  name: string;
  companyId: string;
  parentId?: string | null;
  color?: string | null;
  logo?: string | null;
  status: string;
  effort?: PROJECT_EFFORT | null;
  isCore?: boolean | null;
  leadIds?: string[] | null;
  memberIds?: string[] | null;
};

export type CalendarCompany = {
  id: string;
  name: string;
  color: string | null;
  logo: string | null;
};

export type GoalsCalendarData = {
  today: string;
  from: string;
  to: string;
  companies: CalendarCompany[];
  projects: CalendarProject[];
  goals: CalendarGoal[];
  tasks: CalendarTask[];
  tallies: CalendarTally[];
  users: {
    id: string;
    name?: string | null;
    username?: string | null;
    avatar?: string | null;
  }[];
};

/** A goal is known by its project and its id. */
export const goalKey = (g: {
  projectId: string;
  goalId?: string;
  id?: string;
}) => `${g.projectId}:${g.goalId ?? g.id}`;

const OPEN = ['TODO', 'IN_PROGRESS', 'IN_REVIEW'];

const dayOf = (value?: string | null) =>
  value ? toDay(new Date(value)) : null;

/** The rows goal progress counts, for one goal. */
export const doneRows = (
  goal: CalendarGoal,
  tasks: CalendarTask[],
  tallies: CalendarTally[],
): DoneTask[] => [
  ...tasks.filter(
    (t) => t.projectId === goal.projectId && t.goalId === goal.id,
  ),
  ...tallies
    .filter((t) => t.projectId === goal.projectId && t.goalId === goal.id)
    .map((t) => ({
      status: 'DONE',
      goalId: t.goalId,
      goalPartId: t.goalPartId ?? null,
      forDate: t.from,
      amount: t.amount,
    })),
];

/* --------------------------------- effort --------------------------------- */

export type EffortKey = `${PROJECT_EFFORT}` | 'NONE';

/** A project's effort, or the one of the project above it. */
export function effortOf(
  project: CalendarProject | undefined,
  byId: Map<string, CalendarProject>,
): EffortKey {
  let at = project;
  for (let i = 0; at && i < 20; i++) {
    if (at.effort) return at.effort as EffortKey;
    at = at.parentId ? byId.get(at.parentId) : undefined;
  }
  return 'NONE';
}

/* ---------------------------------- days ---------------------------------- */

export type DayState =
  /** Every task it was due done. */
  | 'done'
  /** Some of it done, and the day is over. */
  | 'partial'
  /** Due, and its day passed with nothing done. */
  | 'missed'
  /** Due and still in time (today, or a batch due later this week). */
  | 'open'
  /** One of its days, coming up. */
  | 'planned'
  /** A target goal moved on this day. */
  | 'progress'
  /** A target goal was reached on this day. */
  | 'reached'
  /** Nothing about this goal on this day. */
  | 'none';

export type GoalDay = {
  day: string;
  state: DayState;
  /** Tasks its schedule asks for on this day. */
  due: number;
  done: number;
  missed: number;
  planned: number;
  /** Added by hand on this day. */
  added: number;
  tasks: CalendarTask[];
};

/** The last day a run's tasks are still in time. */
function lastDayOf(goal: ProjectGoal, run: string) {
  const rule = goalRule(goal, goal.target);
  if (rule.dueInDays != null) return addDays(run, rule.dueInDays);
  return addDays(nextRunOnOrAfter(rule, addDays(run, 1)), -1);
}

/**
 * One goal, day by day over `days`: what was due, done and missed.
 * Repeating goals count work on the day it was for; targets on the day it
 * was done.
 */
export function goalDays(
  goal: CalendarGoal,
  tasks: CalendarTask[],
  tallies: CalendarTally[],
  days: string[],
  today: string = toDay(),
): Map<string, GoalDay> {
  const out = new Map<string, GoalDay>();
  const cell = (day: string) => {
    let c = out.get(day);
    if (!c) {
      c = {
        day,
        state: 'none',
        due: 0,
        done: 0,
        missed: 0,
        planned: 0,
        added: 0,
        tasks: [],
      };
      out.set(day, c);
    }
    return c;
  };
  const target = isTarget(goal);
  const shown = new Set(days);
  const mine = tasks.filter(
    (t) => t.projectId === goal.projectId && t.goalId === goal.id,
  );

  for (const t of mine) {
    if (t.status === 'DONE') {
      const day = target
        ? (dayOf(t.completedAt) ?? t.forDate)
        : countsOn(t as DoneTask);
      if (!day || !shown.has(day)) continue;
      const c = cell(day);
      c.done += 1;
      c.tasks.push(t);
    } else if (t.goalMissed?.day) {
      if (!shown.has(t.goalMissed.day)) continue;
      const c = cell(t.goalMissed.day);
      c.missed += 1;
      c.tasks.push(t);
    } else if (t.forDate && OPEN.includes(t.status)) {
      if (!shown.has(t.forDate)) continue;
      const c = cell(t.forDate);
      const late = !target && lastDayOf(goal, t.forDate) < today;
      if (late) c.missed += 1;
      else c.planned += 1;
      c.tasks.push(t);
    }
  }
  for (const t of tallies) {
    if (t.projectId !== goal.projectId || t.goalId !== goal.id) continue;
    if (!shown.has(t.from) || !t.amount) continue;
    cell(t.from).added += t.amount;
  }

  if (target) {
    for (const c of Array.from(out.values()))
      if (c.done || c.added > 0) c.state = 'progress';
    if (goal.achievedAt && shown.has(goal.achievedAt))
      cell(goal.achievedAt).state = 'reached';
    return out;
  }

  const rule = goalRule(goal, goal.target);
  const makes = goal.makeTasks !== false;
  for (const day of days) {
    const due =
      makes && runsOn(rule, day) && (!goal.since || day >= goal.since)
        ? rule.count
        : 0;
    if (due) cell(day).due = due;
    const c = out.get(day);
    if (!c) continue;
    const need = Math.max(1, c.due);
    const total = c.done + Math.max(0, c.added);
    const inTime = c.due
      ? lastDayOf(goal, day) >= today
      : day >= today || c.planned > 0;
    if (total >= need && !c.missed) c.state = 'done';
    else if (inTime && !c.missed)
      c.state = total ? 'partial' : day > today ? 'planned' : 'open';
    else if (total) c.state = 'partial';
    else if (c.due || c.missed) c.state = 'missed';
    else c.state = 'none';
  }
  return out;
}

/* --------------------------------- status --------------------------------- */

export type GoalStatus =
  | 'met'
  | 'on_track'
  | 'behind'
  | 'not_started'
  | 'reached'
  | 'climbing';

export const GOAL_STATUS: Record<
  GoalStatus,
  { label: string; hint: string; dot: string; text: string }
> = {
  met: {
    label: 'Met',
    hint: 'Reached its target for this period.',
    dot: 'bg-emerald-400',
    text: 'text-emerald-300 auto-light:text-emerald-700',
  },
  on_track: {
    label: 'On track',
    hint: 'Has done every day due so far this period.',
    dot: 'bg-sky-400',
    text: 'text-sky-300 auto-light:text-sky-700',
  },
  behind: {
    label: 'Behind',
    hint: 'Days due this period have passed without their work.',
    dot: 'bg-rose-400',
    text: 'text-rose-300 auto-light:text-rose-600',
  },
  not_started: {
    label: 'Not started',
    hint: 'Its first day is still to come.',
    dot: 'bg-neutral-500',
    text: 'text-neutral-400 auto-light:text-neutral-500',
  },
  reached: {
    label: 'Reached',
    hint: 'A target goal that hit its number.',
    dot: 'bg-amber-300',
    text: 'text-amber-200 auto-light:text-amber-700',
  },
  climbing: {
    label: 'Climbing',
    hint: 'A target goal still on its way to its number.',
    dot: 'bg-violet-400',
    text: 'text-violet-300 auto-light:text-violet-700',
  },
};

/**
 * How much of a repeating goal should be done by now this period: the
 * tasks of its days already over, or for a goal that makes no tasks, its
 * share of the days gone by.
 */
export function expectedByNow(goal: ProjectGoal, today: string = toDay()) {
  if (isTarget(goal)) return 0;
  const { from, to } = periodRange(goal.period, today, goal.since);
  const start = goal.since && goal.since > from ? goal.since : from;
  if (goal.makeTasks === false) {
    const total =
      (new Date(`${to}T00:00:00Z`).getTime() -
        new Date(`${start}T00:00:00Z`).getTime()) /
        86400000 +
      1;
    const gone =
      (new Date(`${today}T00:00:00Z`).getTime() -
        new Date(`${start}T00:00:00Z`).getTime()) /
      86400000;
    return Math.floor(goal.target * Math.max(0, Math.min(1, gone / total)));
  }
  const rule = goalRule(goal, goal.target);
  let n = 0;
  for (let day = start; day < today && day <= to; day = addDays(day, 1))
    if (runsOn(rule, day) && lastDayOf(goal, day) < today) n += rule.count;
  return Math.min(goal.target, n);
}

/** Where a goal stands now. */
export function goalStatus(
  goal: CalendarGoal,
  today: string = toDay(),
): GoalStatus {
  const p = goal.progress;
  if (isTarget(goal))
    return goal.achievedAt || p.achieved ? 'reached' : 'climbing';
  if (goal.since && goal.since > today) return 'not_started';
  if (p.done >= p.target) return 'met';
  return p.done >= expectedByNow(goal, today) ? 'on_track' : 'behind';
}

/* ---------------------------------- range --------------------------------- */

/** Every day from `from` to `to`. */
export function daysBetween(from: string, to: string) {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 400; d = addDays(d, 1))
    out.push(d);
  return out;
}

/** The weeks (Monday first) a month's calendar shows. */
export function monthGrid(month: string) {
  const first = `${month.slice(0, 7)}-01`;
  const last = periodRange('month', first).to;
  const start = addDays(
    first,
    -((new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7),
  );
  const weeks: string[][] = [];
  for (let d = start; d <= last && weeks.length < 6; d = addDays(d, 7))
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
  return weeks;
}

/** What a stretch of days adds up to, over many goals. */
export type RangeTotals = {
  due: number;
  done: number;
  missed: number;
  open: number;
  /** Days fully done out of days that were due and are over. */
  daysDone: number;
  daysOver: number;
};

export function rangeTotals(
  cells: Iterable<GoalDay>,
  today: string = toDay(),
): RangeTotals {
  const t: RangeTotals = {
    due: 0,
    done: 0,
    missed: 0,
    open: 0,
    daysDone: 0,
    daysOver: 0,
  };
  for (const c of Array.from(cells)) {
    t.due += c.due;
    t.done += c.done + Math.max(0, c.added);
    if (c.state === 'missed' || c.state === 'partial') t.missed += 1;
    if (c.state === 'open' || c.state === 'planned') t.open += 1;
    if (c.due && c.day < today) {
      t.daysOver += 1;
      if (c.state === 'done') t.daysDone += 1;
    }
  }
  return t;
}
