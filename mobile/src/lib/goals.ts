import { useQuery } from '@tanstack/react-query';

import { api, withQuery } from './api';
import { monthRange } from './dates';
import type { GoalProgress, GoalsCalendar, ProjectGoal } from './types';

/** The goals calendar for a YYYY-MM month: every goal, its tasks and progress. */
export function useGoals(month: string) {
  const { from, to } = monthRange(month);
  return useQuery({
    queryKey: ['goals', from, to],
    queryFn: () => api<GoalsCalendar>(withQuery('/api/goals', { from, to })),
  });
}

/** "this week", "today": the period a scheduled goal counts in now. */
export const PERIOD_NOW: Record<string, string> = {
  day: 'today',
  week: 'this week',
  fortnight: 'this fortnight',
  month: 'this month',
  quarter: 'this quarter',
};

/** "3 a week". */
export const PERIOD_EACH: Record<string, string> = {
  day: 'a day',
  week: 'a week',
  fortnight: 'a fortnight',
  month: 'a month',
  quarter: 'a quarter',
};

/** "2 of 3 this week", "640 of 1,000", "reached". */
export function goalLine(goal: Pick<ProjectGoal, 'kind' | 'period' | 'target' | 'achievedAt'>, progress?: GoalProgress) {
  const n = (v: number) => v.toLocaleString();
  if (!progress) return goal.kind === 'target' ? `Target ${n(goal.target)}` : `${n(goal.target)} ${PERIOD_EACH[goal.period] ?? ''}`;
  const done = progress.done + progress.manual;
  if (goal.kind === 'target')
    return `${n(done)} of ${n(progress.target)}${progress.achieved || goal.achievedAt ? ' · reached' : ''}`;
  return `${n(done)} of ${n(progress.target)} ${PERIOD_NOW[goal.period] ?? ''}`.trim();
}
