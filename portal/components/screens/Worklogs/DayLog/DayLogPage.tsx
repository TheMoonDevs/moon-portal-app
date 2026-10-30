'use client';

import { useMediaQuery } from '@mui/material';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Toaster } from 'sonner';

import { ThemeToggle } from '@/components/global/ThemeToggle';
import type { DayLine } from '@/lib/daywork/server';
import { cn } from '@/lib/utils';
import media from '@/styles/media';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import {
  setIncompleteTodos,
  setTodoMarkdown,
} from '@/utils/redux/worklogs/laterTodos.slice';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { Icon, Spin } from '../../Admin/shared/AdminUI';
import TodoTab from '../WorklogTabs/TodoTab';
import WorklogBuff from '../WorklogTabs/WorklogBuff';
import { DatePopover } from './DatePopover';
import { DayList } from './DayList';
import { DaySummary } from './DaySummary';
import { Picker } from './Picker';
import { companyKeyOf, countPlaces, ProjectSummary } from './ProjectSummary';
import {
  movedOn,
  placeInputOf,
  PlaceLogo,
  placeOf,
  placeOfKey,
  placeOptions,
  rowStatus,
} from './sheetParts';
import type { SheetGroup } from './TaskSheet';
import { TaskSheet } from './TaskSheet';
import type { DayTask } from './useDay';
import { useDay } from './useDay';
import { WorklogTips } from './WorklogTips';
import { upcomingOf, useYourTasks, YourTasks } from './YourTasks';

/*
 * The worklog page. The days of a month on the left (as cards or a
 * calendar), the open day in the middle as one sheet of tasks, and the
 * month's badge with the person's tasks, their later list and tips on the
 * right. On a phone the days come first and a day opens on its own page.
 * It follows the device's light or dark setting.
 */

const fmt = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');

const SHOW_POINTS_KEY = 'worklogs.points';
const VIEW_KEY = 'worklogs.view';

/**
 * How the day's sheet is laid out: the person's own tasks as written (with
 * Claude's apart), everything by what is left, by project, or a summary to
 * read.
 */
type View = 'default' | 'priority' | 'projects' | 'summary';
const VIEWS: { value: View; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'priority', label: 'Priority' },
  { value: 'projects', label: 'Projects' },
  { value: 'summary', label: 'Summary' },
];

/** Days from a week back to two weeks ahead can be written in. */
const editableDay = (date: string) => {
  const diff = dayjs(date).diff(dayjs().startOf('day'), 'day');
  return diff >= -7 && diff <= 14;
};

const dayHeading = (date: string) => {
  const d = dayjs(date);
  const diff = d.diff(dayjs().startOf('day'), 'day');
  const name =
    diff === 0
      ? 'Today'
      : diff === 1
        ? 'Tomorrow'
        : diff === -1
          ? 'Yesterday'
          : d.format('dddd');
  return { name, date: d.format('dddd, D MMMM YYYY') };
};

/** The end of today: write tomorrow down while it is still today. */
const PlanTomorrow = ({
  count,
  onOpen,
}: {
  count: number;
  onOpen: () => void;
}) => {
  const evening = dayjs().hour() >= 16;
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border p-4',
        count === 0 && evening
          ? 'border-sky-400/30 bg-sky-500/[0.08]'
          : 'border-white/[0.07] bg-white/[0.02] auto-light:border-black/10 auto-light:bg-white',
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-[20px] text-sky-300 auto-light:text-sky-700">
        <Icon name="event_upcoming" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white auto-light:text-neutral-950">
          {count === 0
            ? 'Plan tomorrow before you finish'
            : `${count} task${count === 1 ? '' : 's'} planned for tomorrow`}
        </p>
        <p className="text-xs text-neutral-500">
          Tasks written down before the day starts count as planned. What comes
          up during the day counts as unexpected.
        </p>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-200 auto-light:bg-neutral-900 auto-light:text-white auto-light:hover:bg-neutral-700"
      >
        {count === 0 ? 'Plan tomorrow' : 'Open tomorrow'}
      </button>
    </div>
  );
};

