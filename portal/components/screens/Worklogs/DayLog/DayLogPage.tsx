'use client';

import { Drawer } from '@mui/material';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Toaster } from 'sonner';

import { cn } from '@/lib/utils';
import { countOrigins, type PointOrigin } from '@/lib/worklogs/origin';
import { sectionLines } from '@/lib/worklogs/timeline';
import type { WorkLogs } from '@/models/worklogs';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { Icon, Segmented, Spin } from '../../Admin/shared/AdminUI';
import TodoTab from '../WorklogTabs/TodoTab';
import { OriginBar } from './OriginBar';
import type { PickerOption } from './Picker';
import type { MyTask } from './PointList';
import { PointList } from './PointList';
import { isPoint } from './rows';
import type { TaskProject } from './TasksPanel';
import { TasksPanel } from './TasksPanel';
import { useDayLog } from './useDayLog';
import { buildDay } from './view';

/*
 * The worklog page: one day at a time. Points are grouped by project and
 * written like a plan's steps; every point in a project is a task, and the
 * person's tasks sit beside the day to put on it. The top of the day shows
 * how much was planned, came up unexpectedly, or slipped from earlier, and
 * the end of today asks for tomorrow's plan.
 */

const fmt = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');

/** Days from a week back to two weeks ahead can be written in. */
const editableDay = (date: string) => {
  const diff = dayjs(date).diff(dayjs().startOf('day'), 'day');
  return diff >= -7 && diff <= 14;
};

const dayHeading = (date: string) => {
  const d = dayjs(date);
  const today = dayjs().startOf('day');
  const diff = d.diff(today, 'day');
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

const WeekStrip = ({
  date,
  counts,
  onPick,
}: {
  date: string;
  counts: Record<string, number>;
  onPick: (date: string) => void;
}) => {
  const anchor = dayjs(date);
  const monday = anchor.subtract((anchor.day() + 6) % 7, 'day');
  const days = Array.from({ length: 7 }, (_, i) => monday.add(i, 'day'));
  const today = fmt(dayjs());
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Previous week"
        onClick={() => onPick(fmt(anchor.subtract(7, 'day')))}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-white/[0.06] hover:text-white"
      >
        <Icon name="chevron_left" className="text-[18px]" />
      </button>
      <div className="grid flex-1 grid-cols-7 gap-1">
        {days.map((d) => {
          const key = fmt(d);
          const selected = key === date;
          const count = counts[key] ?? 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors',
                selected
                  ? 'bg-white text-neutral-950'
                  : 'text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-100',
              )}
            >
              <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">
                {d.format('dd')}
              </span>
              <span
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  key === today && !selected && 'text-sky-300',
                )}
              >
                {d.format('D')}
              </span>
              <span
                className={cn(
                  'h-1 w-4 rounded-full',
                  count === 0
                    ? 'bg-transparent'
                    : selected
                      ? 'bg-neutral-950/40'
                      : key > today
                        ? 'bg-sky-400/60'
                        : 'bg-emerald-400/70',
                )}
                title={count ? `${count} points` : undefined}
              />
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="Next week"
        onClick={() => onPick(fmt(anchor.add(7, 'day')))}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-white/[0.06] hover:text-white"
      >
        <Icon name="chevron_right" className="text-[18px]" />
      </button>
    </div>
  );
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
          : 'border-white/[0.07] bg-white/[0.02]',
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-[20px] text-sky-300">
        <Icon name="event_upcoming" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">
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
        className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-200"
      >
        {count === 0 ? 'Plan tomorrow' : 'Open tomorrow'}
      </button>
    </div>
  );
};

type Tab = 'day' | 'tasks';

