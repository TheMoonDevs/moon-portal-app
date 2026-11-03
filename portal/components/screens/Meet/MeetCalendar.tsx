'use client';

import { useEffect, useMemo, useState } from 'react';

import { freeSlots } from '@/lib/meet/rules';
import {
  addDays,
  dateIn,
  formatTime,
  timezoneLabel,
  toMinutes,
  weekdayOf,
  zonedTime,
} from '@/lib/meet/time';
import { cn } from '@/lib/utils';
import { ACTIVE_MEET_STATUSES, MEET_BOOKING_STATUS } from '@/models/meet';

import { Icon } from '../Admin/shared/AdminUI';
import type { HostBooking } from './api';
import type { MeetSettings } from './AvailabilityEditor';

const HOUR_PX = 48;
const MINUTE = 60 * 1000;

/** Monday of the week `ymd` is in. */
const weekStartOf = (ymd: string) => addDays(ymd, -((weekdayOf(ymd) + 6) % 7));

const dayLabel = (ymd: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-GB', {
    ...options,
    timeZone: 'UTC',
  });

const hourLabel = (h: number) =>
  h === 0 || h === 24
    ? '12 am'
    : h === 12
      ? '12 pm'
      : h < 12
        ? `${h} am`
        : `${h - 12} pm`;

/** Phones get one day at a time; wider screens the whole week. */
const useIsPhone = () => {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return phone;
};

type Block = { from: number; to: number };
type Placed = HostBooking & {
  from: number;
  to: number;
  lane: number;
  lanes: number;
};

const BOOKING_STYLE: Partial<Record<MEET_BOOKING_STATUS, string>> = {
  PENDING:
    'border-amber-300/70 bg-amber-300/[0.16] text-amber-100 hover:bg-amber-300/25',
  PROPOSED:
    'border-sky-300/60 border-dashed bg-sky-400/[0.12] text-sky-100 hover:bg-sky-400/20',
  CONFIRMED: 'border-white bg-white text-neutral-950 hover:bg-neutral-200',
};

const LEGEND = [
  { label: 'Open', className: 'border-emerald-400/40 bg-emerald-400/[0.12]' },
  { label: 'Request', className: 'border-amber-300/70 bg-amber-300/[0.16]' },
  {
    label: 'New time sent',
    className: 'border-dashed border-sky-300/60 bg-sky-400/[0.12]',
  },
  { label: 'Confirmed', className: 'border-white bg-white' },
];

/**
 * The host's week: their meetings, and the open times a guest can still
 * book, worked out with the same rules as the booking link (and the
 * unsaved settings, so edits preview straight away).
 */
