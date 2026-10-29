'use client';

import dayjs from 'dayjs';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { sectionLines } from '@/lib/worklogs/timeline';
import type { WorkLogs } from '@/models/worklogs';
import { APP_ROUTES } from '@/utils/constants/appInfo';

import { Icon } from '../../Admin/shared/AdminUI';
import type { TaskRowStatus } from './sheetParts';
import { StatusIcon } from './sheetParts';

/*
 * The days of a month beside the open day: as cards with each day's first
 * points, or as a calendar. Arrows step through the months. On a phone a day
 * opens on its own page.
 */

type Line = { text: string; status: TaskRowStatus };
type View = 'list' | 'calendar';

const VIEW_KEY = 'worklogs.daysView';
const fmt = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');

const dayHref = (date: string, log?: WorkLogs) =>
  `${APP_ROUTES.userWorklogs}/${log?.id || 'new'}?logType=dayLog&date=${date}`;

/** How a day looks: open, today, written, missed or still to come. */
const dayState = (date: string, lines: number) => {
  const today = fmt(dayjs());
  if (date === today) return 'today';
  if (date > today) return lines ? 'planned' : 'ahead';
  return lines ? 'logged' : 'missed';
};

const STATE_STYLE = {
  today: {
    border: 'border-sky-400/70',
    icon: 'radio_button_checked',
    tone: 'animate-pulse text-sky-400 auto-light:text-sky-700',
  },
  planned: {
    border: 'border-emerald-500/40',
    icon: 'checklist',
    tone: 'text-emerald-400 auto-light:text-emerald-600',
  },
  ahead: {
    border: 'border-white/[0.08] auto-light:border-black/10',
    icon: 'add_box',
    tone: 'text-neutral-500',
  },
  logged: {
    border: 'border-emerald-500/40',
    icon: 'checklist',
    tone: 'text-emerald-400 auto-light:text-emerald-600',
  },
  missed: {
    border: 'border-rose-400/40',
    icon: 'pending',
    tone: 'text-rose-400 auto-light:text-rose-700',
  },
} as const;

const DayCard = ({
  date,
  log,
  lines,
  selected,
  onPick,
  opensPage,
}: {
  date: string;
  log?: WorkLogs;
  lines: Line[];
  selected: boolean;
  onPick: () => void;
  opensPage: boolean;
}) => {
  const state = STATE_STYLE[dayState(date, lines.length)];
  const className = cn(
    'flex min-h-[132px] flex-col gap-2 rounded-xl border p-3 text-left transition-colors',
    selected
      ? 'border-white bg-white/[0.06] auto-light:border-neutral-900 auto-light:bg-black/[0.06]'
      : cn(
          state.border,
          'hover:bg-white/[0.03] auto-light:hover:bg-black/[0.03]',
        ),
  );
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'text-xs',
            selected
              ? 'font-bold text-white auto-light:text-neutral-950'
              : 'text-neutral-300 auto-light:text-neutral-700',
          )}
        >
          {dayjs(date).format('MMMM DD')}
          <span className="text-neutral-500">
            {' '}
            - {dayjs(date).format('dddd')}
          </span>
        </span>
        <Icon name={state.icon} className={cn('text-[16px]', state.tone)} />
      </div>
      {lines.length ? (
        <ul className="flex flex-col gap-0.5">
          {lines.slice(0, 4).map((line, i) => (
            <li
              key={i}
              className="flex min-w-0 items-start gap-1.5 text-[12px] leading-[18px] text-neutral-400 auto-light:text-neutral-500"
            >
              <StatusIcon status={line.status} className="mt-px text-[13px]" />
              <span className="line-clamp-1 min-w-0 flex-1">{line.text}</span>
            </li>
          ))}
          {lines.length > 4 && (
            <li className="pl-5 text-[11px] text-neutral-600 auto-light:text-neutral-400">
              +{lines.length - 4} more
            </li>
          )}
        </ul>
      ) : (
        <p className="text-xs text-neutral-600 auto-light:text-neutral-400">
          Tap to jot down your logs…
        </p>
      )}
    </>
  );
  return opensPage ? (
    <Link href={dayHref(date, log)} className={className} data-date={date}>
      {body}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onPick}
      className={className}
      data-date={date}
    >
      {body}
    </button>
  );
};

