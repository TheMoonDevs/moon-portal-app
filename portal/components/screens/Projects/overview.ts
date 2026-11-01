import { descendantsOf } from '@/lib/workspace/projectProgress';

import type { ProjectRow } from '../Admin/Workspace/AdminProjects';
import type { Person } from '../Project/types';

export type OverviewCompany = {
  id: string;
  name: string;
  color: string | null;
  logo: string | null;
  description?: string | null;
  /** Its active members. */
  memberIds?: string[];
};

export type OverviewProject = ProjectRow & {
  activity: {
    from: string;
    /** Lines logged on each of the last 7 days, oldest first. */
    days: number[];
    /** People who logged work this week, most recent first. */
    people: string[];
    lastDate: string | null;
  };
  tasks: { open: number; overdue: number };
  today: { total: number; done: number };
  /** This month, from the 1st to today. */
  month?: {
    from: string;
    /** Work logged on each day of the month so far. */
    days: number[];
    /** Tasks finished this month, and how many of them were major. */
    done: number;
    major: number;
    people: { userId: string; logged: number; done: number }[];
  };
};

export type Overview = {
  companies: OverviewCompany[];
  projects: OverviewProject[];
  users: Person[];
};

/* --------------------------------- status --------------------------------- */

export const PULSES = {
  moving: {
    label: 'Moving',
    dot: 'bg-emerald-400',
    hint: 'Someone logged work on it in the last 7 days and nothing is overdue.',
  },
  quiet: {
    label: 'Quiet',
    dot: 'bg-amber-300',
    hint: 'Nobody logged work on it in the last 7 days.',
  },
  attention: {
    label: 'Needs a look',
    dot: 'bg-rose-400',
    hint: 'It has tasks past their due date.',
  },
  paused: {
    label: 'Paused',
    dot: 'bg-neutral-500',
    hint: 'Its status is not Active (planning, on hold or completed).',
  },
} as const;

export type Pulse = keyof typeof PULSES;

/** How the project is doing: overdue work, work this week, or none. */
export const pulseOf = (p: OverviewProject): Pulse => {
  if (p.status !== 'ACTIVE') return 'paused';
  if (p.tasks.overdue) return 'attention';
  return p.activity.days.some(Boolean) ? 'moving' : 'quiet';
};

/* ---------------------------------- goals --------------------------------- */

const PERIOD_NOW: Record<string, string> = {
  day: 'today',
  week: 'this week',
  month: 'this month',
};

const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * A project's goals as short lines of text, like "2/3 videos this week" or
 * "15,500/25,000 subscribers".
 */
export const goalLines = (p: OverviewProject) =>
  (p.goals ?? []).map((goal) => {
    const progress = p.goalProgress?.find((g) => g.goalId === goal.id);
    const done = progress?.done ?? 0;
    const target = progress?.target ?? goal.target;
    const isTarget = goal.kind === 'target';
    return {
      id: goal.id,
      text: `${fmt(done)}/${fmt(target)} ${goal.title}${isTarget ? '' : ` ${PERIOD_NOW[goal.period] ?? ''}`}`.trim(),
      met: done >= target || (isTarget && !!goal.achievedAt),
    };
  });

/* ------------------------------ this month -------------------------------- */

/** The project and every project under it. */
export const familyOf = (p: OverviewProject, all: OverviewProject[]) => [
  p,
  ...descendantsOf(all, p.id),
];

/**
 * Tasks finished this month against the work still open, for a project and
 * its sub-projects.
 */
export const monthTasks = (p: OverviewProject, all: OverviewProject[]) => {
  const family = familyOf(p, all);
  const done = family.reduce((n, x) => n + (x.month?.done ?? 0), 0);
  const open = family.reduce((n, x) => n + x.tasks.open, 0);
  const overdue = family.reduce((n, x) => n + x.tasks.overdue, 0);
  const logged = family.reduce(
    (n, x) => n + (x.month?.days ?? []).reduce((m, d) => m + d, 0),
    0,
  );
  return {
    done,
    open,
    overdue,
    logged,
    percent: done + open ? Math.round((done / (done + open)) * 100) : 0,
  };
};

export const monthName = (day = new Date()) =>
  day.toLocaleString('en-US', { month: 'long' });
