import { addDays, fromKey, todayKey } from './dates';
import type { PointStatus } from './types';

/*
 * A person's page, as on the website (portal/components/screens/UserPage):
 * their work by company, project and task; six months of activity; and
 * what is ahead of them. Shapes from portal/lib/people/types.ts, trimmed.
 */

export type PagePerson = {
  id: string;
  name?: string | null;
  username?: string | null;
  avatar?: string | null;
  positionTitle?: string | null;
};

export type PageCompany = {
  id: string;
  name: string;
  color?: string | null;
  logo?: string | null;
  isPersonal?: boolean;
};

export type PageProject = {
  id: string;
  name: string;
  companyId: string;
  color?: string | null;
  logo?: string | null;
};

export type PageTask = {
  id: string;
  title: string;
  status: string;
  size?: string;
  projectId: string;
  companyId: string;
  dueDate?: string | null;
  forDate?: string | null;
  completedAt?: string | null;
  planId?: string | null;
};

export type PagePoint = {
  key: string;
  text: string;
  status: PointStatus | null;
  isPrivate?: boolean;
  byClaude: boolean;
  companyId: string | null;
  projectId: string | null;
  taskId: string | null;
  /** Days it was on, oldest first. */
  dates: string[];
};

/** GET /api/people/:id/work?from=&to= */
export type WorkData = {
  person: PagePerson;
  isSelf: boolean;
  from: string;
  to: string;
  points: PagePoint[];
  doneTasks: PageTask[];
  tasks: PageTask[];
  projects: PageProject[];
  companies: PageCompany[];
  hiddenCount: number;
};

/** GET /api/people/:id/activity: points logged per day. */
export type ActivityData = { from: string; to: string; days: Record<string, number> };

export type PageStep = {
  planId: string;
  stepId: string;
  text: string;
  dueOn?: string | null;
  projectId?: string | null;
  companyId: string;
};

export type PageSchedule = {
  id: string;
  title: string;
  projectId: string;
  companyId: string;
  count: number;
  nextRunOn: string;
};

export type PageMeeting = {
  id: string;
  guestName: string;
  start: string;
  end: string;
  status: string;
  meetingUrl?: string | null;
};

/** GET /api/people/:id/agenda */
export type AgendaData = {
  isSelf: boolean;
  tasks: PageTask[];
  steps: PageStep[];
  schedules: PageSchedule[];
  meetings: PageMeeting[] | null;
  projects: PageProject[];
  companies: PageCompany[];
};

/* --------------------------------- Periods -------------------------------- */

export type PeriodKind = 'day' | 'week' | 'month';
export type Period = { kind: PeriodKind; from: string; to: string };

/** The day, week (Monday first) or month around a day. */
export function periodOf(kind: PeriodKind, anchor: string): Period {
  if (kind === 'day') return { kind, from: anchor, to: anchor };
  if (kind === 'week') {
    const from = addDays(anchor, -((fromKey(anchor).getDay() + 6) % 7));
    return { kind, from, to: addDays(from, 6) };
  }
  const d = fromKey(anchor);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { kind, from: `${anchor.slice(0, 7)}-01`, to: todayKey(last) };
}

export function shiftPeriod(period: Period, step: number): Period {
  if (period.kind === 'day') return periodOf('day', addDays(period.from, step));
  if (period.kind === 'week') return periodOf('week', addDays(period.from, step * 7));
  const d = fromKey(period.from);
  return periodOf('month', todayKey(new Date(d.getFullYear(), d.getMonth() + step, 1)));
}

