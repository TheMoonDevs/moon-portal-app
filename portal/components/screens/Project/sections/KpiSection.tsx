'use client';

import type { Task } from '@db/client';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { Icon } from '../../Admin/shared/AdminUI';
import type { ProjectRow } from '../../Admin/Workspace/AdminProjects';
import { goalBars } from './ProjectHome';
import { SectionShell } from './SectionShell';

const WEEKS = 8;

type Point = { userId: string; date: string };

/** The Monday of each of the last 8 weeks, oldest first. */
const weekStarts = () => {
  const monday = dayjs()
    .startOf('day')
    .subtract((dayjs().day() + 6) % 7, 'day');
  return Array.from({ length: WEEKS }, (_, i) =>
    monday.subtract(WEEKS - 1 - i, 'week'),
  );
};

const weekIndex = (starts: dayjs.Dayjs[], date: string | Date) => {
  const d = dayjs(date);
  for (let i = starts.length - 1; i >= 0; i--)
    if (!d.isBefore(starts[i]))
      return d.isBefore(starts[i].add(1, 'week')) ? i : -1;
  return -1;
};

/** Eight bars, one per week, the last one this week. */
const Trend = ({
  values,
  color,
  format = (n) => String(n),
}: {
  values: (number | null)[];
  color: string;
  format?: (n: number) => string;
}) => {
  const max = Math.max(1, ...values.map((v) => v ?? 0));
  return (
    <div className="mt-4 flex h-14 items-end gap-1" aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          title={v === null ? 'No data' : format(v)}
          className="flex h-full flex-1 items-end"
        >
          <motion.span
            className={cn(
              'w-full rounded-t-[3px]',
              (v ?? 0) === 0 && 'bg-white/[0.06]',
              i === values.length - 1 && 'ring-1 ring-white/25',
            )}
            style={
              v
                ? { backgroundColor: color, opacity: 0.4 + 0.6 * (v / max) }
                : {}
            }
            initial={{ height: 0 }}
            animate={{ height: v ? `${Math.max(8, (v / max) * 100)}%` : 3 }}
            transition={{ duration: 0.5, delay: i * 0.03 }}
          />
        </span>
      ))}
    </div>
  );
};

const Delta = ({ now, before }: { now: number; before: number }) => {
  if (!before && !now) return null;
  const diff = now - before;
  if (!diff)
    return (
      <span className="text-[11px] text-neutral-500">same as last week</span>
    );
  return (
    <span
      className={cn(
        'flex items-center text-[11px]',
        diff > 0 ? 'text-emerald-300' : 'text-rose-300',
      )}
    >
      <Icon
        name={diff > 0 ? 'arrow_upward' : 'arrow_downward'}
        className="text-[13px]"
      />
      {Math.abs(diff)} vs last week
    </span>
  );
};

const KpiTile = ({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
  children?: React.ReactNode;
}) => (
  <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
    <p className="text-xs text-neutral-500" title={hint}>
      {label}
    </p>
    <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
      <p className="text-2xl font-semibold tabular-nums text-white">{value}</p>
    </div>
    {children}
  </div>
);

/**
 * The numbers that say whether the project is working, worked out from what
 * people already do here: tasks finished, finished on time, goals met,
 * people active and work logged, week by week for the last 8 weeks. Target
 * goals (a number to reach) show how close they are.
 */
