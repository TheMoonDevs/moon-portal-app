'use client';

import { useMediaQuery } from '@mui/material';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Toaster } from 'sonner';

import { cn } from '@/lib/utils';
import { countOrigins, type PointOrigin } from '@/lib/worklogs/origin';
import { sectionLines } from '@/lib/worklogs/timeline';
import type { WorkLogs } from '@/models/worklogs';
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
import { DayList } from './DayList';
import { OriginBar } from './OriginBar';
import type { PickerOption } from './Picker';
import type { MyTask } from './PointList';
import { PointList } from './PointList';
import { isPoint } from './rows';
import type { TaskProject } from './TasksPanel';
import { TasksPanel } from './TasksPanel';
import { useDayLog } from './useDayLog';
import { buildDay } from './view';
import { WorklogTips } from './WorklogTips';

/*
 * The worklog page. The days of a month on the left (as cards or a
 * calendar), the open day in the middle as one sheet of points, and the
 * month's badge with the person's tasks, their later list and tips on the
 * right. On a phone the days come first and a day opens on its own page.
 * It follows the device's light or dark setting.
 */

const fmt = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');

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
            : `${count} point${count === 1 ? '' : 's'} planned for tomorrow`}
        </p>
        <p className="text-xs text-neutral-500">
          Anything written down before the day starts counts as planned. What
          comes up during the day shows as unexpected.
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
  const day = useDayLog(date);
  const [sideTab, setSideTab] = useState<SideTab>('tasks');
  const [myTasks, setMyTasks] = useState<MyTask[] | null>(null);
  const [taskProjects, setTaskProjects] = useState<TaskProject[]>([]);
  const [previousTasks, setPreviousTasks] = useState<
    { id: string; title: string; status: string }[]
  >([]);
  const [logs, setLogs] = useState<WorkLogs[] | null>(null);
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

  const loadTasks = useCallback(() => {
    PortalSdk.getData('/api/me/tasks', null)
      .then((res) => {
        setMyTasks(res?.data?.tasks ?? []);
        setTaskProjects(res?.data?.projects ?? []);
        setPreviousTasks(res?.data?.previous ?? []);
      })
      .catch(() => setMyTasks([]));
  }, []);
  useEffect(loadTasks, [loadTasks, day.version]);

  // Every day's log, for the days on the left and the month's badge.
  useEffect(() => {
    if (!user?.id) return;
    PortalSdk.getData(
      `/api/user/worklogs?userId=${user.id}&logType=dayLog`,
      null,
    )
      .then((res) => setLogs((res?.data?.workLogs ?? []) as WorkLogs[]))
      .catch(() => setLogs([]));
  }, [user?.id]);

  // The open day as it is being written.
  const liveLines = useMemo(
    () =>
      day.loading
        ? null
        : day.rows
            .filter((r) => !r.filler && isPoint(r))
            .map((r) => ({ text: r.text, status: r.status })),
    [day.rows, day.loading],
  );
  const byDate = useMemo(() => {
    const map = new Map<string, WorkLogs>();
    // Newest first, so the latest copy of a day wins.
    for (const log of logs ?? [])
      if (log.date && !map.has(log.date)) map.set(log.date, log);
    if (day.log?.date && !day.loading) map.set(day.log.date, day.log);
    return map;
  }, [logs, day.log, day.loading]);
  const monthLogs = useMemo(
    () =>
      Array.from(byDate.values()).filter((l) =>
        dayjs(l.date).isSame(month, 'month'),
      ),
    [byDate, month],
  );

  const { points, sheet } = useMemo(
    () =>
      buildDay({
        rows: day.rows,
        byKey: day.linkByKey,
        timeline: day.timeline,
        linkedTasks: day.linkedTasks,
        candidates: day.candidates,
        date,
      }),
    [
      day.rows,
      day.linkByKey,
      day.timeline,
      day.linkedTasks,
      day.candidates,
      date,
    ],
  );

  const originCounts = countOrigins(points.map((p) => p.origin));
  const doneByOrigin: Partial<Record<PointOrigin, number>> = {};
  for (const p of points)
    if (p.origin && p.row.status === 'done')
      doneByOrigin[p.origin] = (doneByOrigin[p.origin] ?? 0) + 1;
  const doneCount = points.filter((p) => p.row.status === 'done').length;

  const moveOptions = useMemo<PickerOption[]>(() => {
    const companies = new Map(
      day.candidates.companies.map((c) => [c.id, c.name]),
    );
    return [
      ...day.candidates.projects.map((p) => ({
        id: `project:${p.id}`,
        label: p.name,
        hint: companies.get(p.companyId) ?? p.companyName,
        group: 'Projects',
        color: p.color,
      })),
      ...day.candidates.companies.map((c) => ({
        id: `company:${c.id}`,
        label: c.name,
        hint: 'Company work, on none of its projects',
        group: 'Company work',
        icon: 'domain',
      })),
      {
        id: 'none',
        label: 'Not company work',
        hint: 'Stays off every project',
        group: 'Other',
        icon: 'block',
      },
    ];
  }, [day.candidates]);

  const onDayIds = useMemo(
    () =>
      new Set(
        day.links.map((l) => l.taskId).filter((id): id is string => !!id),
      ),
    [day.links],
  );

  const today = fmt(dayjs());
  const tomorrow = fmt(dayjs().add(1, 'day'));
  const tomorrowCount = sectionLines(byDate.get(tomorrow)?.works).length;
  const heading = dayHeading(date);
  const editable = editableDay(date);
  const ahead = date > today;
  const showDays = layout === 'full';
  // On a phone the full page is the list of days; a day opens on its own.
  const showDay = layout === 'day' || wide;

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
            You are planning ahead. Points written here before the day starts
            count as planned, and each one in a project becomes a task for that
            day.
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

      {points.length > 0 && (
        <div className="mb-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 auto-light:border-black/10 auto-light:bg-white">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              How the day came
            </p>
            <p className="text-xs text-neutral-500">
              <span className="font-semibold tabular-nums text-neutral-100 auto-light:text-neutral-900">
                {doneCount}/{points.length}
              </span>{' '}
              done
            </p>
          </div>
          <OriginBar counts={originCounts} done={doneByOrigin} />
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-2 auto-light:border-black/10 auto-light:bg-white">
        {day.loading && !day.rows.length ? (
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
            {sheet.length === 0 && (
              <p className="px-2 pb-1 pt-2 text-sm text-neutral-500">
                {ahead
                  ? 'Nothing planned for this day yet. Write the plan down, one point per line.'
                  : 'Nothing on this day yet. Write a point and press Enter for the next one.'}
              </p>
            )}
            <PointList
              day={day}
              sheet={sheet}
              myTasks={myTasks ?? []}
              projectsForMove={moveOptions}
              editable={editable}
            />
          </>
        )}
      </div>

      {date === today && (
        <div className="mt-6">
          <PlanTomorrow count={tomorrowCount} onOpen={() => pick(tomorrow)} />
        </div>
      )}

      <p className="mt-6 px-2 text-[11px] leading-5 text-neutral-600 auto-light:text-neutral-400">
        Enter adds the next point · Backspace on an empty point takes it out ·
        Ctrl+Space done · Ctrl+P doing · Ctrl+Q not done · start a point with{' '}
        <code className="text-neutral-400 auto-light:text-neutral-500">p:</code>{' '}
        to keep it private ·{' '}
        <Link
          href={`${APP_ROUTES.userWorklogs}?classic=1`}
          className="underline decoration-neutral-700 underline-offset-2 hover:text-neutral-400 auto-light:decoration-neutral-300 auto-light:hover:text-neutral-500"
        >
          classic editor
        </Link>
      </p>
    </div>
  );

  const sideTabs: { value: SideTab; label: string; dot?: boolean }[] = [
    { value: 'tasks', label: 'Your tasks' },
    { value: 'todo', label: 'Todo', dot: incompleteTodos > 0 },
    { value: 'tips', label: 'Tips' },
  ];
  const side = (
    <div className="flex min-w-0 flex-col gap-4">
      <WorklogBuff filteredLogs={monthLogs as any} monthTab={month.month()} />
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
              {t.value === 'tasks' && myTasks && myTasks.length > 0 && (
                <span className="text-[11px] tabular-nums text-neutral-500">
                  {myTasks.length}
                </span>
              )}
              {t.dot && (
                <span className="size-1.5 animate-pulse rounded-full bg-sky-400" />
              )}
            </button>
          ))}
        </div>
        {sideTab === 'tasks' && (
          <TasksPanel
            tasks={myTasks}
            projects={taskProjects}
            previous={previousTasks}
            date={date}
            onDayIds={onDayIds}
            onAdd={editable ? day.addTasks : async () => 0}
            onChanged={() => {
              loadTasks();
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
    <div className="auto-theme custom-scrollbar fixed inset-0 overflow-y-auto bg-neutral-950 pb-[72px] text-neutral-100 auto-light:bg-neutral-50 auto-light:text-neutral-900 md:left-16 md:pb-0">
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
        <span className="text-xs tracking-widest text-neutral-400 auto-light:text-neutral-500 sm:text-sm">
          My Worklogs
        </span>
        {showDay && (
          <span className="ml-1 hidden items-center gap-1.5 text-xs text-neutral-500 sm:flex">
            {day.saving ? (
              <>
                <Spin className="size-3" /> Saving
              </>
            ) : day.dirty ? (
              <>
                <Icon name="edit" className="text-[13px]" /> Editing
              </>
            ) : day.log?.id ? (
              <>
                <Icon name="cloud_done" className="text-[14px]" /> Saved
              </>
            ) : null}
          </span>
        )}
        <div className="flex-1" />
        <Link
          href={APP_ROUTES.user}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-950 transition-colors hover:bg-neutral-200 auto-light:bg-neutral-900 auto-light:text-white auto-light:hover:bg-neutral-700"
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
          <aside className="min-w-0 md:sticky md:top-[76px] md:row-span-2 md:max-h-[calc(100vh-96px)] md:self-start md:overflow-y-auto md:pr-1 xl:row-span-1">
            <DayList
              month={month}
              onMonth={setMonth}
              byDate={byDate}
              loading={!logs}
              selected={date}
              liveLines={liveLines}
              onPick={pick}
              opensPage={!wide}
            />
          </aside>
        )}
        {showDay && sheetView}
        {showDay && (
          <aside className="min-w-0 xl:sticky xl:top-[76px] xl:max-h-[calc(100vh-96px)] xl:self-start xl:overflow-y-auto">
            {side}
          </aside>
        )}
      </main>
      <Toaster position="bottom-right" richColors theme="system" />
    </div>
  );
};