const short = (key: string) =>
  fromKey(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** "This week" and "9 – 15 Nov", "Yesterday" and "Wednesday, 11 Nov". */
export function periodLabel(period: Period) {
  const current = periodOf(period.kind, todayKey());
  const range = period.from === period.to ? '' : `${short(period.from)} – ${short(period.to)}`;
  if (period.kind === 'day') {
    const long = fromKey(period.from).toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
    if (current.from === period.from) return { title: 'Today', range: long };
    if (shiftPeriod(current, -1).from === period.from) return { title: 'Yesterday', range: long };
    return { title: short(period.from), range: long };
  }
  if (current.from === period.from) return { title: `This ${period.kind}`, range };
  if (shiftPeriod(current, -1).from === period.from) return { title: `Last ${period.kind}`, range };
  if (period.kind === 'month')
    return {
      title: fromKey(period.from).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      range,
    };
  return { title: range, range: '' };
}

/* ---------------------------------- Work ---------------------------------- */

export type TaskGroup = { task: PageTask | null; title: string; points: PagePoint[]; closed: boolean };
export type ProjectGroup = { project: PageProject | null; tasks: TaskGroup[]; points: number; closed: number };
export type CompanyGroup = { company: PageCompany | null; projects: ProjectGroup[]; points: number; closed: number };

const lastDay = (p: PagePoint) => p.dates[p.dates.length - 1] ?? '';

/** Points and finished tasks as companies → projects → tasks, busiest first. */
export function groupWork(data: WorkData): CompanyGroup[] {
  const taskById = new Map([...data.tasks, ...data.doneTasks].map((t) => [t.id, t]));
  const projectById = new Map(data.projects.map((p) => [p.id, p]));
  const closed = new Set(data.doneTasks.map((t) => t.id));
  const tree = new Map<string, Map<string, Map<string, PagePoint[]>>>();
  const add = (c: string, p: string, t: string, point?: PagePoint) => {
    const projects = tree.get(c) ?? new Map<string, Map<string, PagePoint[]>>();
    tree.set(c, projects);
    const tasks = projects.get(p) ?? new Map<string, PagePoint[]>();
    projects.set(p, tasks);
    const list = tasks.get(t) ?? [];
    tasks.set(t, list);
    if (point) list.push(point);
  };
  for (const point of data.points) {
    const project = point.projectId ? projectById.get(point.projectId) : undefined;
    add(project?.companyId ?? point.companyId ?? '', project?.id ?? '', point.taskId ?? '', point);
  }
  for (const task of data.doneTasks) add(task.companyId, task.projectId, task.id);

  const groups = Array.from(tree.entries()).map(([companyId, projects]): CompanyGroup => {
    const projectGroups = Array.from(projects.entries()).map(([projectId, tasks]): ProjectGroup => {
      const taskGroups = Array.from(tasks.entries())
        .map(([taskId, points]): TaskGroup => {
          const task = taskId ? (taskById.get(taskId) ?? null) : null;
          const sorted = points.sort((a, b) => lastDay(b).localeCompare(lastDay(a)));
          return {
            task,
            title: task?.title ?? sorted[0]?.text ?? 'Work',
            points: sorted,
            closed: !!taskId && closed.has(taskId),
          };
        })
        .sort((a, b) => b.points.length - a.points.length || Number(b.closed) - Number(a.closed));
      return {
        project: projectId ? (projectById.get(projectId) ?? null) : null,
        tasks: taskGroups,
        points: taskGroups.reduce((n, g) => n + g.points.length, 0),
        closed: taskGroups.filter((g) => g.closed).length,
      };
    });
    projectGroups.sort((a, b) =>
      !a.project !== !b.project ? (a.project ? -1 : 1) : b.points + b.closed - (a.points + a.closed),
    );
    return {
      company: companyId
        ? (data.companies.find((c) => c.id === companyId) ?? { id: companyId, name: 'Another company' })
        : null,
      projects: projectGroups,
      points: projectGroups.reduce((n, p) => n + p.points, 0),
      closed: projectGroups.reduce((n, p) => n + p.closed, 0),
    };
  });
  const rank = (g: CompanyGroup) => (!g.company ? 2 : g.company.isPersonal ? 1 : 0);
  return groups.sort((a, b) => rank(a) - rank(b) || b.points + b.closed - (a.points + a.closed));
}

/* ------------------------------- Activity -------------------------------- */

/** 26 Monday-first weeks, ending with this one. */
export function activityWeeks(today = todayKey()) {
  const monday = addDays(today, -((fromKey(today).getDay() + 6) % 7));
  const first = addDays(monday, -25 * 7);
  return Array.from({ length: 26 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)),
  );
}