export const MeetCalendar = ({
  bookings,
  settings,
  selectedId,
  onSelect,
}: {
  bookings: HostBooking[];
  settings: MeetSettings;
  selectedId: string | null;
  onSelect: (bookingId: string) => void;
}) => {
  const tz = settings.timezone;
  const phone = useIsPhone();
  const [now, setNow] = useState(() => new Date());
  const today = dateIn(now, tz);
  const [weekStart, setWeekStart] = useState(() => weekStartOf(today));
  const [day, setDay] = useState(today);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Jump to a booking picked elsewhere (a notification, the sidebar).
  useEffect(() => {
    const booking = bookings.find((b) => b.id === selectedId);
    if (!booking) return;
    const ymd = dateIn(new Date(booking.start), tz);
    setWeekStart(weekStartOf(ymd));
    setDay(ymd);
  }, [selectedId, bookings, tz]);

  const week = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const shown = phone ? [week.includes(day) ? day : week[0]] : week;

  const active = useMemo(
    () =>
      bookings.filter((b) =>
        ACTIVE_MEET_STATUSES.includes(b.status as MEET_BOOKING_STATUS),
      ),
    [bookings],
  );

  // Open times, merged into blocks: ten back-to-back slots read as one.
  const openByDay = useMemo(() => {
    const slots = freeSlots(
      settings,
      active.map((b) => ({ start: b.start, end: b.end })),
      { now },
    );
    const out = new Map<string, { blocks: Block[]; count: number }>();
    const length = settings.durationMinutes * MINUTE;
    for (const slot of slots) {
      const start = new Date(slot).getTime();
      const key = dateIn(new Date(start), tz);
      const entry = out.get(key) ?? { blocks: [], count: 0 };
      const last = entry.blocks[entry.blocks.length - 1];
      if (last && start <= last.to) last.to = Math.max(last.to, start + length);
      else entry.blocks.push({ from: start, to: start + length });
      entry.count += 1;
      out.set(key, entry);
    }
    return out;
    // `now` only moves the notice cut-off; a minute late is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, active, today]);

  const bookingsByDay = useMemo(() => {
    const out = new Map<string, Placed[]>();
    for (const b of active) {
      const key = dateIn(new Date(b.start), tz);
      const list = out.get(key) ?? [];
      list.push({
        ...b,
        from: new Date(b.start).getTime(),
        to: new Date(b.end).getTime(),
        lane: 0,
        lanes: 1,
      });
      out.set(key, list);
    }
    // Side by side when two meetings overlap (two requests for one time).
    for (const list of Array.from(out.values())) {
      list.sort((a, b) => a.from - b.from);
      for (let i = 0; i < list.length; i += 1) {
        const clash = list.filter(
          (o, j) => j !== i && o.from < list[i].to && o.to > list[i].from,
        );
        list[i].lanes = clash.length + 1;
        list[i].lane = clash.filter((o) => list.indexOf(o) < i).length;
      }
    }
    return out;
  }, [active, tz]);

  // Hours shown: the working hours and anything booked this week, 8–6 at least.
  const [firstHour, lastHour] = useMemo(() => {
    let lo = 8;
    let hi = 18;
    for (const ranges of settings.weekly)
      for (const r of ranges) {
        const from = toMinutes(r.start);
        const to = toMinutes(r.end);
        if (from !== null) lo = Math.min(lo, Math.floor(from / 60));
        if (to !== null) hi = Math.max(hi, Math.ceil(to / 60));
      }
    for (const ymd of week)
      for (const b of bookingsByDay.get(ymd) ?? []) {
        const midnight = zonedTime(ymd, 0, tz).getTime();
        lo = Math.min(lo, Math.floor((b.from - midnight) / MINUTE / 60));
        hi = Math.max(hi, Math.ceil((b.to - midnight) / MINUTE / 60));
      }
    return [Math.max(0, lo), Math.min(24, hi)];
  }, [settings.weekly, week, bookingsByDay, tz]);

  const hoursCount = lastHour - firstHour;
  const top = (ymd: string, time: number) =>
    ((time - zonedTime(ymd, 0, tz).getTime()) / MINUTE / 60 - firstHour) *
    HOUR_PX;

  const lastBookable = addDays(today, settings.maxDaysAhead);
  const daysOff = new Set(settings.daysOff);
  const weekOpen = week.reduce(
    (n, ymd) => n + (openByDay.get(ymd)?.count ?? 0),
    0,
  );
  const weekMeetings = week.reduce(
    (n, ymd) => n + (bookingsByDay.get(ymd)?.length ?? 0),
    0,
  );

  const move = (weeks: number) => {
    const next = addDays(weekStart, weeks * 7);
    setWeekStart(next);
    setDay(weeks === 0 ? today : next);
  };
  const goToday = () => {
    setWeekStart(weekStartOf(today));
    setDay(today);
  };

  const rangeLabel = `${dayLabel(week[0], { day: 'numeric', month: 'short' })} – ${dayLabel(week[6], { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-neutral-900/40">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/[0.07] px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => move(-1)}
            className="flex size-8 items-center justify-center rounded-lg text-[20px] text-neutral-300 hover:bg-white/10"
          >
            <Icon name="chevron_left" />
          </button>
          <button
            type="button"
            aria-label="Next week"
            onClick={() => move(1)}
            className="flex size-8 items-center justify-center rounded-lg text-[20px] text-neutral-300 hover:bg-white/10"
          >
            <Icon name="chevron_right" />
          </button>
          <button
            type="button"
            onClick={goToday}
            disabled={weekStart === weekStartOf(today) && day === today}
            className="ml-1 h-8 rounded-lg border border-white/10 px-3 text-xs font-medium text-neutral-200 hover:bg-white/[0.06] disabled:opacity-40"
          >
            Today
          </button>
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white">{rangeLabel}</h2>
          <p className="text-xs text-neutral-500">
            {weekMeetings} meeting{weekMeetings === 1 ? '' : 's'} · {weekOpen}{' '}
            open slot{weekOpen === 1 ? '' : 's'} · times in{' '}
            {tz.replace(/_/g, ' ')} ({timezoneLabel(tz)})
          </p>
        </div>
        <ul className="ml-auto hidden flex-wrap items-center gap-3 lg:flex">
          {LEGEND.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-1.5 text-[11px] text-neutral-400"
            >
              <span
                className={cn('size-2.5 rounded-[3px] border', item.className)}
              />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      {/* Day picker on phones */}
      {phone && (
        <div className="grid grid-cols-7 gap-1 border-b border-white/[0.07] p-2">
          {week.map((ymd) => {
            const count =
              (bookingsByDay.get(ymd)?.length ?? 0) +
              (openByDay.get(ymd)?.count ? 1 : 0);
            const selected = ymd === shown[0];
            return (
              <button
                key={ymd}
                type="button"
                onClick={() => setDay(ymd)}
                className={cn(
                  'flex flex-col items-center rounded-lg py-1.5 text-[11px]',
                  selected
                    ? 'bg-white text-neutral-950'
                    : 'text-neutral-400 hover:bg-white/[0.06]',
                )}
              >
                {dayLabel(ymd, { weekday: 'narrow' })}
                <span
                  className={cn(
                    'text-sm font-semibold',
                    !selected && ymd === today && 'text-emerald-300',
                    !selected && ymd !== today && 'text-neutral-100',
                  )}
                >
                  {dayLabel(ymd, { day: 'numeric' })}
                </span>
                <span className="mt-0.5 flex h-1 gap-0.5">
                  {(bookingsByDay.get(ymd) ?? []).slice(0, 3).map((b) => (
                    <span
                      key={b.id}
                      className={cn(
                        'size-1 rounded-full',
                        b.status === MEET_BOOKING_STATUS.PENDING
                          ? 'bg-amber-300'
                          : selected
                            ? 'bg-neutral-900'
                            : 'bg-white',
                      )}
                    />
                  ))}
                  {count > 0 && !bookingsByDay.get(ymd)?.length && (
                    <span className="size-1 rounded-full bg-emerald-400" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Day headers */}
      {!phone && (
        <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-b border-white/[0.07]">
          <span />
          {week.map((ymd) => {
            const open = openByDay.get(ymd)?.count ?? 0;
            return (
              <div
                key={ymd}
                className="flex flex-col items-center gap-0.5 border-l border-white/[0.05] py-2"
              >
                <span className="text-[11px] uppercase tracking-wide text-neutral-500">
                  {dayLabel(ymd, { weekday: 'short' })}
                </span>
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full text-sm font-semibold',
                    ymd === today
                      ? 'bg-white text-neutral-950'
                      : 'text-neutral-100',
                  )}
                >
                  {dayLabel(ymd, { day: 'numeric' })}
                </span>
                <span className="h-3.5 text-[10px] text-neutral-500">
                  {daysOff.has(ymd) ? 'Day off' : open ? `${open} open` : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid */}
      <div
        className={cn(
          'grid',
          phone
            ? 'grid-cols-[48px_minmax(0,1fr)]'
            : 'grid-cols-[52px_repeat(7,minmax(0,1fr))]',
        )}
      >
        <div className="relative" style={{ height: hoursCount * HOUR_PX }}>
          {Array.from({ length: hoursCount }, (_, i) => (
            <span
              key={i}
              className="absolute right-2 -translate-y-1/2 text-[10px] text-neutral-500"
              style={{ top: i * HOUR_PX }}
            >
              {i === 0 ? '' : hourLabel(firstHour + i)}
            </span>
          ))}
        </div>
        {shown.map((ymd) => {
          const past = ymd < today;
          const closed =
            daysOff.has(ymd) ||
            ymd > lastBookable ||
            settings.weekly[weekdayOf(ymd)]?.length === 0;
          const open = openByDay.get(ymd);
          return (
            <div
              key={ymd}
              className={cn(
                'relative border-l border-white/[0.05]',
                (past || closed) &&
                  'bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgba(255,255,255,0.025)_6px_12px)]',
              )}
              style={{ height: hoursCount * HOUR_PX }}
            >
              {Array.from({ length: hoursCount }, (_, i) => (
                <span
                  key={i}
                  className="absolute inset-x-0 border-t border-white/[0.05]"
                  style={{ top: i * HOUR_PX }}
                />
              ))}

              {phone && daysOff.has(ymd) && (
                <p className="absolute inset-x-0 top-3 text-center text-xs text-neutral-500">
                  Day off
                </p>
              )}

              {open?.blocks.map((block) => (
                <div
                  key={block.from}
                  title={`Open ${formatTime(new Date(block.from), tz)} – ${formatTime(new Date(block.to), tz)}`}
                  className="absolute inset-x-1 overflow-hidden rounded-md border border-emerald-400/30 bg-emerald-400/[0.08] px-1.5 py-1"
                  style={{
                    top: top(ymd, block.from) + 1,
                    height: Math.max(
                      ((block.to - block.from) / MINUTE / 60) * HOUR_PX - 2,
                      14,
                    ),
                  }}
                >
                  <p className="text-[10px] font-medium leading-tight text-emerald-300/90">
                    <span className="block">Open</span>
                    {block.to - block.from >= 60 * MINUTE && (
                      <span className="block opacity-80">
                        {formatTime(new Date(block.from), tz)} –{' '}
                        {formatTime(new Date(block.to), tz)}
                      </span>
                    )}
                  </p>
                </div>
              ))}

              {(bookingsByDay.get(ymd) ?? []).map((b) => {
                const height = Math.max(
                  ((b.to - b.from) / MINUTE / 60) * HOUR_PX - 2,
                  22,
                );
                const width = 100 / b.lanes;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onSelect(b.id)}
                    title={`${b.guestName} · ${formatTime(b.start, tz)} – ${formatTime(b.end, tz)}`}
                    className={cn(
                      'absolute z-10 overflow-hidden rounded-md border px-1.5 py-1 text-left shadow-sm shadow-black/40 transition-colors',
                      BOOKING_STYLE[b.status],
                      b.to < now.getTime() && 'opacity-50',
                      b.id === selectedId &&
                        'ring-2 ring-white ring-offset-2 ring-offset-neutral-950',
                    )}
                    style={{
                      top: top(ymd, b.from) + 1,
                      height,
                      left: `calc(${b.lane * width}% + 3px)`,
                      width: `calc(${width}% - 6px)`,
                    }}
                  >
                    <p className="truncate text-[11px] font-semibold leading-tight">
                      {b.guestName}
                    </p>
                    {height >= 34 && (
                      <p className="truncate text-[10px] leading-tight opacity-80">
                        {formatTime(b.start, tz)}
                        {b.status === MEET_BOOKING_STATUS.PENDING &&
                          ' · needs answer'}
                      </p>
                    )}
                  </button>
                );
              })}

              {ymd === today &&
                top(ymd, now.getTime()) >= 0 &&
                top(ymd, now.getTime()) <= hoursCount * HOUR_PX && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                    style={{ top: top(ymd, now.getTime()) }}
                  >
                    <span className="-ml-1 size-2 rounded-full bg-rose-400" />
                    <span className="h-px flex-1 bg-rose-400" />
                  </div>
                )}
            </div>
          );
        })}
      </div>

      {phone && (
        <ul className="flex flex-wrap items-center gap-3 border-t border-white/[0.07] px-4 py-2.5">
          {LEGEND.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-1.5 text-[11px] text-neutral-400"
            >
              <span
                className={cn('size-2.5 rounded-[3px] border', item.className)}
              />
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
