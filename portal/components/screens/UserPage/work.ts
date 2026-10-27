import dayjs, { type Dayjs } from 'dayjs';

import type {
  PageCompany,
  PageProject,
  PageTask,
  WorkData,
  WorkPoint,
} from '@/lib/people/types';
import { PERSONAL_COMPANY_ID } from '@/lib/worklogs/personal';

/*
 * The work view's periods and how points group into companies, projects and
 * tasks. Pure, so the screens stay about layout.
 */

export type PeriodKind = 'day' | 'week' | 'month' | 'quarter';

export type Period = { kind: PeriodKind; from: string; to: string };

const fmt = (d: Dayjs) => d.format('YYYY-MM-DD');

/** Weeks start on Monday. */
const startOfWeek = (d: Dayjs) => d.subtract((d.day() + 6) % 7, 'day');

export function periodOf(kind: PeriodKind, anchor: Dayjs): Period {
  if (kind === 'day') return { kind, from: fmt(anchor), to: fmt(anchor) };
  if (kind === 'week') {
    const start = startOfWeek(anchor);
    return { kind, from: fmt(start), to: fmt(start.add(6, 'day')) };
  }
  if (kind === 'month') {
    const start = anchor.startOf('month');
    return { kind, from: fmt(start), to: fmt(start.endOf('month')) };
  }
  const start = anchor
    .startOf('month')
    .month(Math.floor(anchor.month() / 3) * 3);
  return {
    kind,
    from: fmt(start),
    to: fmt(start.add(2, 'month').endOf('month')),
  };
}

export function shiftPeriod(period: Period, step: number): Period {
  const anchor = dayjs(period.from);
  const unit = period.kind === 'quarter' ? 3 : 1;
  return periodOf(
    period.kind,
    period.kind === 'day'
      ? anchor.add(step, 'day')
      : period.kind === 'week'
        ? anchor.add(step, 'week')
        : anchor.add(step * unit, 'month'),
  );
}

export function periodLabel(period: Period) {
  const from = dayjs(period.from);
  const to = dayjs(period.to);
  const current = periodOf(period.kind, dayjs());
  if (period.kind === 'day') {
    const date = from.format('dddd, D MMMM');
    if (current.from === period.from) return { title: 'Today', range: date };
    if (shiftPeriod(current, -1).from === period.from)
      return { title: 'Yesterday', range: date };
    return {
      title: from.format('ddd D MMM'),
      range: from.isSame(dayjs(), 'year')
        ? from.format('dddd')
        : from.format('YYYY'),
    };
  }
  if (current.from === period.from)
    return { title: `This ${period.kind}`, range: rangeText(from, to) };
  if (shiftPeriod(current, -1).from === period.from)
    return { title: `Last ${period.kind}`, range: rangeText(from, to) };
  if (period.kind === 'month')
    return { title: from.format('MMMM YYYY'), range: rangeText(from, to) };
  if (period.kind === 'quarter')
    return {
      title: `Q${Math.floor(from.month() / 3) + 1} ${from.year()}`,
      range: rangeText(from, to),
    };
  return { title: rangeText(from, to), range: '' };
}

function rangeText(from: Dayjs, to: Dayjs) {
  if (from.isSame(to, 'month'))
    return `${from.format('D')} – ${to.format('D MMM')}`;
  return `${from.format('D MMM')} – ${to.format('D MMM')}`;
}

export const isDone = (p: WorkPoint) => p.status === 'done';

/** The day a point is shown on: the last day it was on. */
export const lastDay = (p: WorkPoint) => p.dates[p.dates.length - 1];

export type TaskGroup = {
  /** Null for work in the project that is not on a task. */
  task: PageTask | null;
  points: WorkPoint[];
  /** The task was finished in the period. */
  closed: boolean;
};

export type ProjectGroup = {
  /** Null for points in the company that are not on a project. */
  project: PageProject | null;
  tasks: TaskGroup[];
  points: number;
  done: number;
  closedTasks: number;
};

export type CompanyGroup = {
  /** Null for points not linked anywhere yet. */
  company: PageCompany | null;
  projects: ProjectGroup[];
  points: number;
  done: number;
  closedTasks: number;
};

const sum = <T>(xs: T[], f: (x: T) => number) =>
  xs.reduce((n, x) => n + f(x), 0);

