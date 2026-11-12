import { todayKey } from './dates';
import type { Day, Task, WorkPoint } from './types';

/*
 * A day's tasks the way the website's worklog page shows them
 * (portal/components/screens/Worklogs/DayLog): by project, as a plan
 * (the day and what is pending from before) or as work (under way and
 * finished). Pure, so the screens stay about layout.
 */

export type DayMode = 'projects' | 'plan' | 'work';

export const DAY_MODES: { value: DayMode; label: string }[] = [
  { value: 'projects', label: 'Projects' },
  { value: 'plan', label: 'Plan' },
  { value: 'work', label: 'Work' },
];

export type RowStatus = 'done' | 'archived' | 'blocked' | 'waiting' | 'doing' | 'not_done' | null;

/** How a task stands on a day: its status, else the day's last point. */
export function rowStatus(task: Task, points: WorkPoint[], date: string): RowStatus {
  if (task.status === 'DONE') return 'done';
  if (task.status === 'ARCHIVED' || task.status === 'IGNORED') return 'archived';
  if (task.flag === 'blocked' || task.flag === 'waiting') return task.flag;
  if (task.status === 'IN_PROGRESS' || task.status === 'IN_REVIEW') return 'doing';
  const last = points.filter((p) => p.taskId === task.id && p.status && p.date === date).at(-1);
  return last?.status === 'not_done' ? 'not_done' : null;
}

const FINISHED: RowStatus[] = ['done', 'not_done', 'archived'];

/**
 * A task that moved on from a past day: still open, or finished on a later
 * day. On that day it is put away.
 */
function movedOn(task: Task, date: string, today: string) {
  if (date >= today) return false;
  if (task.status === 'DONE')
    return !!task.completedAt && todayKey(new Date(task.completedAt)) > date;
  return task.status !== 'ARCHIVED' && task.status !== 'IGNORED';
}

export type Place = {
  key: string;
  name: string;
  color?: string | null;
  logo?: string | null;
  /** The company the project is in, when it isn't the only one. */
  companyName?: string | null;
  personal?: boolean;
};

/** Where a task is: its project, its company, Personal or nowhere yet. */
export function placeOf(task: Task, day: Pick<Day, 'projects' | 'companies'>): Place {
  if (task.projectId) {
    const project = day.projects.find((p) => p.id === task.projectId);
    if (project?.isPersonal)
      return { key: 'personal', name: project.name || 'Personal', color: project.color, personal: true };
    return {
      key: `project:${task.projectId}`,
      name: project?.name ?? 'Project',
      color: project?.color,
      logo: project?.logo,
      companyName: project?.companyName,
    };
  }
  const company = day.companies?.find((c) => c.id === task.companyId);
  if (company?.isPersonal) return { key: 'personal', name: 'Personal', personal: true };
  if (company) return { key: `company:${company.id}`, name: company.name };
  return { key: 'none', name: 'Not in a project yet' };
}

export type DayGroup = {
  key: string;
  title: string;
  place?: Place;
  tasks: Task[];
  /** Finished work: quieter, struck through. */
  quiet?: boolean;
};

/** The day's tasks in groups for a mode. */
export function groupsFor(mode: DayMode, day: Day, date: string): DayGroup[] {
  const today = day.today || todayKey();
  const tasks = day.tasks.filter((t) => t.title.trim());
  const fromBefore = (t: Task) => !!t.forDate && t.forDate < date;
  const dayName = date === today ? 'Today' : 'This day';
  const beforeName = date === today ? 'Pending from before' : 'From before';

  if (mode === 'plan')
    return [
      { key: 'plan-day', title: dayName, tasks: tasks.filter((t) => !fromBefore(t)) },
      { key: 'plan-before', title: beforeName, tasks: tasks.filter(fromBefore) },
    ].filter((g) => g.tasks.length);

  if (mode === 'work') {
    const finished = (t: Task) =>
      !movedOn(t, date, today) && FINISHED.includes(rowStatus(t, day.points, date));
    return [
      { key: 'wip', title: 'WIP', tasks: tasks.filter((t) => !finished(t)) },
      { key: 'finished', title: 'Finished', tasks: tasks.filter(finished), quiet: true },
    ].filter((g) => g.tasks.length);
  }

  // Projects: one group per place, in the order the tasks first show up,
  // Personal and the unplaced last.
  const groups = new Map<string, DayGroup>();
  for (const task of tasks) {
    const place = placeOf(task, day);
    const group = groups.get(place.key) ?? { key: place.key, title: place.name, place, tasks: [] };
    group.tasks.push(task);
    groups.set(place.key, group);
  }
  const rank = (g: DayGroup) => (g.key === 'none' ? 2 : g.place?.personal ? 1 : 0);
  return Array.from(groups.values()).sort((a, b) => rank(a) - rank(b));
}

/** Finished and total, for the Work view's bar. */
export function workTally(day: Day, date: string) {
  const today = day.today || todayKey();
  const tasks = day.tasks.filter((t) => t.title.trim());
  const done = tasks.filter(
    (t) => !movedOn(t, date, today) && FINISHED.includes(rowStatus(t, day.points, date)),
  ).length;
  return { done, total: tasks.length };
}

/** The task's work points on the day, oldest first, that say something. */
export const pointsOn = (task: Task, points: WorkPoint[], date: string) =>
  points.filter((p) => p.taskId === task.id && p.date === date && p.text.trim());
