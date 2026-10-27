'use client';

import dayjs from 'dayjs';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { WorkData, WorkPoint } from '@/lib/people/types';
import { cn } from '@/lib/utils';
import { POINT_STATUSES } from '@/lib/worklogs/timeline';
import { APP_ROUTES } from '@/utils/constants/appInfo';

import { Icon, Segmented } from '../Admin/shared/AdminUI';
import { CompanyMark, TASK_STATUS_META } from '../Admin/Workspace/shared';
import { DayTimeline } from './DayTimeline';
import {
  colorFor,
  type CompanyGroup,
  formatMs,
  groupWork,
  isDone,
  lastDay,
  type Period,
  type PeriodKind,
  periodLabel,
  periodOf,
  type ProjectGroup,
  shiftPeriod,
  type TaskGroup,
  timingOf,
  timingSummary,
} from './work';

/* -------------------------------------------------------------------------- */
/*                                   Pieces                                   */
/* -------------------------------------------------------------------------- */

const STATUS_STYLE: Record<string, { icon: string; className: string }> = {
  done: { icon: 'check_circle', className: 'text-emerald-400' },
  doing: { icon: 'pending', className: 'text-amber-300' },
  waiting: { icon: 'help', className: 'text-violet-300' },
  blocked: { icon: 'block', className: 'text-rose-400' },
  not_done: { icon: 'cancel', className: 'text-neutral-500' },
};

const StatusIcon = ({ status }: { status: WorkPoint['status'] }) => {
  const style = status ? STATUS_STYLE[status] : null;
  return (
    <span
      title={status ? POINT_STATUSES[status].label : 'Logged'}
      className="mt-[3px] flex size-4 shrink-0 items-center justify-center"
    >
      {style ? (
        <Icon
          name={style.icon}
          filled
          className={cn('text-[16px]', style.className)}
        />
      ) : (
        <span className="size-1.5 rounded-full bg-neutral-600" />
      )}
    </span>
  );
};

/** Marks work a bot (the person's Claude) did for them. */
export const BotMark = ({ className }: { className?: string }) => (
  <span
    title="Done by your bot"
    aria-label="Done by your bot"
    className={cn(
      'inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-orange-400/15 text-orange-300',
      className,
    )}
  >
    <Icon name="smart_toy" className="text-[11px]" />
  </span>
);

const dayText = (day: string) => {
  const d = dayjs(day);
  if (d.isSame(dayjs(), 'day')) return 'Today';
  if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Yesterday';
  return d.format('ddd D MMM');
};

/** When a point ran, in a few words: "10:20 · 2h 15m", "going 40m". */
function timingText(point: WorkPoint) {
  const t = timingOf(point);
  if (!t) return null;
  const span = t.end - t.start;
  const startText = dayjs(t.start).format('HH:mm');
  const parts = [startText];
  if (t.finished && span >= 60000) parts.push(formatMs(span));
  else if (!t.finished && span >= 60000 && point.status === 'doing')
    parts.push(`going ${formatMs(span)}`);
  return {
    main: parts.join(' · '),
    waited: t.waitingMs >= 60000 ? formatMs(t.waitingMs) : null,
  };
}

const PointRow = ({ point }: { point: WorkPoint }) => {
  const timing = timingText(point);
  const days = point.dates;
  return (
    <li className="group flex items-start gap-2.5 py-1">
      <StatusIcon status={point.status} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-[13px] leading-5',
            point.status === 'not_done'
              ? 'text-neutral-500 line-through decoration-neutral-700'
              : 'text-neutral-200',
          )}
        >
          {point.isPrivate && (
            <Icon
              name="lock"
              className="mr-1 align-[-2px] text-[13px] text-neutral-500"
            />
          )}
          {point.text}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-neutral-500">
          {point.byClaude && <BotMark />}
          <span>
            {days.length > 1
              ? `${dayjs(days[0]).format('ddd D')} → ${dayText(lastDay(point))}`
              : dayText(days[0])}
          </span>
          {timing && <span className="tabular-nums">{timing.main}</span>}
          {timing?.waited && (
            <span className="text-violet-300/80">
              waited {timing.waited} for input
            </span>
          )}
        </p>
      </div>
    </li>
  );
};