const Calendar = ({
  month,
  linesOf,
  byDate,
  selected,
  onPick,
  opensPage,
}: {
  month: dayjs.Dayjs;
  linesOf: (date: string) => Line[];
  byDate: Map<string, WorkLogs>;
  selected: string;
  onPick: (date: string) => void;
  opensPage: boolean;
}) => {
  // Weeks start on Monday.
  const start = month.subtract((month.day() + 6) % 7, 'day');
  const weeks = Math.ceil((((month.day() + 6) % 7) + month.daysInMonth()) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => start.add(i, 'day'));
  return (
    <div>
      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium uppercase tracking-wider text-neutral-500">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const date = fmt(d);
          const inMonth = d.isSame(month, 'month');
          const lines = linesOf(date);
          const done = lines.filter((l) => l.status === 'done').length;
          const state = dayState(date, lines.length);
          const isSelected = date === selected;
          const className = cn(
            'flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border text-sm tabular-nums transition-colors',
            !inMonth && 'opacity-30',
            isSelected
              ? 'border-white bg-white font-semibold text-neutral-950 auto-light:border-neutral-900 auto-light:bg-neutral-900 auto-light:text-white'
              : cn(
                  'hover:bg-white/[0.05] auto-light:hover:bg-black/[0.05]',
                  state === 'today'
                    ? 'border-sky-400/70 text-sky-300 auto-light:text-sky-700'
                    : 'border-transparent text-neutral-300 auto-light:text-neutral-700',
                ),
          );
          const body = (
            <>
              {d.date()}
              <span
                className={cn(
                  'h-1 w-4 rounded-full',
                  !lines.length
                    ? state === 'missed' && inMonth
                      ? 'bg-rose-400/40'
                      : 'bg-transparent'
                    : isSelected
                      ? 'bg-neutral-950/40 auto-light:bg-white/50'
                      : state === 'planned' || state === 'ahead'
                        ? 'bg-sky-400/70'
                        : 'bg-emerald-400/70',
                )}
              />
            </>
          );
          const title = lines.length
            ? `${lines.length} points · ${done} done`
            : undefined;
          return opensPage ? (
            <Link
              key={date}
              href={dayHref(date, byDate.get(date))}
              className={className}
              title={title}
            >
              {body}
            </Link>
          ) : (
            <button
              key={date}
              type="button"
              onClick={() => onPick(date)}
              className={className}
              title={title}
            >
              {body}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-3 rounded-full bg-emerald-400/70" /> Logged
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-3 rounded-full bg-sky-400/70" /> Planned
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-3 rounded-full bg-rose-400/40" /> Nothing
          written
        </span>
      </div>
    </div>
  );
};

export const DayList = ({
  month,
  onMonth,
  byDate,
  loading,
  selected,
  liveLines,
  onPick,
  opensPage,
}: {
  month: dayjs.Dayjs;
  onMonth: (month: dayjs.Dayjs) => void;
  byDate: Map<string, WorkLogs>;
  loading: boolean;
  selected: string;
  /** The open day as it is being written, or null while it loads. */
  liveLines: Line[] | null;
  onPick: (date: string) => void;
  opensPage: boolean;
}) => {
  const [view, setView] = useState<View>('list');
  useEffect(() => {
    try {
      if (localStorage.getItem(VIEW_KEY) === 'calendar') setView('calendar');
    } catch {
      // No storage: the list it is.
    }
  }, []);
  const changeView = (next: View) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Not remembered, which is fine.
    }
  };

  const linesOf = (date: string): Line[] =>
    date === selected && liveLines
      ? liveLines
      : sectionLines(byDate.get(date)?.works).map((l) => ({
          text: l.text,
          status: l.status,
        }));

  const today = dayjs().startOf('day');
  // Months up to the one two weeks ahead, where planning reaches.
  const lastMonth = today.add(14, 'day').startOf('month');
  const canNext = month.isBefore(lastMonth, 'month');
  const thisMonth = month.isSame(today, 'month');

  // Up to two days ahead (or a planned day further on), newest first.
  const days = Array.from({ length: month.daysInMonth() }, (_, i) =>
    month.date(i + 1),
  )
    .filter((d) => {
      const date = fmt(d);
      return (
        !d.isAfter(today.add(2, 'day'), 'day') ||
        date === selected ||
        sectionLines(byDate.get(date)?.works).length > 0
      );
    })
    .reverse();

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-date="${selected}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selected, view]);

  return (
    <div>
      <div className="mb-3 flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5 auto-light:border-black/10 auto-light:bg-black/[0.03]">
        {(
          [
            ['list', 'Days', 'view_agenda'],
            ['calendar', 'Calendar', 'calendar_month'],
          ] as const
        ).map(([value, label, icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => changeView(value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors',
              view === value
                ? 'bg-white text-neutral-950 shadow-sm auto-light:bg-neutral-900 auto-light:text-white'
                : 'text-neutral-400 hover:text-neutral-100 auto-light:text-neutral-500 auto-light:hover:text-neutral-900',
            )}
          >
            <Icon name={icon} className="text-[15px]" />
            {label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onMonth(month.subtract(1, 'month'))}
          className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white auto-light:text-neutral-500 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-950"
        >
          <Icon name="chevron_left" className="text-[20px]" />
        </button>
        <h2 className="flex-1 text-center text-sm font-semibold text-white auto-light:text-neutral-950">
          {month.format('MMMM YYYY')}
        </h2>
        {!thisMonth && (
          <button
            type="button"
            onClick={() => onMonth(today.startOf('month'))}
            className="rounded-md px-2 py-1 text-[11px] text-neutral-400 hover:bg-white/[0.06] hover:text-white auto-light:text-neutral-500 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-950"
          >
            This month
          </button>
        )}
        <button
          type="button"
          aria-label="Next month"
          disabled={!canNext}
          onClick={() => onMonth(month.add(1, 'month'))}
          className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent auto-light:text-neutral-500 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-950"
        >
          <Icon name="chevron_right" className="text-[20px]" />
        </button>
      </div>

      {view === 'calendar' ? (
        <Calendar
          month={month}
          linesOf={linesOf}
          byDate={byDate}
          selected={selected}
          onPick={onPick}
          opensPage={opensPage}
        />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[132px] animate-pulse rounded-xl bg-white/[0.04] auto-light:bg-black/[0.04]"
            />
          ))}
        </div>
      ) : days.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-neutral-500">
          Nothing written this month.
        </p>
      ) : (
        <div ref={listRef} className="grid grid-cols-2 gap-2.5">
          {days.map((d) => {
            const date = fmt(d);
            return (
              <DayCard
                key={date}
                date={date}
                log={byDate.get(date)}
                lines={linesOf(date)}
                selected={!opensPage && date === selected}
                onPick={() => onPick(date)}
                opensPage={opensPage}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
