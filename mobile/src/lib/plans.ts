import { useQuery } from '@tanstack/react-query';

import { api } from './api';
import type { Plan, PlansList } from './types';

/** Every plan the person can see, across their companies. */
export function usePlans() {
  return useQuery({ queryKey: ['plans'], queryFn: () => api<PlansList>('/api/plans') });
}

export const PLAN_STATUS: Record<string, string> = {
  IDEA: 'Idea',
  ACTIVE: 'Active',
  DONE: 'Done',
  DROPPED: 'Dropped',
};

/** Steps that can be done (not plain notes), and how many are. */
export function stepCount(plan: Plan) {
  const doable = plan.steps.filter((s) => s.kind !== 'info');
  return { done: doable.filter((s) => s.done).length, total: doable.length };
}