/** Points and finished tasks as companies → projects → tasks, busiest first. */
export function groupWork(data: WorkData): CompanyGroup[] {
  const taskById = new Map(
    [...data.tasks, ...data.doneTasks].map((t) => [t.id, t]),
  );
  const projectById = new Map(data.projects.map((p) => [p.id, p]));
  const closed = new Set(data.doneTasks.map((t) => t.id));

  // company → project → task → points
  const tree = new Map<string, Map<string, Map<string, WorkPoint[]>>>();
  const add = (c: string, p: string, t: string, point?: WorkPoint) => {
    const projects = tree.get(c) ?? new Map();
    tree.set(c, projects);
    const tasks = projects.get(p) ?? new Map();
    projects.set(p, tasks);
    const list = tasks.get(t) ?? [];
    tasks.set(t, list);
    if (point) list.push(point);
  };

  for (const point of data.points) {
    const project = point.projectId
      ? projectById.get(point.projectId)
      : undefined;
    const companyId = project?.companyId ?? point.companyId ?? '';
    add(companyId, project?.id ?? '', point.taskId ?? '', point);
  }
  for (const task of data.doneTasks)
    add(task.companyId, task.projectId, task.id);

  const groups: CompanyGroup[] = Array.from(tree.entries()).map(
    ([companyId, projects]) => {
      const projectGroups: ProjectGroup[] = Array.from(projects.entries()).map(
        ([projectId, tasks]) => {
          const taskGroups: TaskGroup[] = Array.from(tasks.entries())
            .map(([taskId, points]) => ({
              task: taskId ? (taskById.get(taskId) ?? null) : null,
              points: points.sort((a, b) =>
                lastDay(b).localeCompare(lastDay(a)),
              ),
              closed: !!taskId && closed.has(taskId),
            }))
            // Work on a task that has since gone joins the project's other work.
            .reduce<TaskGroup[]>((out, g) => {
              const other = out.find((x) => !x.task);
              if (!g.task && other) other.points.push(...g.points);
              else out.push(g);
              return out;
            }, [])
            .sort((a, b) =>
              !a.task !== !b.task
                ? a.task
                  ? -1
                  : 1
                : b.points.length - a.points.length ||
                  Number(b.closed) - Number(a.closed),
            );
          const points = taskGroups.flatMap((g) => g.points);
          return {
            project: projectId ? (projectById.get(projectId) ?? null) : null,
            tasks: taskGroups,
            points: points.length,
            done: points.filter(isDone).length,
            closedTasks: taskGroups.filter((g) => g.closed).length,
          };
        },
      );
      projectGroups.sort((a, b) =>
        !a.project !== !b.project
          ? a.project
            ? -1
            : 1
          : b.points + b.closedTasks - (a.points + a.closedTasks),
      );
      return {
        company: companyId
          ? (data.companies.find((c) => c.id === companyId) ?? {
              id: companyId,
              name: 'Another company',
            })
          : null,
        projects: projectGroups,
        points: sum(projectGroups, (p) => p.points),
        done: sum(projectGroups, (p) => p.done),
        closedTasks: sum(projectGroups, (p) => p.closedTasks),
      };
    },
  );

  const rank = (g: CompanyGroup) =>
    !g.company ? 2 : g.company.id === PERSONAL_COMPANY_ID ? 1 : 0;
  return groups.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      b.points + b.closedTasks - (a.points + a.closedTasks),
  );
}

/** A fallback colour for projects and companies without one. */
export const FALLBACK_COLORS = [
  '#60a5fa',
  '#a78bfa',
  '#f472b6',
  '#34d399',
  '#fbbf24',
  '#22d3ee',
  '#fb923c',
];

export const colorFor = (id: string, color?: string | null) => {
  if (color) return color;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return FALLBACK_COLORS[Math.abs(h) % FALLBACK_COLORS.length];
};

/* --------------------------------- Timing --------------------------------- */

export type Timing = {
  start: number;
  /** When it finished, or its latest update while it is still going. */
  end: number;
  finished: boolean;
  /** Time spent waiting on the person (the assistant asked something). */
  waitingMs: number;
  blockedMs: number;
};

/** When a point ran, from its events; null when it has none. */
export function timingOf(p: WorkPoint, now = Date.now()): Timing | null {
  const events = p.events;
  if (!events.length) return null;
  const start = Date.parse(events[0].at);
  const finished = !!p.finishedAt;
  const last = Date.parse(events[events.length - 1].at);
  // A point still going today runs up to now; older ones end at their last update.
  const goingToday =
    !finished &&
    (p.status === 'doing' || p.status === 'waiting') &&
    dayjs(last).isSame(dayjs(now), 'day');
  const end = finished
    ? Date.parse(p.finishedAt as string)
    : goingToday
      ? now
      : last;
  let waitingMs = 0;
  let blockedMs = 0;
  events.forEach((e, i) => {
    const until = i + 1 < events.length ? Date.parse(events[i + 1].at) : end;
    const ms = Math.max(0, until - Date.parse(e.at));
    if (e.status === 'waiting') waitingMs += ms;
    if (e.status === 'blocked') blockedMs += ms;
  });
  return { start, end: Math.max(end, start), finished, waitingMs, blockedMs };
}

/** "2h 15m", "3d 4h", "12m", "<1m". */
export function formatMs(ms: number) {
  const mins = Math.round(ms / 60000);
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h${mins % 60 ? ` ${mins % 60}m` : ''}`;
  const days = Math.floor(hours / 24);
  return `${days}d${hours % 24 ? ` ${hours % 24}h` : ''}`;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export type ActorSummary = {
  points: number;
  done: number;
  /** Median time from start to done, for points that finished. */
  typicalMs: number | null;
  /** Time from start to done, added up over the points that finished. */
  totalMs: number;
  /** How many finished points have a start and an end. */
  timed: number;
  waitingMs: number;
  blockedMs: number;
};

/** Time to finish for all work, for hands-on work and for the bot's work. */
export function timingSummary(points: WorkPoint[]): {
  all: ActorSummary;
  hands: ActorSummary;
  bot: ActorSummary;
} {
  const of = (list: WorkPoint[]): ActorSummary => {
    const timings = list.map((p) => timingOf(p)).filter(Boolean) as Timing[];
    const finished = timings
      .filter((t) => t.finished)
      .map((t) => t.end - t.start);
    return {
      points: list.length,
      done: list.filter(isDone).length,
      typicalMs: median(finished),
      totalMs: finished.reduce((a, b) => a + b, 0),
      timed: finished.length,
      waitingMs: sum(timings, (t) => t.waitingMs),
      blockedMs: sum(timings, (t) => t.blockedMs),
    };
  };
  return {
    all: of(points),
    hands: of(points.filter((p) => !p.byClaude)),
    bot: of(points.filter((p) => p.byClaude)),
  };
}