type SideTab = 'tasks' | 'todo' | 'tips';

export const DayLogPage = ({
  initialDate,
  layout = 'full',
}: {
  initialDate?: string | null;
  /** `day` is one day on its own page, as a phone opens it. */
  layout?: 'full' | 'day';
}) => {
  const router = useRouter();
  const { user } = useUser();
  const wide = useMediaQuery(media.moreTablet);
  const [date, setDate] = useState(() =>
    initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
      ? initialDate
      : fmt(dayjs()),
  );
  const [month, setMonth] = useState(() => dayjs(date).startOf('month'));
  const day = useDay(date);
  const yourTasks = useYourTasks(day.version);
  const [sideTab, setSideTab] = useState<SideTab>('tasks');
  const [filter, setFilter] = useState<string | null>(null);
  useEffect(() => setFilter(null), [date]);
  // Work points under tasks show unless the person turned them off.
  const [showPoints, setShowPoints] = useState(true);
  useEffect(() => {
    try {
      setShowPoints(localStorage.getItem(SHOW_POINTS_KEY) !== '0');
    } catch {
      // Storage can be blocked; the choice then lasts for this visit.
    }
  }, []);
  const toggleShowPoints = (show: boolean) => {
    setShowPoints(show);
    try {
      localStorage.setItem(SHOW_POINTS_KEY, show ? '1' : '0');
    } catch {
      // Storage can be blocked; the choice then lasts for this visit.
    }
  };
  const [view, setView] = useState<View>('default');
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY) as View | null;
      if (saved && VIEWS.some((v) => v.value === saved)) setView(saved);
    } catch {
      // Storage can be blocked; the choice then lasts for this visit.
    }
  }, []);
  const pickView = (next: View) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Storage can be blocked; the choice then lasts for this visit.
    }
  };
  // Projects picked in the Projects view to add a task in.
  const [extraPlaces, setExtraPlaces] = useState<string[]>([]);
  const [days, setDays] = useState<Record<string, DayLine[]> | null>(null);
  const dispatch = useAppDispatch();
  const incompleteTodos = useAppSelector(
    (state) => state.laterTodos.incompleteTodos,
  );

  // The later list, loaded up front so its tab opens with it (and its dot
  // shows what is left).
  useEffect(() => {
    if (!user?.id) return;
    PortalSdk.getData(`/api/user/todolater?userId=${user.id}`, null)
      .then((res) => {
        const content: string = res?.data?.markdown?.content || '';
        dispatch(setTodoMarkdown(content));
        const blank = !content.trim() || content.trim() === '*';
        const total = (content.match(/\n/g) || []).length + 1;
        const completed = (content.match(/✅/g) || []).length;
        dispatch(setIncompleteTodos(blank ? 0 : total - completed));
      })
      .catch(() => undefined);
  }, [user?.id, dispatch]);

  const pick = useCallback(
    (next: string) => {
      setDate(next);
      setMonth(dayjs(next).startOf('month'));
      router.replace(
        layout === 'day'
          ? `${APP_ROUTES.userWorklogs}/new?logType=dayLog&date=${next}`
          : `${APP_ROUTES.userWorklogs}?date=${next}`,
        { scroll: false },
      );
    },
    [router, layout],
  );

  // The month's days on the left (and tomorrow, for its plan), from the
  // tasks; read again a little after a change.
  useEffect(() => {
    if (!user?.id) return;
    const from = fmt(month.startOf('month'));
    const end = fmt(month.endOf('month'));
    const next = fmt(dayjs().add(1, 'day'));
    const to =
      next > end && dayjs(next).diff(month.startOf('month'), 'day') < 62
        ? next
        : end;
    const timer = setTimeout(
      () =>
        PortalSdk.getData(`/api/me/days?from=${from}&to=${to}`, null)
          .then((res) => setDays(res?.data?.days ?? {}))
          .catch(() => setDays((d) => d ?? {})),
      day.version ? 1000 : 0,
    );
    return () => clearTimeout(timer);
  }, [user?.id, day.version, month]);

  // The open day as it is being written.
  const liveLines = useMemo(
    () =>
      day.loading
        ? null
        : day.tasks
            .filter((t) => t.title.trim())
            .map((t) => {
              const status = rowStatus(t, day.points, date);
              return {
                text: t.title,
                status: status === 'archived' ? null : status,
              };
            }),
    [day.tasks, day.points, day.loading, date],
  );

  const counts = useMemo(() => countPlaces(day, day.tasks), [day]);
  const shown = useMemo(
    () =>
      filter
        ? day.tasks.filter((t) => {
            const place = placeOf(t, day.projects, day.companies);
            return place.key === filter || companyKeyOf(place) === filter;
          })
        : day.tasks,
    [day.tasks, day.projects, day.companies, filter],
  );

  const today = fmt(dayjs());
  const tomorrow = fmt(dayjs().add(1, 'day'));
  const tomorrowCount = days?.[tomorrow]?.length ?? 0;
  const heading = dayHeading(date);
  const editable = editableDay(date);
  const ahead = date > today;
  const showDays = layout === 'full';
  // On a phone the full page is the list of days; a day opens on its own.
  const showDay = layout === 'day' || wide;

  // The sheet's parts for the view picked in the header.
  const shutOf = (t: DayTask) => {
    const status = rowStatus(t, day.points, date);
    return (
      status === 'done' || status === 'archived' || movedOn(t, date, day.today)
    );
  };
  const fromBefore = (t: DayTask) =>
    !t.draft && !!t.forDate && t.forDate < date;
  const byClaude = (t: DayTask) => !!t.madeBy && t.madeBy !== 'person';
  const dayName = date === today ? 'Today' : heading.name;
  const beforeName = date === today ? 'Pending from before' : 'From before';
  const addHere = { place: null };

  const dayGroups = (
    tasks: DayTask[],
    key: string,
    add: SheetGroup['add'],
    alwaysTitled = false,
  ): SheetGroup[] => {
    const before = tasks.filter(fromBefore);
    const titled = alwaysTitled || before.length > 0;
    return [
      {
        key: `${key}-day`,
        title: titled ? dayName : undefined,
        tasks: tasks.filter((t) => !fromBefore(t)),
        add,
      },
      ...(before.length
        ? [{ key: `${key}-before`, title: beforeName, tasks: before }]
        : []),
    ].filter((g) => g.tasks.length || g.add);
  };

  const mine = shown.filter((t) => !byClaude(t));
  const claudes = shown.filter(byClaude);
  const defaultGroups = dayGroups(mine, 'mine', addHere);
  const claudeGroups = dayGroups(claudes, 'claude', null, true);

  const priorityGroups = (() => {
    const open = shown.filter((t) => !shutOf(t));
    const shut = shown.filter(shutOf);
    const groups = dayGroups(open, 'open', addHere);
    if (shut.length)
      groups.push({
        key: 'finished',
        title: 'Finished',
        tasks: shut,
        quiet: true,
      });
    if (groups.length > 1 && !groups[0].title) groups[0].title = dayName;
    return groups;
  })();

  const projectGroups = (() => {
    const keys = [
      ...counts.map((c) => c.place.key),
      ...shown.map((t) => placeOf(t, day.projects, day.companies).key),
      ...extraPlaces,
    ].filter((k, i, all) => all.indexOf(k) === i);
    return keys
      .map((key): SheetGroup | null => {
        const place = placeOfKey(key, day.projects, day.companies);
        const tasks = shown.filter(
          (t) => placeOf(t, day.projects, day.companies).key === key,
        );
        if (!tasks.length && !extraPlaces.includes(key)) return null;
        if (filter && key !== filter && companyKeyOf(place) !== filter)
          return null;
        return {
          key,
          title: (
            <>
              <PlaceLogo place={place} className="size-3.5" />
              <span className="truncate normal-case tracking-normal text-neutral-400 auto-light:text-neutral-600">
                {place.name}
              </span>
            </>
          ),
          tasks,
          add: {
            place: placeInputOf(place),
            placeholder: `Add a task in ${place.name}`,
          },
        };
      })
      .filter((g): g is SheetGroup => !!g);
  })();

  const placeChoices = placeOptions(day.projects, day.companies).filter(
    (o) => !projectGroups.some((g) => g.key === o.id),
  );

  const sheetView = (
    <div className="min-w-0">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-white auto-light:text-neutral-950">
            {heading.name}
          </h1>
          <p className="mt-0.5 text-sm text-neutral-500">{heading.date}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {date !== today && (
            <button
              type="button"
              onClick={() => pick(today)}
              className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-neutral-300 hover:bg-white/[0.06] auto-light:border-black/10 auto-light:text-neutral-700 auto-light:hover:bg-black/[0.06]"
            >
              Today
            </button>
          )}
          <button
            type="button"
            aria-label="Previous day"
            onClick={() => pick(fmt(dayjs(date).subtract(1, 'day')))}
            className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white auto-light:text-neutral-500 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-950"
          >
            <Icon name="chevron_left" className="text-[20px]" />
          </button>
          {!showDays && (
            // On a phone the days list is a page away: jump to any day here.
            <DatePopover
              value={date}
              clearable={false}
              onPick={(d) => d && pick(d)}
              trigger={
                <button
                  type="button"
                  aria-label="Pick a day"
                  className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white data-[state=open]:bg-white/[0.06] auto-light:text-neutral-500 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-950"
                >
                  <Icon name="calendar_month" className="text-[19px]" />
                </button>
              }
            />
          )}
          <button
            type="button"
            aria-label="Next day"
            onClick={() => pick(fmt(dayjs(date).add(1, 'day')))}
            className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white auto-light:text-neutral-500 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-950"
          >
            <Icon name="chevron_right" className="text-[20px]" />
          </button>
        </div>
      </div>

      {ahead && editable && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-sky-400/20 bg-sky-500/[0.07] px-3.5 py-2.5 text-xs text-sky-200 auto-light:text-sky-700">
          <Icon name="event_upcoming" className="mt-px text-[16px]" />
          <span>
            You are planning ahead. Tasks written here before the day starts
            count as planned for it.
          </span>
        </div>
      )}
      {!editable && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-neutral-400 auto-light:border-black/10 auto-light:bg-black/[0.03] auto-light:text-neutral-500">
          <Icon name="lock_clock" className="mt-px text-[16px]" />
          <span>
            Only days from a week back to two weeks ahead can be changed here.
          </span>
        </div>
      )}

      {/* The project bar is left out on a phone, for room. */}
      {wide && (
        <ProjectSummary
          counts={counts}
          day={day}
          filter={filter}
          onFilter={setFilter}
          showPoints={showPoints}
          onShowPoints={toggleShowPoints}
        />
      )}

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-2 auto-light:border-black/10 auto-light:bg-white">
        {day.loading && !day.tasks.length ? (
          <div className="flex flex-col gap-2 p-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded-lg bg-white/[0.04] auto-light:bg-black/[0.04]"
              />
            ))}
          </div>
        ) : (
          <>
            {view !== 'summary' && view !== 'projects' && !shown.length && (
              <p className="px-2 pb-1 pt-2 text-sm text-neutral-500">
                {ahead
                  ? 'Nothing planned for this day yet. Write the plan down, one task per line.'
                  : 'Nothing on this day yet. Write a task and press Enter for the next one.'}
              </p>
            )}
            {view === 'default' && (
              <TaskSheet
                day={day}
                groups={defaultGroups}
                editable={editable}
                showPoints={showPoints}
              />
            )}
            {view === 'priority' && (
              <TaskSheet
                day={day}
                groups={priorityGroups}
                editable={editable}
                showPoints={showPoints}
              />
            )}
            {view === 'projects' && (
              <>
                {!projectGroups.length && (
                  <p className="px-2 pb-1 pt-2 text-sm text-neutral-500">
                    No tasks in a project on this day yet. Pick a project to add
                    one.
                  </p>
                )}
                <TaskSheet
                  day={day}
                  groups={projectGroups}
                  editable={editable}
                  showPoints={showPoints}
                />
                {editable && (
                  <div className="px-2 pb-1 pt-2">
                    <Picker
                      options={placeChoices}
                      onPick={(o) => setExtraPlaces((keys) => [...keys, o.id])}
                      placeholder="Pick a project…"
                      empty="No projects match"
                      align="start"
                      trigger={
                        <button
                          type="button"
                          className="flex items-center gap-1.5 rounded-lg p-1 text-xs font-medium text-neutral-500 hover:text-neutral-200 auto-light:hover:text-neutral-800"
                        >
                          <Icon name="add" className="text-[16px]" />
                          Add a task in another project
                        </button>
                      }
                    />
                  </div>
                )}
              </>
            )}
            {view === 'summary' && (
              <DaySummary day={day} tasks={shown} counts={counts} />
            )}
          </>
        )}
      </div>

      {view === 'default' && claudes.length > 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-violet-400/20 bg-violet-500/[0.03] p-2 auto-light:border-violet-500/25 auto-light:bg-violet-500/[0.03]">
          <p className="flex items-center gap-1.5 px-2 pt-1 text-xs font-semibold text-violet-300 auto-light:text-violet-700">
            <Icon name="auto_awesome" className="text-[15px]" />
            Added by Claude
            <span className="font-normal text-neutral-500">
              {claudes.length}
            </span>
          </p>
          <TaskSheet
            day={day}
            groups={claudeGroups}
            editable={editable}
            showPoints={showPoints}
          />
        </div>
      )}

      {date === today && (
        <div className="mt-6">
          <PlanTomorrow count={tomorrowCount} onOpen={() => pick(tomorrow)} />
        </div>
      )}

      <p className="mt-6 px-2 text-[11px] leading-5 text-neutral-600 auto-light:text-neutral-400">
        Enter adds the next task · Backspace on an empty task takes it out ·
        Ctrl+Space done · Ctrl+P doing · Ctrl+Q not done · the arrow on the
        right of a task shows its details and notes
      </p>
    </div>
  );

  const upcomingCount = upcomingOf(
    yourTasks.tasks ?? [],
    yourTasks.today,
  ).length;
  const sideTabs: { value: SideTab; label: string; dot?: boolean }[] = [
    { value: 'tasks', label: 'Your tasks' },
    { value: 'todo', label: 'Todo', dot: incompleteTodos > 0 },
    { value: 'tips', label: 'Tips' },
  ];
  const side = (
    <div className="flex min-w-0 flex-col gap-4">
      <WorklogBuff month={month.format('YYYY-MM')} version={day.version} />
      <div>
        <div className="mb-3 flex gap-1 border-b border-white/[0.07] auto-light:border-black/10">
          {sideTabs.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setSideTab(t.value)}
              className={cn(
                '-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                sideTab === t.value
                  ? 'border-white text-white auto-light:border-neutral-900 auto-light:text-neutral-950'
                  : 'border-transparent text-neutral-500 hover:text-neutral-200 auto-light:hover:text-neutral-800',
              )}
            >
              {t.label}
              {t.value === 'tasks' && upcomingCount > 0 && (
                <span className="text-[11px] tabular-nums text-neutral-500">
                  {upcomingCount}
                </span>
              )}
              {t.dot && (
                <span className="size-1.5 animate-pulse rounded-full bg-sky-400" />
              )}
            </button>
          ))}
        </div>
        {sideTab === 'tasks' && (
          <YourTasks
            data={yourTasks}
            companies={day.companies}
            date={date}
            canPlan={editable}
            onChanged={() => {
              yourTasks.reload();
              day.reload();
            }}
          />
        )}
        {sideTab === 'todo' && user?.id && (
          <div className="mdx-auto rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 pb-4 auto-light:border-black/10 auto-light:bg-white">
            <TodoTab userId={user.id} />
          </div>
        )}
        {sideTab === 'tips' && <WorklogTips />}
      </div>
    </div>
  );

  return (
    <div className="auto-theme quiet-scrollbar fixed inset-0 overflow-y-auto bg-neutral-950 pb-[72px] text-neutral-100 auto-light:bg-neutral-50 auto-light:text-neutral-900 md:left-16 md:pb-0">
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.07] bg-neutral-950/80 px-4 backdrop-blur-xl auto-light:border-black/10 auto-light:bg-neutral-50/80">
        {layout === 'day' ? (
          <Link
            href={APP_ROUTES.userWorklogs}
            aria-label="All days"
            className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white auto-light:text-neutral-500 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-950"
          >
            <Icon name="arrow_back" className="text-[18px]" />
          </Link>
        ) : (
          <Link
            href={APP_ROUTES.home}
            className="whitespace-nowrap border-r border-white/10 pr-3 text-sm font-extrabold tracking-wide text-white auto-light:border-black/10 auto-light:text-neutral-950 md:text-lg"
          >
            PORTAL
          </Link>
        )}
        <span
          className={cn(
            'text-xs tracking-widest text-neutral-400 auto-light:text-neutral-500 sm:text-sm',
            showDay && 'max-lg:hidden',
          )}
        >
          My Worklogs
        </span>
        {showDay && (
          <nav
            aria-label="Views"
            // In the middle of the header: between the back arrow and the
            // theme switch on a phone, in the middle of the page from sm up.
            className="mx-auto flex shrink-0 items-center gap-0.5 rounded-lg border border-white/[0.07] bg-white/[0.03] p-0.5 auto-light:border-black/10 auto-light:bg-black/[0.03] sm:absolute sm:left-1/2 sm:-translate-x-1/2"
          >
            {VIEWS.map((v) => (
              <button
                key={v.value}
                type="button"
                aria-pressed={view === v.value}
                onClick={() => pickView(v.value)}
                className={cn(
                  'h-7 rounded-md px-2 text-xs font-medium transition-colors sm:px-2.5',
                  view === v.value
                    ? 'bg-white/[0.12] text-white auto-light:bg-white auto-light:text-neutral-950 auto-light:shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 auto-light:text-neutral-500 auto-light:hover:text-neutral-800',
                )}
              >
                {v.label}
              </button>
            ))}
          </nav>
        )}
        {showDay && (
          <span className="ml-1 hidden items-center gap-1.5 text-xs text-neutral-500 xl:flex">
            {day.saving ? (
              <>
                <Spin className="size-3" /> Saving
              </>
            ) : day.version > 0 ? (
              <>
                <Icon name="cloud_done" className="text-[14px]" /> Saved
              </>
            ) : null}
          </span>
        )}
        <div className={cn('flex-1', showDay && 'max-sm:hidden')} />
        <ThemeToggle />
        <Link
          href={APP_ROUTES.user}
          className={cn(
            showDay && 'max-sm:hidden',
            'inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-950 transition-colors hover:bg-neutral-200 auto-light:bg-neutral-900 auto-light:text-white auto-light:hover:bg-neutral-700',
          )}
        >
          <Icon name="insights" className="text-[16px]" />
          My page
        </Link>
      </header>

      <main
        className={cn(
          'mx-auto grid w-full gap-6 px-4 pb-24 pt-5 md:px-6',
          showDays
            ? 'max-w-[1600px] md:grid-cols-[minmax(250px,1fr)_minmax(0,1.6fr)] xl:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.5fr)_minmax(300px,1fr)]'
            : 'max-w-[760px]',
        )}
      >
        {showDays && (
          <aside className="quiet-scrollbar min-w-0 md:sticky md:top-[76px] md:row-span-2 md:max-h-[calc(100vh-96px)] md:self-start md:overflow-y-auto md:pr-1 xl:row-span-1">
            <DayList
              month={month}
              onMonth={setMonth}
              days={days ?? {}}
              loading={!days}
              selected={date}
              liveLines={liveLines}
              onPick={pick}
              opensPage={!wide}
            />
          </aside>
        )}
        {showDay && sheetView}
        {showDay && (
          <aside className="quiet-scrollbar min-w-0 xl:sticky xl:top-[76px] xl:max-h-[calc(100vh-96px)] xl:self-start xl:overflow-y-auto">
            {side}
          </aside>
        )}
      </main>
      <Toaster position="bottom-right" richColors theme="system" />
    </div>
  );
};
