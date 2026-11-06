import {
  type CalendarCompany,
  type CalendarGoal,
  type CalendarProject,
  doneRows,
  type EffortKey,
  effortOf,
  type GoalDay,
  goalDays,
  goalKey,
  type GoalsCalendarData,
  type GoalStatus,
  goalStatus,
} from '@/lib/workspace/goalCalendar';
import {
  goalCadence,
  type GoalPeriodResult,
  goalPeriodsBetween,
  isTarget,
} from '@/lib/workspace/projects';

import type { Filters } from './GoalsFilters';

/** One goal, ready to draw: its project, standing and days. */
export type GoalRow = {
  key: string;
  goal: CalendarGoal;
  project: CalendarProject;
  company: CalendarCompany | undefined;
  effort: EffortKey;
  status: GoalStatus;
  color: string;
  /** Who it is for: its people, else its project's team. */
  people: string[];
  cadence: string;
  days: Map<string, GoalDay>;
  /** Periods of the month shown (repeating goals). */
  periods: GoalPeriodResult[];
};

export function buildRows(
  data: GoalsCalendarData,
  days: string[],
  month: { from: string; to: string },
): GoalRow[] {
  const byId = new Map(data.projects.map((p) => [p.id, p]));
  const companies = new Map(data.companies.map((c) => [c.id, c]));
  return data.goals
    .map((goal) => {
      const project = byId.get(goal.projectId);
      if (!project) return null;
      const team = [...(project.leadIds ?? []), ...(project.memberIds ?? [])];
      return {
        key: goalKey(goal),
        goal,
        project,
        company: companies.get(project.companyId),
        effort: effortOf(project, byId),
        status: goalStatus(goal, data.today),
        color: project.color || '#10b981',
        people: Array.from(
          new Set(goal.assigneeIds?.length ? goal.assigneeIds : team),
        ),
        cadence: isTarget(goal) ? 'target' : goalCadence(goal),
        days: goalDays(goal, data.tasks, data.tallies, days, data.today),
        periods: goalPeriodsBetween(
          goal,
          doneRows(goal, data.tasks, data.tallies),
          month.from,
          month.to,
          data.today,
        ),
      } satisfies GoalRow;
    })
    .filter((r): r is GoalRow => !!r);
}

/** Rows that pass every filter but, when named, one of them. */
export function applyFilters(
  rows: GoalRow[],
  f: Filters,
  skip?: keyof Filters,
): GoalRow[] {
  const q = f.q.trim().toLowerCase();
  return rows.filter((r) => {
    if (
      skip !== 'companyId' &&
      f.companyId &&
      r.project.companyId !== f.companyId
    )
      return false;
    if (skip !== 'efforts' && f.efforts.length && !f.efforts.includes(r.effort))
      return false;
    if (f.projectIds.length && !f.projectIds.includes(r.project.id))
      return false;
    if (f.statuses.length && !f.statuses.includes(r.status)) return false;
    if (f.kinds.length && !f.kinds.includes(r.goal.kind ?? 'scheduled'))
      return false;
    if (
      f.cadences.length &&
      (isTarget(r.goal) || !f.cadences.includes(r.goal.period))
    )
      return false;
    if (f.personId && !r.people.includes(f.personId)) return false;
    if (
      q &&
      !`${r.goal.title} ${r.project.name} ${r.company?.name ?? ''}`
        .toLowerCase()
        .includes(q)
    )
      return false;
    return true;
  });
}

const EFFORT_ORDER: EffortKey[] = ['HIGH', 'MEDIUM', 'LOW', 'NONE'];

/** Higher effort first, then company, project and goal. */
export const sortRows = (rows: GoalRow[]) =>
  [...rows].sort(
    (a, b) =>
      EFFORT_ORDER.indexOf(a.effort) - EFFORT_ORDER.indexOf(b.effort) ||
      (a.company?.name ?? '').localeCompare(b.company?.name ?? '') ||
      a.project.name.localeCompare(b.project.name) ||
      Number(isTarget(a.goal)) - Number(isTarget(b.goal)) ||
      a.goal.title.localeCompare(b.goal.title),
  );

/** Rows grouped by project, in row order. */
export function byProject(rows: GoalRow[]) {
  const groups: { project: GoalRow['project']; rows: GoalRow[] }[] = [];
  for (const r of rows) {
    const g = groups.find((x) => x.project.id === r.project.id);
    if (g) g.rows.push(r);
    else groups.push({ project: r.project, rows: [r] });
  }
  return groups;
}

/* --------------------------------- filters -------------------------------- */

const LIST_KEYS = [
  'efforts',
  'projectIds',
  'statuses',
  'kinds',
  'cadences',
] as const;

/** Filters as URL search params, so a filtered view can be shared. */
export function filtersToParams(f: Filters, params: URLSearchParams) {
  const set = (k: string, v: string | null) =>
    v ? params.set(k, v) : params.delete(k);
  set('q', f.q || null);
  set('company', f.companyId);
  set('person', f.personId);
  LIST_KEYS.forEach((k) => set(k, f[k].length ? f[k].join(',') : null));
  return params;
}

export function filtersFromParams(params: URLSearchParams): Filters {
  const list = (k: string) =>
    (params.get(k) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  return {
    q: params.get('q') ?? '',
    companyId: params.get('company'),
    personId: params.get('person'),
    efforts: list('efforts') as Filters['efforts'],
    projectIds: list('projectIds'),
    statuses: list('statuses') as Filters['statuses'],
    kinds: list('kinds') as Filters['kinds'],
    cadences: list('cadences') as Filters['cadences'],
  };
}
