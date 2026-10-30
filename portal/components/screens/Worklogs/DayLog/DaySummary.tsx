'use client';

import dayjs from 'dayjs';

import { cn } from '@/lib/utils';
import { POINT_STATUSES } from '@/lib/worklogs/timeline';

import { Icon } from '../../Admin/shared/AdminUI';
import type { PlaceCount } from './ProjectSummary';
import type { TaskRowStatus } from './sheetParts';
import {
  movedOn,
  PlaceLogo,
  placeOf,
  rowIcon,
  rowStatus,
  StateDot,
  StatusIcon,
} from './sheetParts';
import type { Day, DayPoint, DayTask } from './useDay';

/*
 * The day as a summary to read, with nothing to change: each project's
 * tasks with their status, when they ran, and every point under them.
 */

const STATUS_LABEL: Record<Exclude<TaskRowStatus, null>, string> = {
  ...Object.fromEntries(
    Object.entries(POINT_STATUSES).map(([k, v]) => [k, v.label]),
  ),
  archived: 'Archived',
} as Record<Exclude<TaskRowStatus, null>, string>;

const time = (iso?: string | null) => (iso ? dayjs(iso).format('HH:mm') : '');

const PointLine = ({ point }: { point: DayPoint }) => (
  <li className="flex items-start gap-2 py-0.5 text-[13px] leading-5">
    <span className="w-10 shrink-0 pt-px text-[11px] tabular-nums text-neutral-500">
      {time(point.at)}
    </span>
    {point.status ? (
      <StatusIcon status={point.status} className="mt-[3px] text-[14px]" />
    ) : (
      <span className="mx-1.5 mt-[9px] size-1 shrink-0 rounded-full bg-neutral-600 auto-light:bg-neutral-400" />
    )}
    <span className="min-w-0 flex-1 text-neutral-300 auto-light:text-neutral-700">
      {point.text || (point.status ? POINT_STATUSES[point.status].label : '')}
      {point.status && point.text && (
        <span className="ml-1.5 text-[11px] text-neutral-500">
          · {POINT_STATUSES[point.status].label}
        </span>
      )}
    </span>
    <span className="shrink-0 text-[11px] text-neutral-500">
      {point.by === 'person' ? 'You' : 'Claude'}
    </span>
  </li>
);

const TaskBlock = ({ task, day }: { task: DayTask; day: Day }) => {
  const status = rowStatus(task, day.points, day.date);
  const moved = movedOn(task, day.date, day.today);
  const points = day.points.filter((p) => p.taskId === task.id);
  const facts: string[] = [];
  if (moved) facts.push('Moved on to a later day');
  else if (status) facts.push(STATUS_LABEL[status]);
  else facts.push('To do');
  if (task.forDate && task.forDate < day.date)
    facts.push(`From ${dayjs(task.forDate).format('ddd D MMM')}`);
  if (task.forDate && task.forDate > day.date)
    facts.push(`Planned for ${dayjs(task.forDate).format('ddd D MMM')}`);
  if (task.madeBy && task.madeBy !== 'person') facts.push('Added by Claude');
  if (task.size === 'MAJOR') facts.push('Major task');
  if (task.startedAt) facts.push(`Started ${time(task.startedAt)}`);
  if (task.status === 'DONE' && task.completedAt)
    facts.push(
      `Finished ${dayjs(task.completedAt).format(
        dayjs(task.completedAt).isSame(dayjs(day.date), 'day')
          ? 'HH:mm'
          : 'ddd D MMM HH:mm',
      )}`,
    );
  return (
    <div className="px-2 py-1.5">
      <div className="flex items-start gap-2.5">
        <span className="mt-[3px] text-[18px]">
          {moved ? (
            <Icon
              name="arrow_circle_right"
              className="text-neutral-600 auto-light:text-neutral-400"
            />
          ) : (
            <StatusIcon status={rowIcon(status)} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-6 text-white auto-light:text-neutral-950">
            {task.title}
            {!moved && <StateDot status={status} />}
          </p>
          <p className="text-[11px] text-neutral-500">{facts.join(' · ')}</p>
        </div>
      </div>
      {points.length > 0 && (
        <ul className="ml-[13px] mt-1 border-l border-white/[0.07] pl-3 auto-light:border-black/10">
          {points.map((p) => (
            <PointLine key={p.id} point={p} />
          ))}
        </ul>
      )}
    </div>
  );
};

export const DaySummary = ({
  day,
  tasks,
  counts,
}: {
  day: Day;
  tasks: DayTask[];
  counts: PlaceCount[];
}) => {
  const real = tasks.filter((t) => !t.draft && t.title.trim());
  if (!real.length)
    return (
      <p className="p-2 text-sm text-neutral-500">
        Nothing on this day to sum up.
      </p>
    );
  const done = real.filter(
    (t) => rowStatus(t, day.points, day.date) === 'done',
  ).length;
  const pointCount = day.points.filter((p) =>
    real.some((t) => t.id === p.taskId),
  ).length;
  return (
    <div className="flex flex-col gap-3">
      <p className="px-2 pt-1 text-xs text-neutral-500">
        {done} of {real.length} task{real.length === 1 ? '' : 's'} done ·{' '}
        {pointCount} point{pointCount === 1 ? '' : 's'} logged
      </p>
      {counts.map(({ place, done: placeDone, total }) => {
        const own = real.filter(
          (t) => placeOf(t, day.projects, day.companies).key === place.key,
        );
        if (!own.length) return null;
        return (
          <section key={place.key}>
            <div
              className={cn(
                'flex items-center gap-2 px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500',
              )}
            >
              <PlaceLogo place={place} />
              <span className="truncate">{place.name}</span>
              <span className="font-normal normal-case tabular-nums tracking-normal">
                {placeDone}/{total} done
              </span>
            </div>
            {own.map((t) => (
              <TaskBlock key={t.id} task={t} day={day} />
            ))}
          </section>
        );
      })}
    </div>
  );
};
