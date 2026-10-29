'use client';

import type { Task } from '@db/client';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { Icon, Segmented, UserAvatar } from '../../Admin/shared/AdminUI';
import {
  type Period,
  type PeriodKind,
  periodLabel,
  periodOf,
  shiftPeriod,
} from '../../UserPage/work';
import type { Person } from '../types';
import { SectionShell, Stat } from './SectionShell';

type Line = { key: string; text: string; taskId: string | null; done: boolean };
type Entry = { id: string; date: string; userId: string; lines: Line[] };
type Data = { entries: Entry[]; users: Person[] };

const PERIODS: { value: PeriodKind; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
];

type Ticks = 'all' | 'done' | 'open';

const TICKS: { value: Ticks; label: string }[] = [
  { value: 'all', label: 'All lines' },
  { value: 'done', label: 'Ticked off' },
  { value: 'open', label: 'Not ticked' },
];

const dayLabel = (date: string) => {
  const d = dayjs(date);
  if (d.isSame(dayjs(), 'day')) return 'Today';
  if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Yesterday';
  return d.format('dddd, D MMM');
};

/** Worklog lines people linked to this project, day by day. */
export const WorklogsSection = ({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: Task[];
}) => {
  const [period, setPeriod] = useState<Period>(() => periodOf('week', dayjs()));
  const [person, setPerson] = useState<string | null>(null);
  const [ticks, setTicks] = useState<Ticks>('all');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    setData(null);
    PortalSdk.getData(
      `/api/projects/${projectId}/worklogs?from=${period.from}&to=${period.to}`,
      null,
    )
      .then((res) => setData(res?.data ?? { entries: [], users: [] }))
      .catch(() => setData({ entries: [], users: [] }));
  }, [projectId, period.from, period.to]);

  // Lines that pass the filters; a person's day with none left is hidden.
  const entries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.entries ?? [])
      .filter((e) => !person || e.userId === person)
      .map((e) => ({
        ...e,
        lines: e.lines.filter(
          (l) =>
            (ticks === 'all' || (ticks === 'done') === l.done) &&
            (!q || l.text.toLowerCase().includes(q)),
        ),
      }))
      .filter((e) => e.lines.length);
  }, [data, person, ticks, search]);

  const byDay = useMemo(() => {
    const out = new Map<string, Entry[]>();
    for (const e of entries) out.set(e.date, [...(out.get(e.date) ?? []), e]);
    return Array.from(out.entries());
  }, [entries]);

  // Everyone who logged on the project in the period, most lines first.
  const writers = useMemo(() => {
    const count = new Map<string, number>();
    for (const e of data?.entries ?? [])
      count.set(e.userId, (count.get(e.userId) ?? 0) + e.lines.length);
    return Array.from(count.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
  }, [data]);

  const userOf = (id: string) => data?.users.find((u) => u.id === id);
  const taskOf = (id: string | null) => tasks.find((t) => t.id === id);
  const lines = entries.flatMap((e) => e.lines);
  const label = periodLabel(period);
  const isCurrent = periodOf(period.kind, dayjs()).from === period.from;

  return (
    <SectionShell
      icon="history_edu"
      title="Worklogs"
      description="Lines from everyone’s worklogs that went to this project. Private lines never show here."
    >
      {/* Period, as on the user page */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => setPeriod(shiftPeriod(period, -1))}
            className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white"
          >
            <Icon name="chevron_left" className="text-[20px]" />
          </button>
          <button
            type="button"
            aria-label="Next"
            disabled={isCurrent}
            onClick={() => setPeriod(shiftPeriod(period, 1))}
            className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-30"
          >
            <Icon name="chevron_right" className="text-[20px]" />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <p className="whitespace-nowrap text-lg font-semibold leading-tight tracking-tight text-white">
            {label.title}
          </p>
          {label.range && (
            <p className="text-xs text-neutral-500">{label.range}</p>
          )}
        </div>
        <Segmented
          className="w-full sm:w-auto [&>button]:flex-1 [&>button]:justify-center"
          value={period.kind}
          onChange={(kind) => setPeriod(periodOf(kind, dayjs()))}
          options={PERIODS}
        />
      </div>

      {/* Who, which lines, and words */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPerson(null)}
            className={cn(
              'h-8 rounded-full px-3 text-xs font-medium transition-colors',
              !person
                ? 'bg-white text-neutral-950'
                : 'bg-white/[0.05] text-neutral-400 hover:text-white',
            )}
          >
            Everyone
          </button>
          {writers.map((id) => {
            const user = userOf(id);
            const on = person === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPerson(on ? null : id)}
                title={user?.name || undefined}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-full pl-1 pr-3 text-xs font-medium transition-colors',
                  on
                    ? 'bg-white text-neutral-950'
                    : 'bg-white/[0.05] text-neutral-400 hover:text-white',
                )}
              >
                <UserAvatar src={user?.avatar} name={user?.name} size={24} />
                {user?.name?.split(' ')[0] || 'Someone'}
              </button>
            );
          })}
        </div>
        <div className="flex-1" />
        <label className="flex h-8 w-full items-center gap-1.5 rounded-lg border border-white/[0.07] bg-neutral-900/60 px-2.5 text-xs text-neutral-400 focus-within:border-white/20 sm:w-48">
          <Icon name="search" className="text-[16px]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lines…"
            className="min-w-0 flex-1 bg-transparent text-neutral-200 outline-none placeholder:text-neutral-500"
          />
        </label>
        <Segmented value={ticks} onChange={setTicks} options={TICKS} />
      </div>
      <div className="mb-8 grid grid-cols-3 gap-3">
        <Stat label="Lines" value={data ? lines.length : '–'} />
        <Stat
          label="Ticked off"
          value={data ? lines.filter((l) => l.done).length : '–'}
        />
        <Stat
          label="People"
          value={data ? new Set(entries.map((e) => e.userId)).size : '–'}
        />
      </div>

      {!data ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-white/[0.03]"
            />
          ))}
        </div>
      ) : byDay.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 px-6 py-14 text-center">
          <p className="text-sm text-neutral-300">
            {data?.entries.length
              ? 'No lines match these filters'
              : 'No worklog lines in this period'}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
            When people write about this project in their worklog, the lines
            land here.
          </p>
        </div>
      ) : (
        <ol className="relative ml-2 border-l border-white/[0.08] pl-6">
          {byDay.map(([date, entries], i) => (
            <motion.li
              key={date}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.04 }}
              className="relative mb-8 last:mb-0"
            >
              <span className="absolute left-[-31px] top-1 size-3 rounded-full border-2 border-neutral-950 bg-neutral-500" />
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                {dayLabel(date)}
              </p>
              <div className="flex flex-col gap-3">
                {entries.map((entry) => {
                  const user = userOf(entry.userId);
                  return (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <UserAvatar
                          src={user?.avatar}
                          name={user?.name}
                          size={24}
                        />
                        <span className="text-sm font-medium text-white">
                          {user?.name || 'Someone'}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {entry.lines.length}{' '}
                          {entry.lines.length === 1 ? 'line' : 'lines'}
                        </span>
                      </div>
                      <ul className="flex flex-col gap-1.5 pl-8">
                        {entry.lines.map((line) => {
                          const task = taskOf(line.taskId);
                          return (
                            <li
                              key={line.key}
                              className="flex items-start gap-2 text-sm"
                            >
                              <Icon
                                name={
                                  line.done
                                    ? 'check_circle'
                                    : 'radio_button_unchecked'
                                }
                                filled={line.done}
                                className={cn(
                                  'mt-0.5 text-[16px]',
                                  line.done
                                    ? 'text-emerald-400'
                                    : 'text-neutral-600',
                                )}
                              />
                              <span className="min-w-0 flex-1 text-neutral-200">
                                {line.text}
                                {task && (
                                  <span className="ml-2 inline-flex items-center gap-0.5 rounded-md bg-white/[0.05] px-1.5 py-0.5 align-middle text-[11px] text-neutral-400">
                                    <Icon
                                      name="task_alt"
                                      className="text-[12px]"
                                    />
                                    {task.title}
                                  </span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </motion.li>
          ))}
        </ol>
      )}
    </SectionShell>
  );
};
