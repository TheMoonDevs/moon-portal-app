'use client';

import type { User } from '@db/client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast, Toaster } from 'sonner';

import { ThemeToggle } from '@/components/global/ThemeToggle';
import { cn } from '@/lib/utils';
import {
  daysBetween,
  type EffortKey,
  type GoalsCalendarData,
  monthGrid,
  rangeTotals,
} from '@/lib/workspace/goalCalendar';
import { labelCoreProjects } from '@/lib/workspace/projectLabel';
import {
  addDays,
  mondayOf,
  periodRange,
  toDay,
} from '@/lib/workspace/projects';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { EmptyState, Icon } from '../Admin/shared/AdminUI';
import { errorText } from '../Admin/Workspace/shared';
import { TipProvider } from '../Projects/Tip';
import { GoalDayPanel, PanelHead } from './GoalDayPanel';
import {
  editOf,
  type GoalEdit,
  GoalEditDialog,
  newEdit,
} from './GoalEditDialog';
import { GoalProjectPanel } from './GoalProjectPanel';
import { type Filters, GoalsFilters, NO_FILTERS } from './GoalsFilters';
import { GoalsMonth } from './GoalsMonth';
import { GoalsTimeline } from './GoalsTimeline';
import { GoalsWeek } from './GoalsWeek';
import {
  applyFilters,
  buildRows,
  doneOver,
  filtersFromParams,
  filtersToParams,
  type GoalRow,
  sortRows,
  workIndex,
} from './model';
import { Bar, card, EFFORTS, rateColor, Ring, STATE_META } from './ui';

type View = 'calendar' | 'week' | 'timeline';

/** What the sidebar shows. */
type Panel =
  | { kind: 'day'; day: string }
  | { kind: 'project'; projectId: string }
  | { kind: 'effort' }
  | null;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Months already loaded, so moving back and forth shows them at once.
const cache = new Map<string, GoalsCalendarData>();

const shiftMonth = (month: string, n: number) => {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};

const monthTitle = (month: string) =>
  new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** "2 – 8 Nov 2026", "27 Oct – 2 Nov 2026". */
