'use client';

import type { Task } from '@db/client';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { Icon, Segmented, UserAvatar } from '../../Admin/shared/AdminUI';
import type { Person } from '../types';
import { SectionShell, Stat } from './SectionShell';

type Line = { key: string; text: string; taskId: string | null; done: boolean };
type Entry = { id: string; date: string; userId: string; lines: Line[] };
type Data = { entries: Entry[]; users: Person[] };

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
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
  const [range, setRange] = useState('30');
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    setData(null);
    PortalSdk.getData(`/api/projects/${projectId}/worklogs?days=${range}`, null)
      .then((res) => setData(res?.data ?? { entries: [], users: [] }))
      .catch(() => setData({ entries: [], users: [] }));
  }, [projectId, range]);

  const byDay = useMemo(() => {
    const out = new Map<string, Entry[]>();
    for (const e of data?.entries ?? [])
      out.set(e.date, [...(out.get(e.date) ?? []), e]);
    return Array.from(out.entries());
  }, [data]);

  const userOf = (id: string) => data?.users.find((u) => u.id === id);
  const taskOf = (id: string | null) => tasks.find((t) => t.id === id);
  const lines = data?.entries.flatMap((e) => e.lines) ?? [];

  return (
    <SectionShell
      icon="history_edu"
      title="Worklogs"
      description="Lines from everyone’s worklogs that went to this project. Private lines never show here."
      actions={<Segmented value={range} onChange={setRange} options={RANGES} />}
    >
      <div className="mb-8 grid grid-cols-3 gap-3">
        <Stat label="Lines" value={data ? lines.length : '–'} />
        <Stat
          label="Ticked off"
          value={data ? lines.filter((l) => l.done).length : '–'}
        />
        <Stat
          label="People"
          value={data ? new Set(data.entries.map((e) => e.userId)).size : '–'}
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
          <p className="text-sm text-neutral-300">No worklog lines yet</p>
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
