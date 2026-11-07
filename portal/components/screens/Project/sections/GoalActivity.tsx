'use client';

import type { Task } from '@db/client';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { goalRule, runsOn } from '@/lib/workspace/projects';
import type { ProjectGoal } from '@/models/workspace';

import { Icon } from '../../Admin/shared/AdminUI';

/*
 * A goal's last few months, one square a day like a contribution graph:
 * the brighter, the more of its tasks were done that day. A day the goal
 * missed (an overdue task, or one moved on to another day) is red; days
 * with work still planned are outlined. Hovering (or tapping) a square
 * opens a small card about that day; ticking it is a button on the card,
 * never the hover itself.
 */

const WEEKS = 20;
/** Weeks shown ahead, to tick upcoming days done, when days can be ticked. */
const AHEAD = 4;
const ROWS = ['Mon', '', 'Wed', '', 'Fri', '', ''];
const LEVELS = [0.3, 0.55, 0.8, 1];

type DayCell = {
  day: string;
  done: number;
  missed: number;
  planned: number;
  future: boolean;
};

/** The day card's width, kept inside the graph. */
const CARD_WIDTH = 190;

type Open = { day: string; x: number; y: number };

const dayOf = (value?: string | Date | null) =>
  value ? dayjs(value).format('YYYY-MM-DD') : null;