/** 0 to 4: how bright a day's square is. */
export const activityLevel = (n: number) => (n <= 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : n <= 7 ? 3 : 4);

/** Days in a row up to today (or yesterday, when today is still empty). */
export function streakOf(days: Record<string, number>, today = todayKey()) {
  let d = days[today] ? today : addDays(today, -1);
  let n = 0;
  while (days[d]) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/* --------------------------------- Up next -------------------------------- */

export type AgendaItem =
  | { kind: 'task'; id: string; day: string | null; task: PageTask }
  | { kind: 'step'; id: string; day: string | null; step: PageStep }
  | { kind: 'repeat'; id: string; day: string; schedule: PageSchedule }
  | { kind: 'meeting'; id: string; day: string; meeting: PageMeeting };

export type Bucket = { key: string; label: string; items: AgendaItem[] };

const ORDER: AgendaItem['kind'][] = ['meeting', 'task', 'step', 'repeat'];

/**
 * Overdue, today, tomorrow, the rest of this week, later and undated. A
 * repeating task shows once, on its next run, in the coming week.
 */
export function upNext(agenda: AgendaData, today = todayKey()): Bucket[] {
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, (7 - fromKey(today).getDay()) % 7);
  const items: AgendaItem[] = [
    ...agenda.tasks.map((task): AgendaItem => ({
      kind: 'task',
      id: task.id,
      day: task.dueDate || task.forDate || null,
      task,
    })),
    ...agenda.steps.map((step): AgendaItem => ({
      kind: 'step',
      id: `${step.planId}:${step.stepId}`,
      day: step.dueOn ?? null,
      step,
    })),
    ...(agenda.meetings ?? []).map((meeting): AgendaItem => ({
      kind: 'meeting',
      id: meeting.id,
      day: todayKey(new Date(meeting.start)),
      meeting,
    })),
    ...agenda.schedules
      .filter((s) => s.nextRunOn <= addDays(today, 6))
      .map((schedule): AgendaItem => ({
        kind: 'repeat',
        id: schedule.id,
        day: schedule.nextRunOn < today ? today : schedule.nextRunOn,
        schedule,
      })),
  ];
  const buckets: Bucket[] = [
    { key: 'overdue', label: 'Overdue', items: [] },
    { key: 'today', label: 'Today', items: [] },
    { key: 'tomorrow', label: 'Tomorrow', items: [] },
    { key: 'week', label: 'This week', items: [] },
    { key: 'later', label: 'Later', items: [] },
    { key: 'anytime', label: 'No date', items: [] },
  ];
  const put = (key: string, item: AgendaItem) => buckets.find((b) => b.key === key)!.items.push(item);
  for (const item of items) {
    if (!item.day) put('anytime', item);
    else if (item.day < today) put('overdue', item);
    else if (item.day === today) put('today', item);
    else if (item.day === tomorrow) put('tomorrow', item);
    else if (item.day <= weekEnd) put('week', item);
    else put('later', item);
  }
  for (const b of buckets)
    b.items.sort((x, y) =>
      x.day && y.day && x.day !== y.day
        ? x.day.localeCompare(y.day)
        : x.kind === 'meeting' && y.kind === 'meeting'
          ? x.meeting.start.localeCompare(y.meeting.start)
          : ORDER.indexOf(x.kind) - ORDER.indexOf(y.kind),
    );
  return buckets.filter((b) => b.items.length);
}

export const itemTitle = (item: AgendaItem) =>
  item.kind === 'task'
    ? item.task.title
    : item.kind === 'step'
      ? item.step.text
      : item.kind === 'repeat'
        ? item.schedule.count > 1
          ? `${item.schedule.title} ×${item.schedule.count}`
          : item.schedule.title
        : `Meeting with ${item.meeting.guestName}`;

export const itemProjectId = (item: AgendaItem) =>
  item.kind === 'task'
    ? item.task.projectId
    : item.kind === 'step'
      ? (item.step.projectId ?? null)
      : item.kind === 'repeat'
        ? item.schedule.projectId
        : null;
