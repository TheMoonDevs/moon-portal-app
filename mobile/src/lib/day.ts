import { todayKey } from './dates';
import { isCoreProject } from './project-name';
import type { Day, Task, WorkPoint } from './types';

/*
 * A day's tasks the way the website's worklog page shows them
 * (portal/components/screens/Worklogs/DayLog): a summary by project, as
 * work (doing, to do, done) or as a plan (the day and what is pending from
 * before). Pure, so the screens stay about layout.
 */

export type DayMode = 'summary' | 'work' | 'plan';

export const DAY_MODES: { value: DayMode; label: string }[] = [
  { value: 'summary', label: 'Summary' },
  { value: 'work', label: 'Work' },
  { value: 'plan', label: 'Plan' },
];

export type RowStatus =
  | 'done'
  | 'archived'
  | 'blocked'
  | 'waiting'
  | 'paused'
  | 'doing'
  | 'not_done'
  | null;

/** How a task stands on a day: its status, else the day's last point. */
export function rowStatus(task: Task, points: WorkPoint[], date: string): RowStatus {
  if (task.status === 'DONE') return 'done';
  if (task.status === 'ARCHIVED' || task.status === 'IGNORED') return 'archived';
  if (task.flag === 'blocked' || task.flag === 'waiting' || task.flag === 'paused') return task.flag;
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
    // A company's general work (its core project) goes by the company's name.
    if (isCoreProject(project)) {
      const company = day.companies?.find((c) => c.id === (project?.companyId ?? task.companyId));
      return {
        key: `project:${task.projectId}`,
        name: company?.name ?? project?.companyName ?? 'Company work',
        color: project?.color,
      };
    }
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
    const sections = { doing: [] as Task[], todo: [] as Task[], done: [] as Task[] };
    for (const t of tasks) sections[workSection(t, day, date, today)].push(t);
    return [
      { key: 'doing', title: 'Doing', tasks: sections.doing },
      { key: 'todo', title: 'To do', tasks: sections.todo },
      { key: 'done', title: 'Done', tasks: sections.done, quiet: true },
    ].filter((g) => g.tasks.length);
  }

  // Summary: one group per place, in the order the tasks first show up,
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

/**
 * Where a task goes in the Work view: waiting and blocked are still being
 * done, paused and not done are back to do. A task that moved on from a past
 * day shows as it stood then: open, so doing or to do.
 */
function workSection(task: Task, day: Day, date: string, today: string): 'doing' | 'todo' | 'done' {
  const status = rowStatus(task, day.points, date);
  if (movedOn(task, date, today))
    return status === 'done' || status === 'doing' || status === 'waiting' || status === 'blocked'
      ? 'doing'
      : 'todo';
  if (FINISHED.includes(status) && status !== 'not_done') return 'done';
  if (status === 'doing' || status === 'waiting' || status === 'blocked') return 'doing';
  return 'todo';
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