export const DayLogPage = ({
  initialDate,
}: {
  initialDate?: string | null;
}) => {
  const router = useRouter();
  const { user } = useUser();
  const [date, setDate] = useState(() =>
    initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
      ? initialDate
      : fmt(dayjs()),
  );
  const day = useDayLog(date);
  const [tab, setTab] = useState<Tab>('day');
  const [laterOpen, setLaterOpen] = useState(false);
  const [myTasks, setMyTasks] = useState<MyTask[] | null>(null);
  const [taskProjects, setTaskProjects] = useState<TaskProject[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [focusRequest, setFocusRequest] = useState<string | null>(null);

  const pick = useCallback(
    (next: string) => {
      setDate(next);
      router.replace(`${APP_ROUTES.userWorklogs}?date=${next}`, {
        scroll: false,
      });
    },
    [router],
  );

  const loadTasks = useCallback(() => {
    PortalSdk.getData('/api/me/tasks', null)
      .then((res) => {
        setMyTasks(res?.data?.tasks ?? []);
        setTaskProjects(res?.data?.projects ?? []);
      })
      .catch(() => setMyTasks([]));
  }, []);
  useEffect(loadTasks, [loadTasks, day.version]);

  // Points per day, for the week strip.
  useEffect(() => {
    if (!user?.id) return;
    PortalSdk.getData(
      `/api/user/worklogs?userId=${user.id}&logType=dayLog`,
      null,
    )
      .then((res) => {
        const next: Record<string, number> = {};
        for (const log of (res?.data?.workLogs ?? []) as WorkLogs[]) {
          if (!log.date || next[log.date] !== undefined) continue;
          next[log.date] = sectionLines(log.works).length;
        }
        setCounts(next);
      })
      .catch(() => undefined);
  }, [user?.id]);
  // This day's count follows what is typed.
  const liveCount = day.rows.filter((r) => !r.filler && isPoint(r)).length;
  const allCounts = useMemo(
    () => ({ ...counts, ...(day.loading ? {} : { [date]: liveCount }) }),
    [counts, date, liveCount, day.loading],
  );

  const { groups, points } = useMemo(
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
  const heading = dayHeading(date);
  const editable = editableDay(date);
  const ahead = date > today;
  const empty = !day.loading && groups.length === 0;

  const projectGroups = new Set(groups.map((g) => g.id));
  // A project with tasks but no points yet, to start writing in.
  const starters = day.candidates.projects
    .filter((p) => !projectGroups.has(`p:${p.id}`))
    .slice(0, 12);

  return (
    <div className="custom-scrollbar fixed inset-0 overflow-y-auto bg-neutral-950 pb-[72px] text-neutral-100 md:left-16 md:pb-0">
      <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.07] bg-neutral-950/80 px-4 text-sm backdrop-blur-xl">
        <Link
          href={APP_ROUTES.home}
          aria-label="Home"
          className="flex size-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-white/[0.06] hover:text-white"
        >
          <Icon name="arrow_back" className="text-[18px]" />
        </Link>
        <span className="font-medium text-neutral-200">Worklog</span>
        <span className="ml-2 flex items-center gap-1.5 text-xs text-neutral-500">
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
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setLaterOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 hover:bg-white/[0.06] hover:text-white"
        >
          <Icon name="bookmark" className="text-[16px]" />
          <span className="hidden sm:inline">Later list</span>
        </button>
        <Link
          href={APP_ROUTES.user}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-950 transition-colors hover:bg-neutral-200"
        >
          <Icon name="insights" className="text-[16px]" />
          <span className="hidden sm:inline">Your page</span>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-6 md:px-8 md:pt-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-[28px]">
                  {heading.name}
                </h1>
                <p className="mt-0.5 text-sm text-neutral-500">
                  {heading.date}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {date !== today && (
                  <button
                    type="button"
                    onClick={() => pick(today)}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-neutral-300 hover:bg-white/[0.06]"
                  >
                    Today
                  </button>
                )}
                <label className="relative flex size-8 cursor-pointer items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white">
                  <Icon name="calendar_month" className="text-[18px]" />
                  <input
                    type="date"
                    aria-label="Pick a day"
                    value={date}
                    onChange={(e) => e.target.value && pick(e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>

            <WeekStrip date={date} counts={allCounts} onPick={pick} />

            <Segmented
              className="mt-5 w-full lg:hidden [&>button]:flex-1 [&>button]:justify-center"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'day', label: 'Points', icon: 'checklist' },
                {
                  value: 'tasks',
                  label: 'Your tasks',
                  icon: 'task_alt',
                  count: myTasks?.length,
                },
              ]}
            />

            <div className={cn(tab !== 'day' && 'hidden lg:block')}>
              {ahead && editable && (
                <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-sky-400/20 bg-sky-500/[0.07] px-3.5 py-2.5 text-xs text-sky-200">
                  <Icon name="event_upcoming" className="mt-px text-[16px]" />
                  <span>
                    You are planning ahead. Points written here before the day
                    starts count as planned, and each one in a project becomes a
                    task for that day.
                  </span>
                </div>
              )}
              {!editable && (
                <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-neutral-400">
                  <Icon name="lock_clock" className="mt-px text-[16px]" />
                  <span>
                    Only days from a week back to two weeks ahead can be changed
                    here.
                  </span>
                </div>
              )}

              {points.length > 0 && (
                <div className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                      How the day came
                    </p>
                    <p className="text-xs text-neutral-500">
                      <span className="font-semibold tabular-nums text-neutral-100">
                        {doneCount}/{points.length}
                      </span>{' '}
                      done
                    </p>
                  </div>
                  <OriginBar counts={originCounts} done={doneByOrigin} />
                </div>
              )}

              <div className="mt-6">
                {day.loading && !day.rows.length ? (
                  <div className="flex flex-col gap-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-9 animate-pulse rounded-lg bg-white/[0.04]"
                      />
                    ))}
                  </div>
                ) : (
                  <PointList
                    day={day}
                    groups={groups}
                    myTasks={myTasks ?? []}
                    projectsForMove={moveOptions}
                    editable={editable}
                    focusRequest={focusRequest}
                  />
                )}

                {editable && !day.loading && (
                  <div className={cn(!empty && 'mt-6')}>
                    {empty && (
                      <p className="mb-3 px-2 text-sm text-neutral-500">
                        {ahead
                          ? 'Nothing planned for this day yet. Write the plan down, one point per line.'
                          : 'Nothing on this day yet. Write a point and press Enter for the next one.'}
                      </p>
                    )}
                    {empty && (
                      <button
                        type="button"
                        onClick={() =>
                          setFocusRequest(day.addRow('general', null))
                        }
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-300"
                      >
                        <Icon name="add" className="text-[18px]" />
                        Add a point
                      </button>
                    )}
                    {starters.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 px-2">
                        <span className="mr-1 text-[11px] text-neutral-600">
                          Write in
                        </span>
                        {starters.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() =>
                              setFocusRequest(day.addRow(p.id, null))
                            }
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] px-2.5 py-0.5 text-[11px] text-neutral-400 hover:border-white/20 hover:text-neutral-200"
                          >
                            <span
                              className="size-1.5 rounded-full"
                              style={{ backgroundColor: p.color || '#a3a3a3' }}
                            />
                            {p.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {date === today && (
                <div className="mt-8">
                  <PlanTomorrow
                    count={allCounts[tomorrow] ?? 0}
                    onOpen={() => pick(tomorrow)}
                  />
                </div>
              )}

              <p className="mt-8 px-2 text-[11px] leading-5 text-neutral-600">
                Enter adds the next point · Backspace on an empty point takes it
                out · Ctrl+Space done · Ctrl+P doing · Ctrl+Q not done · start a
                point with <code className="text-neutral-400">p:</code> to keep
                it private ·{' '}
                <Link
                  href={`${APP_ROUTES.userWorklogs}?classic=1`}
                  className="underline decoration-neutral-700 underline-offset-2 hover:text-neutral-400"
                >
                  classic editor
                </Link>
              </p>
            </div>
          </div>

          <aside
            className={cn(
              'min-w-0 lg:sticky lg:top-16 lg:self-start',
              tab !== 'tasks' && 'hidden lg:block',
            )}
          >
            <TasksPanel
              tasks={myTasks}
              projects={taskProjects}
              date={date}
              onDayIds={onDayIds}
              onAdd={editable ? day.addTasks : async () => 0}
              onChanged={() => {
                loadTasks();
                day.reload();
              }}
            />
          </aside>
        </div>
      </main>

      <Drawer
        anchor="right"
        open={laterOpen}
        onClose={() => setLaterOpen(false)}
        PaperProps={{ className: '!w-[min(420px,100vw)] !bg-white' }}
      >
        <div className="flex items-center justify-between border-b p-3">
          <h2 className="text-sm font-semibold">Later list</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setLaterOpen(false)}
            className="flex size-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
        {laterOpen && user?.id && <TodoTab userId={user.id} />}
      </Drawer>
      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  );
};