const weekTitle = (monday: string) => {
  const sunday = addDays(monday, 6);
  const opts = { timeZone: 'UTC' } as const;
  const end = new Date(`${sunday}T12:00:00Z`).toLocaleDateString('en-GB', {
    ...opts,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const start = new Date(`${monday}T12:00:00Z`).toLocaleDateString('en-GB', {
    ...opts,
    day: 'numeric',
    ...(monday.slice(5, 7) !== sunday.slice(5, 7) && { month: 'short' }),
  });
  return `${start} – ${end}`;
};

/** The month a week belongs to: the one its Thursday is in. */
const monthOfWeek = (monday: string) => addDays(monday, 3).slice(0, 7);

/** A secondary number in the summary: big value, quiet label. */
const Metric = ({
  value,
  label,
  tone,
  title,
}: {
  value: string | number;
  label: string;
  tone?: string;
  title?: string;
}) => (
  <div title={title} className="flex shrink-0 flex-col justify-center gap-0.5">
    <span
      className={cn(
        'whitespace-nowrap text-lg font-semibold tabular-nums leading-tight tracking-tight text-neutral-100 auto-light:text-neutral-900',
        tone,
      )}
    >
      {value}
    </span>
    <span className="whitespace-nowrap text-[11px] text-neutral-500">
      {label}
    </span>
  </div>
);

const Divider = () => (
  <span className="hidden w-px shrink-0 self-stretch bg-white/[0.06] auto-light:bg-black/[0.07] md:block" />
);

/** How one effort level did over some days: days done out of days due. */
const effortRate = (rows: GoalRow[], days: string[], today: string) => {
  const t = rangeTotals(
    rows.flatMap((r) => days.map((d) => r.days.get(d)).filter((c) => !!c)),
    today,
  );
  return {
    totals: t,
    pct: t.daysOver ? Math.round((t.daysDone / t.daysOver) * 100) : null,
  };
};

/** Each effort level over the days shown, for the sidebar. */
const ByEffort = ({
  rows,
  days,
  today,
}: {
  rows: GoalRow[];
  days: string[];
  today: string;
}) => (
  <div className="flex flex-col gap-5 px-5 pb-6 pt-5">
    {EFFORTS.map((e) => {
      const mine = rows.filter((r) => r.effort === e.key);
      if (!mine.length) return null;
      const { totals: t, pct } = effortRate(mine, days, today);
      const projects = new Set(mine.map((r) => r.project.id)).size;
      return (
        <div key={e.key}>
          <div className="mb-1 flex items-center gap-2 text-xs">
            <Icon name={e.icon} className="text-[14px] text-neutral-400" />
            <span className="font-medium text-neutral-200 auto-light:text-neutral-800">
              {e.label}
            </span>
            <span className="text-neutral-500">
              {mine.length} goal{mine.length === 1 ? '' : 's'} · {projects}{' '}
              project{projects === 1 ? '' : 's'}
            </span>
            <span className="ml-auto tabular-nums text-neutral-400 auto-light:text-neutral-600">
              {pct == null ? '–' : `${pct}%`}
            </span>
          </div>
          <Bar
            percent={pct ?? 0}
            color={
              pct == null
                ? '#525252'
                : pct >= 80
                  ? '#34d399'
                  : pct >= 50
                    ? '#fcd34d'
                    : '#fb7185'
            }
          />
          <p className="mt-1 text-[11px] text-neutral-500">
            {t.daysOver
              ? `${t.daysDone} of ${t.daysOver} days due were done`
              : 'No days due yet'}
            {t.missed ? ` · ${t.missed} missed` : ''}
          </p>
        </div>
      );
    })}
  </div>
);

const Legend = () => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-neutral-500">
    {(Object.keys(STATE_META) as (keyof typeof STATE_META)[]).map((k) => (
      <span
        key={k}
        className="flex items-center gap-1.5"
        title={STATE_META[k].hint}
      >
        <span className={cn('size-2 rounded-full', STATE_META[k].dot)} />
        {STATE_META[k].label}
      </span>
    ))}
  </div>
);

/**
 * Every goal across the companies and projects the person can see, on a
 * calendar. A month grid shows each day's goals coloured by how they went;
 * the week lists each day's goals by company and project, with the tasks
 * each project finished; the timeline puts each goal on its own row of
 * days with its periods underneath. Filters narrow it by company, effort
 * level (the project's), project, status, kind, how often and who it is
 * for, and stay in the URL. On wide screens the page fits the screen, and
 * picking a day or a project opens it in a sidebar on the right.
 */
export const GoalsPage = () => {
  const { user } = useUser();
  const [month, setMonth] = useState(() => toDay().slice(0, 7));
  // The week is where people plan, so it is what opens.
  const [view, setView] = useState<View>('week');
  const [weekStart, setWeekStart] = useState(() => mondayOf(toDay()));
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [panel, setPanel] = useState<Panel>(null);
  const selected = panel?.kind === 'day' ? panel.day : null;
  const selectedProject = panel?.kind === 'project' ? panel.projectId : null;
  const openDay = (day: string) =>
    setPanel(day === selected ? null : { kind: 'day', day });
  const openProject = (projectId: string) =>
    setPanel(
      projectId === selectedProject ? null : { kind: 'project', projectId },
    );
  const closePanel = () => setPanel(null);
  useEffect(() => {
    // Escape closes the sidebar, unless a dialog over it took the key.
    const onKey = (e: KeyboardEvent) =>
      e.key === 'Escape' && !e.defaultPrevented && setPanel(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [data, setData] = useState<GoalsCalendarData | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  // Filters, month and view come from the URL, so a view can be shared.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters(filtersFromParams(params));
    const m = params.get('month');
    if (m && /^\d{4}-\d{2}$/.test(m)) setMonth(m);
    const v = params.get('view');
    if (v === 'timeline' || v === 'week' || v === 'calendar') setView(v);
    const w = params.get('week');
    if ((!v || v === 'week') && w && DAY.test(w)) {
      setWeekStart(mondayOf(w));
      setMonth(monthOfWeek(mondayOf(w)));
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const params = filtersToParams(filters, new URLSearchParams());
    if (view === 'week') {
      if (weekStart !== mondayOf(toDay())) params.set('week', weekStart);
    } else if (month !== toDay().slice(0, 7)) params.set('month', month);
    if (view !== 'week') params.set('view', view);
    const qs = params.toString();
    window.history.replaceState(
      null,
      '',
      qs ? `?${qs}` : window.location.pathname,
    );
  }, [filters, month, view, weekStart, ready]);

  const weeks = useMemo(() => monthGrid(month), [month]);
  const gridFrom = weeks[0][0];
  const gridTo = weeks[weeks.length - 1][6];
  const monthRange = useMemo(
    () => periodRange('month', `${month}-01`),
    [month],
  );
  const monthDays = useMemo(
    () => daysBetween(monthRange.from, monthRange.to),
    [monthRange],
  );
  const weekDays = useMemo(
    () => daysBetween(weekStart, addDays(weekStart, 6)),
    [weekStart],
  );

  const load = useCallback(() => {
    const key = `${gridFrom}:${gridTo}`;
    const hit = cache.get(key);
    setData(hit ?? null);
    setFailed(false);
    PortalSdk.getData(`/api/goals?from=${gridFrom}&to=${gridTo}`, null)
      .then((res) => {
        const next = res?.data as GoalsCalendarData | undefined;
        if (!next) throw new Error('empty');
        // A core project shows as its company: "ZONE", not "CORE".
        next.projects = labelCoreProjects(next.projects, next.companies);
        cache.set(key, next);
        setData(next);
      })
      .catch(() => setFailed(!hit));
  }, [gridFrom, gridTo]);
  /** After a change: what was kept is out of date, for every range. */
  const reload = () => {
    cache.clear();
    load();
  };
  useEffect(() => {
    if (ready) load();
  }, [load, ready]);

  const today = data?.today ?? toDay();
  const gridDays = useMemo(
    () => daysBetween(gridFrom, gridTo),
    [gridFrom, gridTo],
  );
  const rows = useMemo(
    () =>
      data
        ? sortRows(buildRows(data, gridDays, { from: gridFrom, to: gridTo }))
        : [],
    [data, gridDays, gridFrom, gridTo],
  );
  const shown = useMemo(() => applyFilters(rows, filters), [rows, filters]);
  const done = useMemo(() => workIndex(data), [data]);

  // Effort counts ignore the effort filter itself.
  const effortCounts = useMemo(() => {
    const base = applyFilters(rows, filters, 'efforts');
    const counts = { HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0 } as Record<
      EffortKey,
      number
    >;
    base.forEach((r) => (counts[r.effort] += 1));
    return counts;
  }, [rows, filters]);

  const companies = useMemo(
    () =>
      (data?.companies ?? []).filter((c) =>
        rows.some((r) => r.project.companyId === c.id),
      ),
    [data, rows],
  );
  const projectsWithGoals = useMemo(() => {
    const ids = new Set(rows.map((r) => r.project.id));
    return (data?.projects ?? []).filter(
      (p) =>
        ids.has(p.id) &&
        (!filters.companyId || p.companyId === filters.companyId),
    );
  }, [data, rows, filters.companyId]);
  const people = useMemo(
    () => new Map((data?.users ?? []).map((u) => [u.id, u])),
    [data],
  );
  // A goal being edited or added here, with the project page's editor.
  const [edit, setEdit] = useState<GoalEdit | null>(null);
  const openGoal = (row: GoalRow) =>
    row.project.canEdit
      ? setEdit(editOf(row.goal, row.project.name))
      : openProject(row.project.id);
  const newGoal = (projectId: string) => {
    const project = data?.projects.find((p) => p.id === projectId);
    if (project?.canEdit) setEdit(newEdit(project.id, project.name));
  };
  const addProgress = async (row: GoalRow, add: number) => {
    try {
      await PortalSdk.postData(
        `/api/projects/${row.project.id}/goals/progress`,
        {
          goalId: row.goal.id,
          add,
        },
      );
      toast.success(
        `Added ${add.toLocaleString('en-US')} to ${row.goal.title}`,
      );
      reload();
    } catch (err) {
      toast.error(errorText(err));
    }
  };
  // Who a goal can be for: its project's team first, then everyone else seen.
  const editUsers = useMemo(() => {
    if (!edit) return [];
    const project = data?.projects.find((p) => p.id === edit.projectId);
    const team = new Set([
      ...(project?.leadIds ?? []),
      ...(project?.memberIds ?? []),
    ]);
    const all = data?.users ?? [];
    return [
      ...all.filter((u) => team.has(u.id)),
      ...all.filter((u) => !team.has(u.id)),
    ] as unknown as User[];
  }, [edit, data]);
  const goalPeople = useMemo(() => {
    const ids = new Set(rows.flatMap((r) => r.people));
    return (data?.users ?? [])
      .filter((u) => ids.has(u.id))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }, [data, rows]);

  const isWeek = view === 'week';
  // The days the stats and sidebar speak of: the week, else the month.
  const rangeDays = isWeek ? weekDays : monthDays;
  const rangeWord = isWeek ? 'this week' : 'this month';
  const stats = useMemo(() => {
    const count = (s: string) => shown.filter((r) => r.status === s).length;
    const repeating = shown.filter((r) => r.goal.kind !== 'target');
    const t = rangeTotals(
      shown.flatMap((r) =>
        rangeDays.map((d) => r.days.get(d)).filter((c) => !!c),
      ),
      today,
    );
    const first = rangeDays[0];
    const last = rangeDays[rangeDays.length - 1];
    const periodsOver = repeating.flatMap((r) =>
      r.periods.filter((p) => p.met !== null && p.to >= first && p.to <= last),
    );
    const projectIds = Array.from(new Set(shown.map((r) => r.project.id)));
    const finished = projectIds.reduce(
      (n, id) => n + doneOver(done, id, rangeDays),
      0,
    );
    const effort = EFFORTS.map((e) => {
      const mine = shown.filter((r) => r.effort === e.key);
      return {
        key: e.key,
        label: e.label,
        count: mine.length,
        pct: effortRate(mine, rangeDays, today).pct,
      };
    }).filter((e) => e.count && e.key !== 'NONE');
    return {
      total: shown.length,
      repeating: repeating.length,
      targets: shown.length - repeating.length,
      met: count('met'),
      onTrack: count('on_track'),
      behind: count('behind'),
      reached: count('reached'),
      climbing: count('climbing'),
      rate: t.daysOver ? Math.round((t.daysDone / t.daysOver) * 100) : null,
      totals: t,
      periodsMet: periodsOver.filter((p) => p.met).length,
      periodsOver: periodsOver.length,
      finished,
      projects: projectIds.length,
      effort,
    };
  }, [shown, rangeDays, today, done]);

  const isThisMonth = month === today.slice(0, 7);
  const isThisWeek = weekStart === mondayOf(today);
  // A day left behind closes; a project stays open as the days move.
  const dropDay = () => setPanel((p) => (p?.kind === 'day' ? null : p));
  const goTo = (m: string) => {
    setMonth(m);
    dropDay();
  };
  /** Shows the week from `monday`; its month's data covers it. */
  const goToWeek = (monday: string) => {
    setWeekStart(monday);
    setMonth(monthOfWeek(monday));
    dropDay();
  };
  const changeView = (next: View) => {
    if (next === 'week' && view !== 'week') {
      // The week of the day picked, else this week, else the month's first.
      const monday = selected
        ? mondayOf(selected)
        : isThisMonth
          ? mondayOf(today)
          : mondayOf(addDays(`${month}-01`, 3));
      setWeekStart(monday);
      setMonth(monthOfWeek(monday));
    }
    setView(next);
  };
  const step = (n: number) =>
    isWeek ? goToWeek(addDays(weekStart, 7 * n)) : goTo(shiftMonth(month, n));

  const rangeTitle = isWeek ? weekTitle(weekStart) : monthTitle(month);
  const panelBody =
    panel?.kind === 'day' ? (
      <GoalDayPanel
        day={panel.day}
        rows={shown}
        done={done}
        today={today}
        people={people}
        onClose={closePanel}
        onOpenProject={openProject}
        onEditGoal={openGoal}
      />
    ) : panel?.kind === 'project' ? (
      <GoalProjectPanel
        projectId={panel.projectId}
        rows={rows}
        days={rangeDays}
        rangeLabel={rangeTitle}
        done={done}
        today={today}
        onClose={closePanel}
        onOpenDay={openDay}
        onEditGoal={openGoal}
        onNewGoal={() => newGoal(panel.projectId)}
        onAddProgress={addProgress}
      />
    ) : panel?.kind === 'effort' ? (
      <>
        <PanelHead
          kicker={rangeTitle}
          title="By effort"
          sub="Days due that were done, by the effort level of their project."
          onClose={closePanel}
        />
        <ByEffort rows={shown} days={rangeDays} today={today} />
      </>
    ) : null;

  return (
    <TipProvider delayDuration={120}>
      <div className="auto-theme flex min-h-dvh flex-col bg-neutral-950 pb-28 text-neutral-100 auto-light:bg-neutral-50 auto-light:text-neutral-900 md:h-dvh md:min-h-0 md:overflow-hidden md:pb-0">
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 px-4 pt-6 md:min-h-0 md:flex-1 md:gap-4 md:px-8 md:pb-5 md:pt-6">
          {/* The period shown, how to move through it, and the view */}
          <div className="flex shrink-0 flex-wrap items-end gap-x-4 gap-y-3">
            <div className="mr-auto flex flex-col gap-1">
              <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
                Goals
                <ThemeToggle />
              </span>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-white auto-light:text-neutral-950 md:text-[28px]">
                  {rangeTitle}
                </h1>
                <div className="flex items-center">
                  <button
                    type="button"
                    aria-label={isWeek ? 'Previous week' : 'Previous month'}
                    onClick={() => step(-1)}
                    className="flex size-8 items-center justify-center rounded-full text-neutral-400 hover:bg-white/[0.06] hover:text-white auto-light:text-neutral-500 auto-light:hover:bg-black/[0.05] auto-light:hover:text-neutral-950"
                  >
                    <Icon name="chevron_left" className="text-[20px]" />
                  </button>
                  <button
                    type="button"
                    aria-label={isWeek ? 'Next week' : 'Next month'}
                    onClick={() => step(1)}
                    className="flex size-8 items-center justify-center rounded-full text-neutral-400 hover:bg-white/[0.06] hover:text-white auto-light:text-neutral-500 auto-light:hover:bg-black/[0.05] auto-light:hover:text-neutral-950"
                  >
                    <Icon name="chevron_right" className="text-[20px]" />
                  </button>
                </div>
                {(isWeek ? !isThisWeek : !isThisMonth) && (
                  <button
                    type="button"
                    onClick={() =>
                      isWeek
                        ? goToWeek(mondayOf(today))
                        : goTo(today.slice(0, 7))
                    }
                    className="h-7 rounded-full px-3 text-xs font-medium text-neutral-300 ring-1 ring-inset ring-white/10 hover:bg-white/[0.06] auto-light:text-neutral-700 auto-light:ring-black/10 auto-light:hover:bg-black/[0.04]"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>
            <div className="flex h-9 items-center gap-0.5 rounded-full bg-white/[0.04] p-1 ring-1 ring-inset ring-white/[0.06] auto-light:bg-black/[0.035] auto-light:ring-black/[0.05]">
              {(
                [
                  {
                    key: 'calendar',
                    label: 'Month',
                    icon: 'calendar_month',
                  },
                  { key: 'week', label: 'Week', icon: 'view_week' },
                  { key: 'timeline', label: 'Timeline', icon: 'view_timeline' },
                ] as const
              ).map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => changeView(v.key)}
                  aria-pressed={view === v.key}
                  className={cn(
                    'flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors',
                    view === v.key
                      ? 'bg-white text-neutral-950 shadow-sm auto-light:bg-neutral-900 auto-light:text-white'
                      : 'text-neutral-400 hover:text-white auto-light:text-neutral-600 auto-light:hover:text-neutral-950',
                  )}
                >
                  <Icon name={v.icon} className="text-[16px]" />
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {data && (
            <div className="shrink-0">
              <GoalsFilters
                filters={filters}
                onChange={setFilters}
                companies={companies}
                projects={projectsWithGoals}
                people={goalPeople}
                meId={user?.id}
                counts={effortCounts}
              />
            </div>
          )}

          {/* Where things stand over the days shown: one number leads. */}
          {data && rows.length > 0 && (
            <div
              className={cn(
                card,
                'flex shrink-0 flex-wrap items-stretch gap-x-6 gap-y-4 px-5 py-4 md:flex-nowrap md:overflow-x-auto',
              )}
            >
              <div className="flex w-full shrink-0 items-center gap-3.5 md:w-auto">
                <Ring
                  percent={stats.rate}
                  size={48}
                  stroke={5}
                  color={rateColor(stats.rate)}
                />
                <div className="flex flex-col">
                  <span className="flex items-baseline gap-2">
                    <span className="text-[30px] font-semibold tabular-nums leading-none tracking-tight text-white auto-light:text-neutral-950">
                      {stats.rate == null ? '–' : `${stats.rate}%`}
                    </span>
                    <span className="text-sm text-neutral-300 auto-light:text-neutral-700">
                      of goal days done {rangeWord}
                    </span>
                  </span>
                  <span className="mt-1 text-xs text-neutral-500">
                    {stats.totals.daysOver
                      ? `${stats.totals.daysDone} of ${stats.totals.daysOver} days due`
                      : 'Nothing due yet'}
                    {stats.totals.missed > 0 && (
                      <span className="text-rose-300 auto-light:text-rose-600">
                        {' '}
                        · {stats.totals.missed} missed
                      </span>
                    )}
                    {stats.totals.open > 0 && ` · ${stats.totals.open} to come`}
                  </span>
                </div>
              </div>
              <Divider />
              <Metric
                value={`${stats.met + stats.onTrack}/${stats.repeating}`}
                label="on track this period"
                title={`${stats.met} met · ${stats.onTrack} on track · ${stats.behind} behind`}
                tone={
                  stats.behind
                    ? undefined
                    : 'text-emerald-300 auto-light:text-emerald-700'
                }
              />
              <Metric
                value={stats.finished}
                label={`tasks done · ${stats.projects} projects`}
              />
              <Metric
                value={
                  stats.periodsOver
                    ? `${stats.periodsMet}/${stats.periodsOver}`
                    : '–'
                }
                label="periods met"
              />
              {stats.targets > 0 && (
                <Metric
                  value={`${stats.reached}/${stats.targets}`}
                  label="targets reached"
                />
              )}
              {stats.effort.length > 0 && (
                <>
                  <Divider />
                  <button
                    type="button"
                    onClick={() =>
                      setPanel((p) =>
                        p?.kind === 'effort' ? null : { kind: 'effort' },
                      )
                    }
                    aria-pressed={panel?.kind === 'effort'}
                    className={cn(
                      '-mx-3 -my-2 flex shrink-0 flex-col justify-center gap-1.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/[0.04] auto-light:hover:bg-black/[0.03] md:mx-0 md:ml-auto',
                      panel?.kind === 'effort' &&
                        'bg-white/[0.05] auto-light:bg-black/[0.04]',
                    )}
                  >
                    <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-500">
                      By effort
                      <Icon name="chevron_right" className="text-[14px]" />
                    </span>
                    {stats.effort.map((e) => (
                      <span
                        key={e.key}
                        className="flex items-center gap-2 text-[11px] tabular-nums text-neutral-400 auto-light:text-neutral-600"
                      >
                        <span className="w-12">{e.label}</span>
                        <Bar
                          percent={e.pct ?? 0}
                          color={rateColor(e.pct)}
                          className="h-1 w-20"
                        />
                        <span className="w-8 text-right">
                          {e.pct == null ? '–' : `${e.pct}%`}
                        </span>
                      </span>
                    ))}
                  </button>
                </>
              )}
            </div>
          )}

          {!data && !failed ? (
            <div
              className={cn(
                card,
                'h-[520px] animate-pulse md:h-auto md:flex-1',
              )}
            />
          ) : failed ? (
            <EmptyState
              icon="cloud_off"
              title="Couldn't load goals"
              description="Refresh the page to try again."
            />
          ) : !rows.length ? (
            <EmptyState
              icon="flag"
              title="No goals yet"
              description="Set goals on a project's Goals tab and they show up here, day by day. Your own, like gym, exercise or reading, go in Personal, where only you see them."
            />
          ) : (
            <div className="flex gap-4 md:min-h-0 md:flex-1">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="md:min-h-0 md:flex-1">
                  {!shown.length ? (
                    <div className={cn(card, 'md:h-full')}>
                      <EmptyState
                        icon="filter_alt_off"
                        title="No goals match these filters"
                        description="Clear a filter or two to see more."
                      />
                    </div>
                  ) : view === 'week' ? (
                    <GoalsWeek
                      days={weekDays}
                      rows={shown}
                      work={done}
                      today={today}
                      people={people}
                      selectedDay={selected}
                      selectedProject={selectedProject}
                      onSelectDay={openDay}
                      onSelectProject={openProject}
                      onGoal={openGoal}
                    />
                  ) : view === 'calendar' ? (
                    <GoalsMonth
                      weeks={weeks}
                      month={month}
                      rows={shown}
                      done={done}
                      today={today}
                      selected={selected}
                      onSelect={openDay}
                    />
                  ) : (
                    <GoalsTimeline
                      rows={shown}
                      days={monthDays}
                      done={done}
                      today={today}
                      selected={selected}
                      selectedProject={selectedProject}
                      onSelect={openDay}
                      onSelectProject={openProject}
                    />
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                  <Legend />
                  {!panel && (
                    <p className="hidden text-[11px] text-neutral-500 md:block">
                      Click a day or a project to open it here.
                    </p>
                  )}
                </div>
              </div>

              {panelBody && (
                <aside
                  className={cn(
                    // A sheet over the page on phones, a column on wide screens.
                    'custom-scrollbar fixed inset-0 z-30 overflow-y-auto bg-neutral-950 auto-light:bg-white',
                    'md:static md:z-auto md:w-[320px] md:shrink-0 md:rounded-2xl md:border md:border-white/[0.07] md:bg-white/[0.02] md:auto-light:border-black/[0.08] md:auto-light:bg-white xl:w-[340px] 2xl:w-[400px]',
                  )}
                >
                  {panelBody}
                </aside>
              )}
            </div>
          )}
        </div>
      </div>
      {edit && (
        <GoalEditDialog
          key={`${edit.projectId}:${edit.draft.id ?? 'new'}`}
          edit={edit}
          users={editUsers}
          onClose={() => setEdit(null)}
          onSaved={reload}
        />
      )}
      <Toaster theme="dark" position="bottom-right" richColors />
    </TipProvider>
  );
};