export const KpiSection = ({
  project,
  tasks,
}: {
  project: ProjectRow;
  tasks: Task[];
}) => {
  const [points, setPoints] = useState<Point[] | null>(null);
  const color = project.color || '#38bdf8';

  useEffect(() => {
    PortalSdk.getData(
      `/api/projects/${project.id}/points?days=${WEEKS * 7}`,
      null,
    )
      .then((res) => setPoints(res?.data?.points ?? []))
      .catch(() => setPoints([]));
  }, [project.id]);

  const kpi = useMemo(() => {
    const starts = weekStarts();
    const finished = Array.from({ length: WEEKS }, () => 0);
    const withDay = Array.from({ length: WEEKS }, () => 0);
    const onTime = Array.from({ length: WEEKS }, () => 0);
    for (const t of tasks) {
      if (t.status !== 'DONE' || !t.completedAt) continue;
      const i = weekIndex(starts, t.completedAt as unknown as string);
      if (i < 0) continue;
      finished[i] += 1;
      const day =
        t.forDate ?? (t.dueDate ? String(t.dueDate).slice(0, 10) : null);
      if (!day) continue;
      withDay[i] += 1;
      if (dayjs(t.completedAt as unknown as string).format('YYYY-MM-DD') <= day)
        onTime[i] += 1;
    }
    const rate = withDay.map((n, i) =>
      n ? Math.round((onTime[i] / n) * 100) : null,
    );
    const allWithDay = withDay.reduce((a, b) => a + b, 0);
    const allOnTime = onTime.reduce((a, b) => a + b, 0);

    const logged = Array.from({ length: WEEKS }, () => 0);
    const people = Array.from({ length: WEEKS }, () => new Set<string>());
    for (const p of points ?? []) {
      const i = weekIndex(starts, p.date);
      if (i < 0) continue;
      logged[i] += 1;
      people[i].add(p.userId);
    }

    // Goal periods that have ended, met or missed.
    const periods = Object.values(project.goalHistory ?? {}).flat();
    const ended = periods.filter((p) => p.met !== null);
    const hit = ended.filter((p) => p.met).length;

    return {
      finished,
      rate,
      onTimeAll: allWithDay ? Math.round((allOnTime / allWithDay) * 100) : null,
      logged,
      people: people.map((s) => s.size),
      goalRate: ended.length ? Math.round((hit / ended.length) * 100) : null,
      goalHit: hit,
      goalEnded: ended.length,
    };
  }, [tasks, points, project.goalHistory]);

  const last = WEEKS - 1;
  const targets = goalBars(project).filter((g) =>
    project.goals?.find((x) => x.id === g.id && x.kind === 'target'),
  );
  const scheduled = (project.goals ?? []).filter((g) => g.kind !== 'target');

  return (
    <SectionShell
      icon="monitoring"
      title="KPI"
      description="Whether the project is working, week by week for the last 8 weeks. Worked out from the tasks, goals and work logged here."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiTile
          label="Tasks finished this week"
          value={kpi.finished[last]}
          hint="Tasks marked done, by the week they were finished"
        >
          <Delta now={kpi.finished[last]} before={kpi.finished[last - 1]} />
          <Trend values={kpi.finished} color={color} />
        </KpiTile>
        <KpiTile
          label="Finished on time"
          value={kpi.onTimeAll === null ? '–' : `${kpi.onTimeAll}%`}
          hint="Of finished tasks that had a day, how many were done by that day (8 weeks)"
        >
          <p className="text-[11px] text-neutral-500">
            {kpi.rate[last] === null
              ? 'No dated tasks finished this week'
              : `${kpi.rate[last]}% this week`}
          </p>
          <Trend values={kpi.rate} color="#34d399" format={(n) => `${n}%`} />
        </KpiTile>
        <KpiTile
          label="Goal periods met"
          value={kpi.goalRate === null ? '–' : `${kpi.goalRate}%`}
          hint="Of the goal periods that have ended, how many reached their target"
        >
          <p className="text-[11px] text-neutral-500">
            {kpi.goalEnded
              ? `${kpi.goalHit} of ${kpi.goalEnded} recent periods`
              : 'No goal period has ended yet'}
          </p>
          {scheduled.length > 0 && (
            <ul className="mt-4 flex flex-col gap-1.5">
              {scheduled.slice(0, 4).map((g) => (
                <li key={g.id} className="flex items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-neutral-300">
                    {g.title}
                  </span>
                  <span className="flex gap-1">
                    {(project.goalHistory?.[g.id] ?? []).map((p, i) => (
                      <span
                        key={i}
                        title={`${p.from}: ${p.done}/${p.target}`}
                        className={cn(
                          'size-2.5 rounded-[3px]',
                          p.met === null
                            ? 'border border-white/20'
                            : p.met
                              ? 'bg-emerald-400'
                              : 'bg-rose-400/70',
                        )}
                      />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </KpiTile>
        <KpiTile
          label="People active this week"
          value={points ? kpi.people[last] : '…'}
          hint="People who logged work on the project, per week"
        >
          {points && (
            <>
              <Delta now={kpi.people[last]} before={kpi.people[last - 1]} />
              <Trend values={kpi.people} color="#a78bfa" />
            </>
          )}
        </KpiTile>
        <KpiTile
          label="Work logged this week"
          value={points ? kpi.logged[last] : '…'}
          hint="Work points logged on the project's tasks, per week"
        >
          {points && (
            <>
              <Delta now={kpi.logged[last]} before={kpi.logged[last - 1]} />
              <Trend values={kpi.logged} color="#fbbf24" />
            </>
          )}
        </KpiTile>
        {targets.map((g) => (
          <KpiTile
            key={g.id}
            label={g.title}
            value={
              <>
                {g.done.toLocaleString('en-US')}
                <span className="text-base font-medium text-neutral-500">
                  {' '}
                  / {g.target.toLocaleString('en-US')}
                </span>
              </>
            }
            hint="A target goal: one number to reach"
          >
            <p className="text-[11px] text-neutral-500">
              {g.met ? 'Reached' : `${g.percent}% of the way`}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: g.met ? '#34d399' : color }}
                initial={{ width: 0 }}
                animate={{ width: `${g.percent}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
            </div>
          </KpiTile>
        ))}
      </div>
      <p className="mt-4 text-xs text-neutral-600">
        Bars run Monday to Sunday, oldest on the left; the outlined one is this
        week.
      </p>
    </SectionShell>
  );
};
