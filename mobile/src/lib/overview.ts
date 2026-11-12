import type { OverviewProject } from './types';

/*
 * The projects page's reading of each project, as on the website
 * (portal/components/screens/Projects/overview.ts): how it is doing, its
 * goals as short lines, and this month's tasks with its sub-projects.
 */

export const PULSES = {
  moving: { label: 'Moving', color: '#34d399', hint: 'Work logged in the last 7 days, nothing overdue.' },
  quiet: { label: 'Quiet', color: '#fcd34d', hint: 'Nothing logged in the last 7 days.' },
  attention: { label: 'Needs a look', color: '#fb7185', hint: 'Tasks past their due date.' },
  paused: { label: 'Paused', color: '#737373', hint: 'Planning, on hold or completed.' },
} as const;

export type Pulse = keyof typeof PULSES;

/** How the project is doing: overdue work, work this week, or none. */
export function pulseOf(p: OverviewProject): Pulse {
  if (p.status !== 'ACTIVE') return 'paused';
  if (p.tasks.overdue) return 'attention';
  return p.activity.days.some(Boolean) ? 'moving' : 'quiet';
}

const PERIOD_NOW: Record<string, string> = {
  day: 'today',
  week: 'this week',
  fortnight: 'these 2 weeks',
  month: 'this month',
  quarter: 'this quarter',
};

const fmt = (n: number) => n.toLocaleString('en-US');

/** "2/3 videos this week", "15,500/25,000 subscribers". */
export function goalLines(p: OverviewProject) {
  return (p.goals ?? []).map((goal) => {
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
}

/** The projects under a project, all the way down. */
export function descendantsOf(all: OverviewProject[], id: string): OverviewProject[] {
  const children = all.filter((p) => p.parentId === id);
  return children.flatMap((c) => [c, ...descendantsOf(all, c.id)]);
}

/** Tasks finished this month against the work still open, with sub-projects. */
export function monthTasks(p: OverviewProject, all: OverviewProject[]) {
  const family = [p, ...descendantsOf(all, p.id)];
  const done = family.reduce((n, x) => n + (x.month?.done ?? 0), 0);
  const open = family.reduce((n, x) => n + x.tasks.open, 0);
  const overdue = family.reduce((n, x) => n + x.tasks.overdue, 0);
  return { done, open, overdue, percent: done + open ? Math.round((done / (done + open)) * 100) : 0 };
}
