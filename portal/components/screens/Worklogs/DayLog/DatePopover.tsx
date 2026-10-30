'use client';

import * as Popover from '@radix-ui/react-popover';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

import { Icon } from '../../Admin/shared/AdminUI';

/*
 * Picks the day a task is for: the near days in one click (tomorrow, next
 * week, next month), any other on a small month calendar, or none.
 */

const fmt = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');

export type QuickDay = { label: string; date: string };

/** Tomorrow, the day after, next Monday and the 1st of next month. */
export function quickDays(from = dayjs()): QuickDay[] {
  const today = from.startOf('day');
  const monday = today.add((8 - today.day()) % 7 || 7, 'day');
  return [
    { label: 'Tomorrow', date: fmt(today.add(1, 'day')) },
    { label: 'Day after', date: fmt(today.add(2, 'day')) },
    { label: 'Next week', date: fmt(monday) },
    { label: 'Next month', date: fmt(today.add(1, 'month').startOf('month')) },
  ];
}

export const shortDay = (date: string) => {
  const d = dayjs(date);
  const diff = d.diff(dayjs().startOf('day'), 'day');
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.format(d.isSame(dayjs(), 'year') ? 'ddd D MMM' : 'D MMM YYYY');
};

const MonthGrid = ({
  value,
  onPick,
}: {
  value: string | null;
  onPick: (date: string) => void;
}) => {
  const [month, setMonth] = useState(() =>
    dayjs(value ?? undefined).startOf('month'),
  );
  const today = fmt(dayjs());
  // Weeks start on Monday.
  const start = month.subtract((month.day() + 6) % 7, 'day');
  const weeks = Math.ceil((((month.day() + 6) % 7) + month.daysInMonth()) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => start.add(i, 'day'));
  const nav =
    'flex size-7 items-center justify-center rounded-md text-neutral-400 hover:bg-white/[0.06] hover:text-white auto-light:text-neutral-500 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-950';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between px-1">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setMonth((m) => m.subtract(1, 'month'))}
          className={nav}
        >
          <Icon name="chevron_left" className="text-[18px]" />
        </button>
        <span className="text-xs font-semibold text-neutral-200 auto-light:text-neutral-800">
          {month.format('MMMM YYYY')}
        </span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setMonth((m) => m.add(1, 'month'))}
          className={nav}
        >
          <Icon name="chevron_right" className="text-[18px]" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-medium uppercase text-neutral-500">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d) => {
          const date = fmt(d);
          return (
            <button
              key={date}
              type="button"
              onClick={() => onPick(date)}
              className={cn(
                'flex h-8 items-center justify-center rounded-md text-xs tabular-nums transition-colors',
                !d.isSame(month, 'month') && 'opacity-30',
                date === value
                  ? 'bg-white font-semibold text-neutral-950 auto-light:bg-neutral-900 auto-light:text-white'
                  : cn(
                      'hover:bg-white/[0.08] auto-light:hover:bg-black/[0.06]',
                      date === today
                        ? 'font-semibold text-sky-300 auto-light:text-sky-700'
                        : 'text-neutral-300 auto-light:text-neutral-700',
                    ),
              )}
            >
              {d.date()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/** The quick days and the calendar, for inside another popover or menu. */
export const DatePanel = ({
  value,
  onPick,
  extra = [],
  clearable = true,
}: {
  value: string | null;
  onPick: (date: string | null) => void;
  /** Days to offer above the usual ones, e.g. the day open on the page. */
  extra?: QuickDay[];
  clearable?: boolean;
}) => {
  // The usual days always show; an extra one only when it is not one of them.
  const usual = quickDays();
  const seen = new Set(usual.map((o) => o.date));
  const options = [
    ...extra.filter((o) => {
      if (seen.has(o.date)) return false;
      seen.add(o.date);
      return true;
    }),
    ...usual,
  ];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col">
        {options.map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => onPick(o.date)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-white/[0.06] auto-light:hover:bg-black/[0.06]',
              o.date === value && 'bg-white/[0.06] auto-light:bg-black/[0.06]',
            )}
          >
            <span className="flex-1">{o.label}</span>
            <span className="text-xs tabular-nums text-neutral-500">
              {dayjs(o.date).format('ddd D MMM')}
            </span>
          </button>
        ))}
        {clearable && value && (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-neutral-400 hover:bg-white/[0.06] auto-light:text-neutral-500 auto-light:hover:bg-black/[0.06]"
          >
            <span className="flex-1">No date</span>
            <Icon name="event_busy" className="text-[16px]" />
          </button>
        )}
      </div>
      <div className="border-t border-white/[0.07] pt-2 auto-light:border-black/10">
        <MonthGrid value={value} onPick={onPick} />
      </div>
    </div>
  );
};

/**
 * A trigger that opens the day picker. `autoTheme` follows the device's
 * light or dark setting, as the worklog page does; without it the popup is
 * dark, for the dark screens.
 */
export const DatePopover = ({
  value,
  onPick,
  trigger,
  extra,
  clearable,
  autoTheme = true,
  align = 'end',
}: {
  value: string | null;
  onPick: (date: string | null) => void;
  trigger: ReactNode;
  extra?: QuickDay[];
  clearable?: boolean;
  autoTheme?: boolean;
  align?: 'start' | 'center' | 'end';
}) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            autoTheme && 'auto-theme',
            'z-[1300] w-64 rounded-xl border border-white/10 bg-neutral-900 p-1.5 text-neutral-200 shadow-2xl shadow-black/50 auto-light:border-black/10 auto-light:bg-white auto-light:text-neutral-800 auto-light:shadow-black/10',
          )}
        >
          <DatePanel
            value={value}
            extra={extra}
            clearable={clearable}
            onPick={(date) => {
              setOpen(false);
              onPick(date);
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

/** A day as a small stacked badge: the date big, the month small. */
export const DateBadge = ({
  date,
  className,
}: {
  date: string;
  className?: string;
}) => {
  const d = dayjs(date);
  return (
    <span
      className={cn(
        'flex w-8 flex-col items-center tabular-nums leading-none',
        className,
      )}
    >
      <span className="text-[13px] font-semibold">{d.date()}</span>
      <span className="mt-px text-[9px] font-medium uppercase tracking-wide opacity-70">
        {d.format('MMM')}
      </span>
    </span>
  );
};
