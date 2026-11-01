'use client';

import type { Task } from '@db/client';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import type { ProjectGoal } from '@/models/workspace';

/*
 * A goal's last few months, one square a day like a contribution graph:
 * the brighter, the more of its tasks were done that day. A day the goal
 * missed (an overdue task, or one moved on to another day) is red; days
 * with work still planned are outlined.
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
  const ahead = onTick ? AHEAD : 0;
  /** A day the goal has a task for, as its schedule says. */
  const isRunDay = (day: string) => {
    const d = dayjs(day);
    if (goal.period === 'day') return true;
    if (goal.period === 'month') return d.date() === (goal.monthDay || 1);
    return (goal.days?.length ? goal.days : [1]).includes(d.day());
  };
  const [hover, setHover] = useState<DayCell | null>(null);
  const [ticking, setTicking] = useState<string | null>(null);
  const [shift, setShift] = useState(false);
  const today = dayjs().format('YYYY-MM-DD');
  const target = goal.kind === 'target';

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
        if (t.forDate < today) cell(t.forDate).missed += 1;
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

  // Hovering an upcoming day previews ticking every day up to it.
  const until = onTickUntil && hover?.future && !shift ? hover.day : null;

  const months = weeks.map((week, i) => {
    const first = dayjs(week[0].day);
    const prev = i ? dayjs(weeks[i - 1][0].day) : null;
    return !prev || first.month() !== prev.month() ? first.format('MMM') : '';
  });

  const label = until
    ? `Click: done from today until ${dayjs(until).format('ddd D MMM')} · Shift-click for just this day`
    : hover
      ? `${dayjs(hover.day).format('ddd D MMM')}: ${
          [
            hover.done && `${hover.done} done`,
            hover.missed && `${hover.missed} missed`,
            hover.planned && `${hover.planned} planned`,
          ]
            .filter(Boolean)
            .join(', ') || 'nothing'
        }${onTick ? (hover.done ? ' · click to tick off' : ' · click to tick') : ''}`
      : `${done} done${missed ? ` · ${missed} missed` : ''} in ${WEEKS - ahead} weeks${
          onTick
            ? ' · click a day to tick it, or an upcoming one to tick every day up to it'
            : ''
        }`;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
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
                const Cell = onTick ? 'button' : 'span';
                return (
                  <Cell
                    key={c.day}
                    {...(onTick && {
                      type: 'button' as const,
                      disabled: !!ticking,
                      'aria-label': `${c.done ? 'Tick off' : 'Tick'} ${dayjs(c.day).format('D MMM')}`,
                      onClick: (e: React.MouseEvent) => {
                        setTicking(c.day);
                        const run =
                          c.future && onTickUntil && !e.shiftKey
                            ? onTickUntil(c.day)
                            : onTick(c.day, !c.done);
                        run.finally(() => setTicking(null));
                      },
                    })}
                    onMouseEnter={(e: React.MouseEvent) => {
                      setShift(e.shiftKey);
                      setHover(c);
                    }}
                    onMouseMove={(e: React.MouseEvent) =>
                      e.shiftKey !== shift && setShift(e.shiftKey)
                    }
                    onMouseLeave={() => setHover(null)}
                    className={cn(
                      'relative block size-[11px] rounded-[3px]',
                      onTick &&
                        'cursor-pointer transition-transform hover:scale-125 hover:outline hover:outline-1 hover:outline-white/70',
                      ticking === c.day && 'animate-pulse',
                      !level && !failed && 'bg-white/[0.05]',
                      !level && failed && 'bg-rose-400/70',
                      level && failed && 'ring-1 ring-rose-400',
                      c.planned > 0 && !level && 'ring-1 ring-white/25',
                      c.future && !c.planned && !inRange && 'opacity-40',
                      inRange && '!bg-emerald-400/60',
                      c.day === today && 'outline outline-1 outline-white/50',
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