const TaskBlock = ({ group, bare }: { group: TaskGroup; bare?: boolean }) => {
  const meta = group.task
    ? (TASK_STATUS_META[group.task.status] ?? TASK_STATUS_META.TODO)
    : null;
  return (
    <div className="py-2">
      <div className={cn('mb-0.5 flex items-center gap-2', bare && 'hidden')}>
        {meta ? (
          <Icon
            name={meta.icon}
            filled={group.task?.status === 'DONE'}
            className={cn(
              'text-[15px]',
              group.task?.status === 'DONE'
                ? 'text-emerald-400'
                : 'text-neutral-500',
            )}
          />
        ) : (
          <Icon name="segment" className="text-[15px] text-neutral-600" />
        )}
        <p
          className={cn(
            'min-w-0 flex-1 truncate text-[13px] font-semibold',
            group.task ? 'text-neutral-100' : 'text-neutral-400',
          )}
        >
          {group.task?.title ?? 'Other work'}
        </p>
        {group.closed && (
          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-px text-[10px] font-medium text-emerald-300">
            Closed {dayjs(group.task?.completedAt).format('D MMM')}
          </span>
        )}
        {!group.closed && meta && group.task?.status !== 'TODO' && (
          <span className="shrink-0 text-[10px] text-neutral-500">
            {meta.label}
          </span>
        )}
      </div>
      {group.points.length > 0 && (
        <ul
          className={cn(!bare && 'ml-[7px] border-l border-white/[0.06] pl-4')}
        >
          {group.points.map((p) => (
            <PointRow key={p.key} point={p} />
          ))}
        </ul>
      )}
    </div>
  );
};

const countText = (g: { points: number; done: number; closedTasks: number }) =>
  [
    g.points && `${g.points} ${g.points === 1 ? 'point' : 'points'}`,
    g.done && `${g.done} done`,
    g.closedTasks &&
      `${g.closedTasks} ${g.closedTasks === 1 ? 'task' : 'tasks'} closed`,
  ]
    .filter(Boolean)
    .join(' · ');

