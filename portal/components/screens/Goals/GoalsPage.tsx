'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { ThemeToggle } from '@/components/global/ThemeToggle';
import { cn } from '@/lib/utils';
import {
  daysBetween,
  type EffortKey,
  type GoalsCalendarData,
  monthGrid,
  rangeTotals,
} from '@/lib/workspace/goalCalendar';
import {
  addDays,
  mondayOf,
  periodRange,
  toDay,
} from '@/lib/workspace/projects';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { EmptyState, Icon } from '../Admin/shared/AdminUI';
import { TipProvider } from '../Projects/Tip';
import { GoalDayPanel, PanelHead } from './GoalDayPanel';
import { GoalProjectPanel } from './GoalProjectPanel';
import { type Filters, GoalsFilters, NO_FILTERS } from './GoalsFilters';
import { GoalsMonth } from './GoalsMonth';
import { GoalsTimeline } from './GoalsTimeline';
import { GoalsWeek } from './GoalsWeek';
import {
  applyFilters,
  buildRows,
  doneCounts,
  filtersFromParams,
  filtersToParams,
  type GoalRow,
  sortRows,
} from './model';
import { Bar, card, EFFORTS, STATE_META } from './ui';

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

const Stat = ({
  label,
  value,
  sub,
  tone,
  onClick,
  active,
  wide,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: string;
  onClick?: () => void;
  active?: boolean;
  wide?: boolean;
}) => {
  const body = (
    <>
      <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
        {label}
        {onClick && (
          <Icon name="chevron_right" className="ml-auto text-[14px]" />
        )}
      </p>
      <p
        className={cn(
          'whitespace-nowrap text-xl font-semibold tabular-nums tracking-tight text-white auto-light:text-neutral-950',
          tone,
        )}
      >
        {value}
      </p>
      {sub && <p className="truncate text-[11px] text-neutral-500">{sub}</p>}
    </>
  );
  const cls = cn(
    card,
    'min-w-[128px] flex-1 px-3.5 py-2 text-left',
    wide && 'min-w-[180px] flex-[1.5]',
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        cls,
        'transition-colors hover:bg-white/[0.05] auto-light:hover:bg-black/[0.02]',
        active && 'border-white/25 auto-light:border-black/25',
      )}
    >
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
};

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
  <div className="flex flex-col gap-4 p-4">
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
  const [view, setView] = useState<View>('calendar');
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
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(null);
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
    if (v === 'timeline' || v === 'week') setView(v);
    const w = params.get('week');
    if (v === 'week' && w && DAY.test(w)) {
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
    if (view !== 'calendar') params.set('view', view);
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
        cache.set(key, next);
        setData(next);
      })
      .catch(() => setFailed(!hit));
  }, [gridFrom, gridTo]);
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
  const done = useMemo(() => doneCounts(data), [data]);

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
      (n, id) =>
        n + rangeDays.reduce((m, d) => m + (done.get(`${id}|${d}`) ?? 0), 0),
      0,
    );
    const effort = EFFORTS.map((e) => {
      const mine = shown.filter((r) => r.effort === e.key);
      return {
        key: e.key,
        short: e.label[0],
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
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-3 px-4 pt-6 md:min-h-0 md:flex-1 md:px-6 md:pb-4 md:pt-5">
          {/* Title, month and view */}
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <h1 className="mr-auto flex items-center gap-2 text-2xl font-bold tracking-tight text-white auto-light:text-neutral-950 md:text-[26px]">
              Goals
              <ThemeToggle />
            </h1>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={isWeek ? 'Previous week' : 'Previous month'}
                onClick={() => step(-1)}
                className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white auto-light:text-neutral-500 auto-light:hover:bg-black/[0.05] auto-light:hover:text-neutral-950"
              >
                <Icon name="chevron_left" className="text-[20px]" />
              </button>
              <p className="min-w-[150px] text-center text-sm font-semibold text-white auto-light:text-neutral-950">
                {rangeTitle}
              </p>
              <button
                type="button"
                aria-label={isWeek ? 'Next week' : 'Next month'}
                onClick={() => step(1)}
                className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white auto-light:text-neutral-500 auto-light:hover:bg-black/[0.05] auto-light:hover:text-neutral-950"
              >
                <Icon name="chevron_right" className="text-[20px]" />
              </button>
              {(isWeek ? !isThisWeek : !isThisMonth) && (
                <button
                  type="button"
                  onClick={() =>
                    isWeek ? goToWeek(mondayOf(today)) : goTo(today.slice(0, 7))
                  }
                  className="ml-1 h-8 rounded-lg px-2.5 text-xs font-medium text-neutral-300 ring-1 ring-inset ring-white/10 hover:bg-white/[0.06] auto-light:text-neutral-700 auto-light:ring-black/10 auto-light:hover:bg-black/[0.04]"
                >
                  Today
                </button>
              )}
            </div>
            <div className="flex rounded-xl bg-white/[0.04] p-0.5 auto-light:bg-black/[0.05]">
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
                    'flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-xs font-medium transition-colors',
                    view === v.key
                      ? 'bg-white text-neutral-950 shadow auto-light:bg-white auto-light:text-neutral-950'
                      : 'text-neutral-400 hover:text-white auto-light:text-neutral-500 auto-light:hover:text-neutral-950',
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

          {/* Where things stand, over the days shown */}
          {data && rows.length > 0 && (
            <div className="no-scrollbar -mx-4 flex shrink-0 gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
              <Stat
                label="Goals"
                value={stats.total}
                sub={`${stats.repeating} repeating · ${stats.targets} target`}
              />
              <Stat
                label="This period"
                wide
                value={`${stats.met + stats.onTrack}/${stats.repeating}`}
                sub={`${stats.met} met · ${stats.onTrack} on track · ${stats.behind} behind`}
                tone={
                  stats.behind
                    ? undefined
                    : 'text-emerald-300 auto-light:text-emerald-700'
                }
              />
              <Stat
                label="Days done"
                value={stats.rate == null ? '–' : `${stats.rate}%`}
                sub={
                  stats.totals.daysOver
                    ? `${stats.totals.daysDone} of ${stats.totals.daysOver} days due`
                    : 'nothing due yet'
                }
              />
              <Stat
                label="Missed"
                value={stats.totals.missed}
                sub={`days${stats.totals.open ? ` · ${stats.totals.open} to come` : ` ${rangeWord}`}`}
                tone={
                  stats.totals.missed
                    ? 'text-rose-300 auto-light:text-rose-600'
                    : undefined
                }
              />
              <Stat
                label="Tasks done"
                value={stats.finished}
                sub={`${rangeWord} · ${stats.projects} project${stats.projects === 1 ? '' : 's'}`}
                tone={
                  stats.finished
                    ? 'text-emerald-300 auto-light:text-emerald-700'
                    : undefined
                }
              />
              <Stat
                label="Periods met"
                value={
                  stats.periodsOver
                    ? `${stats.periodsMet}/${stats.periodsOver}`
                    : '–'
                }
                sub={`ended ${rangeWord}`}
              />
              {stats.targets > 0 && (
                <Stat
                  label="Targets"
                  value={`${stats.reached}/${stats.targets}`}
                  sub={`reached · ${stats.climbing} climbing`}
                />
              )}
              {stats.effort.length > 0 && (
                <Stat
                  label="By effort"
                  value={stats.effort
                    .map(
                      (e) => `${e.short} ${e.pct == null ? '–' : `${e.pct}%`}`,
                    )
                    .join(' · ')}
                  sub="of days due, by level"
                  tone="text-base md:text-[15px] leading-7"
                  onClick={() =>
                    setPanel((p) =>
                      p?.kind === 'effort' ? null : { kind: 'effort' },
                    )
                  }
                  active={panel?.kind === 'effort'}
                />
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
              description="Set goals on a project's Goals tab and they show up here, day by day."
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
                      done={done}
                      today={today}
                      selectedDay={selected}
                      selectedProject={selectedProject}
                      onSelectDay={openDay}
                      onSelectProject={openProject}
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
                    'md:static md:z-auto md:w-[340px] md:shrink-0 md:rounded-2xl md:border md:border-white/[0.07] md:bg-white/[0.02] md:auto-light:border-black/[0.08] md:auto-light:bg-white 2xl:w-[400px]',
                  )}
                >
                  {panelBody}
                </aside>
              )}
            </div>
          )}
        </div>
      </div>
    </TipProvider>
  );
};