export const GoalActivity = ({
  goal,
  tasks,
  color,
  className,
  onTick,
  onTickUntil,
}: {
  goal: ProjectGoal;
  tasks: Task[];
  color: string;
  className?: string;
  /** Ticks a day on (done) or off; days can be clicked when given. */
  onTick?: (day: string, done: boolean) => Promise<void>;
  /** Marks every day from today up to `day` done (an upcoming day's click). */
  onTickUntil?: (day: string) => Promise<void>;
}) => {
  const ahead = onTickUntil ? AHEAD : 0;
  /** A day the goal has a task for, as its schedule says. */
  const rule = goalRule(goal, goal.target);
  const isRunDay = (day: string) => runsOn(rule, day);
  const [open, setOpen] = useState<Open | null>(null);
  const [ticking, setTicking] = useState<string | null>(null);
  /** Hovering "done up to here" previews the days it would tick. */
  const [until, setUntil] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const today = dayjs().format('YYYY-MM-DD');
  const target = goal.kind === 'target';

  /** Hovering previews a day's card; clicking a square pins it open. */
  const [pinned, setPinned] = useState(false);
  const close = () => {
    setOpen(null);
    setPinned(false);
    setUntil(null);
  };

  // A pinned card closes on a click elsewhere, or Escape.
  useEffect(() => {
    if (!pinned) return;
    const away = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) close();
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [pinned]);

  /** Opens the card above a square, kept inside the graph's width. */
  const show = (c: DayCell, el: HTMLElement, pin = false) => {
    if (pinned && !pin) return;
    const box = wrap.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!box) return;
    const half = CARD_WIDTH / 2;
    const center = r.left - box.left + r.width / 2;
    setOpen({
      day: c.day,
      x: Math.min(Math.max(center, half), Math.max(half, box.width - half)),
      y: r.top - box.top,
    });
    setPinned(pin);
    setUntil(null);
  };

  const run = (day: string, job: Promise<void>) => {
    setTicking(day);
    close();
    job.finally(() => setTicking(null));
  };

  const { weeks, done, missed } = useMemo(() => {
    const count = new Map<string, DayCell>();
    const cell = (day: string) => {
      let c = count.get(day);
      if (!c) {
        c = { day, done: 0, missed: 0, planned: 0, future: day > today };
        count.set(day, c);
      }
      return c;
    };
    for (const t of tasks) {
      if (t.goalId !== goal.id) continue;
      if (t.status === 'DONE') {
        // A target counts the day the work was done; a repeating goal the
        // day it was for, as its periods do.
        const day = target
          ? (dayOf(t.completedAt) ?? t.forDate)
          : (t.forDate ?? dayOf(t.completedAt));
        if (day) cell(day).done += 1;
      } else if (t.goalMissed?.day) {
        cell(t.goalMissed.day).missed += 1;
      } else if (
        t.forDate &&
        ['TODO', 'IN_PROGRESS', 'IN_REVIEW'].includes(t.status)
      ) {
        // Missed once its last day went by (a Monday batch due Sunday is
        // still on during the week).
        const last = (t.dueDate ? String(t.dueDate) : t.forDate).slice(0, 10);
        if (last < today) cell(t.forDate).missed += 1;
        else cell(t.forDate).planned += 1;
      }
    }
    // Weeks start on Monday; the last column is this week.
    const monday = dayjs().subtract((dayjs().day() + 6) % 7, 'day');
    const start = monday.subtract(WEEKS - 1 - ahead, 'week');
    const weeks: DayCell[][] = Array.from({ length: WEEKS }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const day = start.add(w * 7 + d, 'day').format('YYYY-MM-DD');
        return (
          count.get(day) ?? {
            day,
            done: 0,
            missed: 0,
            planned: 0,
            future: day > today,
          }
        );
      }),
    );
    const shown = weeks.flat();
    return {
      weeks,
      done: shown.reduce((n, c) => n + c.done, 0),
      missed: shown.reduce((n, c) => n + (c.future ? 0 : c.missed), 0),
    };
  }, [tasks, goal.id, target, today, ahead]);

  const months = weeks.map((week, i) => {
    const first = dayjs(week[0].day);
    const prev = i ? dayjs(weeks[i - 1][0].day) : null;
    return !prev || first.month() !== prev.month() ? first.format('MMM') : '';
  });

  const label = `${done} done${missed ? ` · ${missed} missed` : ''} in ${WEEKS - ahead} weeks`;

  const cellOf = (day: string) => weeks.flat().find((c) => c.day === day);
  const card = open ? cellOf(open.day) : null;
  /** Run days from tomorrow up to `day` with nothing done yet. */
  const daysUpTo = (day: string) =>
    weeks
      .flat()
      .filter(
        (c) =>
          c.day > today &&
          c.day <= day &&
          !c.done &&
          (c.planned > 0 || isRunDay(c.day)),
      ).length;

  return (
    <div
      ref={wrap}
      className={cn('relative flex flex-col gap-1.5', className)}
      onMouseLeave={() => !pinned && close()}
    >
      <div className="custom-scrollbar flex justify-end overflow-x-auto">
        <div className="flex gap-[3px]">
          <div className="mr-1 flex flex-col gap-[3px] pt-[15px] text-[9px] leading-[11px] text-neutral-600">
            {ROWS.map((r, i) => (
              <span key={i} className="h-[11px]">
                {r}
              </span>
            ))}
          </div>
          {weeks.map((week, w) => (
            <div key={week[0].day} className="flex flex-col gap-[3px]">
              <span className="relative h-3 w-[11px]">
                <span className="absolute left-0 top-0 whitespace-nowrap text-[9px] leading-3 text-neutral-600">
                  {months[w]}
                </span>
              </span>
              {week.map((c) => {
                const level =
                  c.done > 0 ? LEVELS[Math.min(LEVELS.length, c.done) - 1] : 0;
                const failed = !c.future && c.missed > 0;
                const inRange =
                  !!until &&
                  c.day > today &&
                  c.day <= until &&
                  !c.done &&
                  (c.planned > 0 || isRunDay(c.day));
                return (
                  <button
                    key={c.day}
                    type="button"
                    aria-label={dayjs(c.day).format('ddd D MMM')}
                    onMouseEnter={(e) => show(c, e.currentTarget)}
                    onFocus={(e) => show(c, e.currentTarget)}
                    onClick={(e) =>
                      pinned && open?.day === c.day
                        ? close()
                        : show(c, e.currentTarget, true)
                    }
                    className={cn(
                      'relative block size-[11px] rounded-[3px]',
                      'cursor-default',
                      open?.day === c.day &&
                        'outline outline-1 outline-white/80',
                      ticking === c.day && 'animate-pulse',
                      !level && !failed && 'bg-white/[0.05]',
                      !level && failed && 'bg-rose-400/70',
                      level && failed && 'ring-1 ring-rose-400',
                      c.planned > 0 && !level && 'ring-1 ring-white/25',
                      c.future && !c.planned && !inRange && 'opacity-40',
                      inRange && '!bg-emerald-400/60',
                      c.day === today &&
                        open?.day !== c.day &&
                        'outline outline-1 outline-white/50',
                    )}
                    style={
                      level
                        ? { backgroundColor: color, opacity: level }
                        : undefined
                    }
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {open && card && (
        <div
          role="dialog"
          style={{ left: open.x, top: open.y, width: CARD_WIDTH }}
          className={cn(
            'absolute z-20 -translate-x-1/2 -translate-y-full pb-2',
            // Only a pinned card takes the pointer, so hovering moves on.
            !pinned && 'pointer-events-none',
          )}
        >
          <div className="rounded-xl border border-white/10 bg-neutral-900/95 p-2.5 text-xs text-neutral-300 shadow-2xl shadow-black/50 backdrop-blur">
            <p className="font-semibold text-white">
              {dayjs(card.day).format('ddd D MMM YYYY')}
              {card.day === today && (
                <span className="ml-1.5 font-normal text-neutral-500">
                  today
                </span>
              )}
            </p>
            <p className="mt-0.5 text-neutral-500">
              {[
                card.done && `${card.done} done`,
                !card.future && card.missed && `${card.missed} missed`,
                card.planned && `${card.planned} planned`,
              ]
                .filter(Boolean)
                .join(' · ') ||
                (card.future && !isRunDay(card.day)
                  ? 'Not one of its days'
                  : 'Nothing yet')}
            </p>
            {onTick && !pinned && (
              <p className="mt-1.5 text-[11px] text-neutral-500">
                Click the square to {card.done ? 'tick it off' : 'tick it'}
              </p>
            )}
            {onTick && pinned && (
              <div className="mt-2 flex flex-col gap-1">
                <button
                  type="button"
                  disabled={!!ticking}
                  onClick={() => run(card.day, onTick(card.day, !card.done))}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-2 py-1 text-left transition-colors disabled:opacity-40',
                    card.done
                      ? 'text-neutral-300 hover:bg-white/[0.06]'
                      : 'bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/25',
                  )}
                >
                  <Icon
                    name={card.done ? 'remove_done' : 'check'}
                    className="text-[14px]"
                  />
                  {card.done ? 'Tick it off' : 'Mark this day done'}
                </button>
                {card.future && onTickUntil && daysUpTo(card.day) > 1 && (
                  <button
                    type="button"
                    disabled={!!ticking}
                    onMouseEnter={() => setUntil(card.day)}
                    onMouseLeave={() => setUntil(null)}
                    onClick={() => run(card.day, onTickUntil(card.day))}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-left text-neutral-300 transition-colors hover:bg-white/[0.06] disabled:opacity-40"
                  >
                    <Icon name="done_all" className="text-[14px]" />
                    Done up to here ({daysUpTo(card.day)} days)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-neutral-500">
        <span className="tabular-nums">{label}</span>
        <span className="flex shrink-0 items-center gap-[3px]">
          Less
          <span className="size-[9px] rounded-[2px] bg-white/[0.05]" />
          {LEVELS.map((o) => (
            <span
              key={o}
              className="size-[9px] rounded-[2px]"
              style={{ backgroundColor: color, opacity: o }}
            />
          ))}
          More
          <span className="ml-1.5 size-[9px] rounded-[2px] bg-rose-400/70" />
          Missed
        </span>
      </div>
    </div>
  );
};