const ProjectCard = ({
  group,
  companyColor,
  defaultOpen,
}: {
  group: ProjectGroup;
  companyColor?: string | null;
  defaultOpen: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const project = group.project;
  const color = project
    ? colorFor(project.id, project.color)
    : (companyColor ?? '#525252');
  const percent = group.points
    ? Math.round((group.done / group.points) * 100)
    : 0;
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span
          className="h-8 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {project?.name ?? 'Not on a project'}
          </p>
          <p className="truncate text-[11px] text-neutral-500">
            {countText(group)}
          </p>
        </div>
        {group.points > 0 && (
          <div className="hidden w-24 sm:block">
            <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full"
                style={{ width: `${percent}%`, backgroundColor: color }}
              />
            </div>
            <p className="mt-1 text-right text-[10px] tabular-nums text-neutral-500">
              {percent}% done
            </p>
          </div>
        )}
        {project && (
          <Link
            href={`${APP_ROUTES.projects}/${project.id}?view=worklogs`}
            onClick={(e) => e.stopPropagation()}
            title="Open project"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-white/[0.06] hover:text-white"
          >
            <Icon name="arrow_outward" className="text-[16px]" />
          </Link>
        )}
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="flex">
          <Icon name="expand_more" className="text-[18px] text-neutral-500" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-white/[0.04] border-t border-white/[0.05] px-4 py-1">
              {group.tasks.map((t, i) => (
                <TaskBlock
                  key={t.task?.id ?? `other-${i}`}
                  group={t}
                  bare={!t.task && group.tasks.length === 1}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CompanySection = ({
  group,
  openFirst,
}: {
  group: CompanyGroup;
  openFirst: number;
}) => (
  <section>
    <div className="mb-2.5 flex items-center gap-2">
      {group.company ? (
        group.company.isPersonal ? (
          <span className="flex size-5 items-center justify-center rounded-md bg-white/[0.06] text-neutral-400">
            <Icon name="lock" className="text-[12px]" />
          </span>
        ) : (
          <CompanyMark
            name={group.company.name}
            color={group.company.color}
            logo={group.company.logo}
            size={20}
          />
        )
      ) : (
        <span className="flex size-5 items-center justify-center rounded-md bg-white/[0.06] text-neutral-500">
          <Icon name="link_off" className="text-[12px]" />
        </span>
      )}
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
        {group.company?.name ?? 'Not linked yet'}
      </p>
      {group.company?.isPersonal && (
        <span className="text-[11px] text-neutral-600">only you see this</span>
      )}
      <span className="ml-auto text-[11px] text-neutral-500">
        {countText(group)}
      </span>
    </div>
    <div className="flex flex-col gap-2">
      {group.projects.map((p, i) => (
        <ProjectCard
          key={p.project?.id ?? 'none'}
          group={p}
          companyColor={group.company?.color}
          defaultOpen={i < openFirst}
        />
      ))}
    </div>
  </section>
);

/** Where the period's points went, one segment per project. */
const ShareBar = ({ groups }: { groups: CompanyGroup[] }) => {
  const segments = groups
    .flatMap((c) =>
      c.projects.map((p) => ({
        id: p.project?.id ?? `${c.company?.id ?? 'none'}:other`,
        label: p.project?.name ?? c.company?.name ?? 'Not linked',
        color: p.project
          ? colorFor(p.project.id, p.project.color)
          : c.company?.isPersonal
            ? '#737373'
            : '#404040',
        value: p.points,
      })),
    )
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = segments.reduce((n, s) => n + s.value, 0);
  if (!total) return null;
  return (
    <div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        {segments.map((s, i) => (
          <motion.div
            key={s.id}
            title={`${s.label}: ${s.value}`}
            initial={{ flexGrow: 0 }}
            animate={{ flexGrow: s.value }}
            transition={{ duration: 0.5, delay: i * 0.03, ease: 'easeOut' }}
            className="h-full min-w-[3px] first:rounded-l-full last:rounded-r-full"
            style={{ backgroundColor: s.color, flexBasis: 0 }}
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.slice(0, 6).map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
            <span className="tabular-nums text-neutral-600">
              {Math.round((s.value / total) * 100)}%
            </span>
          </span>
        ))}
        {segments.length > 6 && (
          <span className="text-[11px] text-neutral-600">
            +{segments.length - 6} more
          </span>
        )}
      </div>
    </div>
  );
};

const Metric = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) => (
  <div className="min-w-0">
    <p className="text-[11px] font-medium text-neutral-500">{label}</p>
    <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-white">
      {value}
    </p>
    {hint && <p className="truncate text-[11px] text-neutral-500">{hint}</p>}
  </div>
);

/**
 * How long work takes from start to done: overall, and split into work the
 * person did by hand and work their bot did.
 */
const TimingCard = ({ points }: { points: WorkPoint[] }) => {
  const { all, hands, bot } = timingSummary(points);
  if (!points.length) return null;
  const Row = ({
    icon,
    label,
    s,
    tone,
  }: {
    icon: string;
    label: string;
    s: typeof hands;
    tone: string;
  }) => (
    <div className="flex items-center gap-2.5 py-1.5">
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full',
          tone,
        )}
      >
        <Icon name={icon} className="text-[14px]" />
      </span>
      <p className="min-w-0 flex-1 truncate text-xs text-neutral-300">
        {label}
        <span className="ml-1.5 tabular-nums text-neutral-500">
          {s.done}/{s.points} done
        </span>
      </p>
      <p className="shrink-0 text-xs font-semibold tabular-nums text-white">
        {s.typicalMs != null ? formatMs(s.typicalMs) : '–'}
      </p>
    </div>
  );
  return (
    <div className="grid gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:grid-cols-[180px_1fr]">
      <div>
        <p className="text-[11px] font-medium text-neutral-500">
          Typical time to finish
        </p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-white">
          {all.typicalMs != null ? formatMs(all.typicalMs) : '–'}
        </p>
        <p className="text-[11px] text-neutral-500">from start to done</p>
      </div>
      <div className="min-w-0 sm:border-l sm:border-white/[0.06] sm:pl-5">
        <Row
          icon="back_hand"
          label="Hands-on"
          s={hands}
          tone="bg-sky-400/15 text-sky-300"
        />
        <Row
          icon="smart_toy"
          label="By bot"
          s={bot}
          tone="bg-orange-400/15 text-orange-300"
        />
        {(bot.waitingMs >= 60000 || all.blockedMs >= 60000) && (
          <p className="mt-1 flex flex-wrap gap-x-3 pl-[34px] text-[11px]">
            {bot.waitingMs >= 60000 && (
              <span className="text-violet-300/80">
                Bot waited {formatMs(bot.waitingMs)} for input
              </span>
            )}
            {all.blockedMs >= 60000 && (
              <span className="text-rose-300/80">
                Blocked {formatMs(all.blockedMs)}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                    View                                    */
/* -------------------------------------------------------------------------- */

const PERIODS: { value: PeriodKind; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
];

type Mode = 'projects' | 'timeline';

const MODES: { value: Mode; label: string; icon: string }[] = [
  { value: 'projects', label: 'Projects', icon: 'folder_open' },
  { value: 'timeline', label: 'Timeline', icon: 'view_timeline' },
];

export const WorkView = ({
  data,
  period,
  onPeriod,
}: {
  data: WorkData | null;
  period: Period;
  onPeriod: (p: Period) => void;
}) => {
  const [mode, setMode] = useState<Mode>('projects');
  const groups = useMemo(() => (data ? groupWork(data) : []), [data]);
  const label = periodLabel(period);
  const isCurrent = periodOf(period.kind, dayjs()).from === period.from;

  const points = useMemo(() => data?.points ?? [], [data]);
  const activeDays = new Set(points.flatMap((p) => p.dates)).size;
  // On a single day: from the first point's start to the last one's end.
  const dayHours = useMemo(() => {
    if (period.kind !== 'day') return null;
    const timings = points
      .map((p) => timingOf(p))
      .filter(Boolean) as NonNullable<ReturnType<typeof timingOf>>[];
    const onDay = (ms: number) =>
      dayjs(ms).format('YYYY-MM-DD') === period.from;
    const starts = timings.map((t) => t.start).filter(onDay);
    const ends = timings.map((t) => t.end).filter(onDay);
    if (!starts.length || !ends.length) return null;
    return { start: Math.min(...starts), end: Math.max(...ends) };
  }, [points, period]);
  const periodDays = Math.min(
    dayjs().diff(dayjs(period.from), 'day') + 1,
    dayjs(period.to).diff(dayjs(period.from), 'day') + 1,
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Period */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => onPeriod(shiftPeriod(period, -1))}
            className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white"
          >
            <Icon name="chevron_left" className="text-[20px]" />
          </button>
          <button
            type="button"
            aria-label="Next"
            disabled={isCurrent}
            onClick={() => onPeriod(shiftPeriod(period, 1))}
            className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-30"
          >
            <Icon name="chevron_right" className="text-[20px]" />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="whitespace-nowrap text-lg font-semibold leading-tight tracking-tight text-white">
            {label.title}
          </h2>
          {label.range && (
            <p className="text-xs text-neutral-500">{label.range}</p>
          )}
        </div>
        <Segmented
          className="w-full sm:w-auto [&>button]:flex-1 [&>button]:justify-center"
          value={period.kind}
          onChange={(kind) => onPeriod(periodOf(kind, dayjs()))}
          options={PERIODS}
        />
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:grid-cols-4">
        <Metric
          label="Points"
          value={data ? points.length : '–'}
          hint={
            data && points.some((p) => p.byClaude)
              ? `${points.filter((p) => p.byClaude).length} by bot`
              : undefined
          }
        />
        <Metric
          label="Done"
          value={data ? points.filter(isDone).length : '–'}
          hint={
            data && points.length
              ? `${Math.round((points.filter(isDone).length / points.length) * 100)}% of points`
              : undefined
          }
        />
        <Metric
          label="Tasks closed"
          value={data ? data.doneTasks.length : '–'}
        />
        {period.kind === 'day' ? (
          <Metric
            label="At work"
            value={
              data && dayHours ? formatMs(dayHours.end - dayHours.start) : '–'
            }
            hint={
              dayHours
                ? `${dayjs(dayHours.start).format('HH:mm')} – ${dayjs(dayHours.end).format('HH:mm')}`
                : undefined
            }
          />
        ) : (
          <Metric
            label="Active days"
            value={data ? activeDays : '–'}
            hint={periodDays > 0 ? `of ${periodDays}` : undefined}
          />
        )}
      </div>

      {data && <TimingCard points={points} />}
      {data && <ShareBar groups={groups} />}

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          {mode === 'projects' ? 'By project' : 'When it happened'}
        </p>
        <Segmented value={mode} onChange={setMode} options={MODES} />
      </div>

      {!data ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl bg-white/[0.03]"
            />
          ))}
        </div>
      ) : !points.length && !data.doneTasks.length ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
          <p className="text-sm text-neutral-300">
            Nothing logged in this period
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
            Work points from the daily worklog and from your bot land here,
            sorted by project and task.
          </p>
          {data.isSelf && (
            <Link
              href={APP_ROUTES.userWorklogs}
              className="mt-4 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-200"
            >
              Write today’s worklog
            </Link>
          )}
        </div>
      ) : mode === 'projects' ? (
        <div className="flex flex-col gap-7">
          {groups.map((g, i) => (
            <CompanySection
              key={g.company?.id ?? 'unlinked'}
              group={g}
              openFirst={i === 0 ? 2 : 1}
            />
          ))}
        </div>
      ) : (
        <DayTimeline data={data} period={period} />
      )}

      {data && data.hiddenCount > 0 && (
        <p className="text-center text-[11px] text-neutral-600">
          {data.hiddenCount} more {data.hiddenCount === 1 ? 'point' : 'points'}{' '}
          in companies you are not part of.
        </p>
      )}
    </div>
  );
};
