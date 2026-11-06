'use client';

import { cn } from '@/lib/utils';
import type { GoalDay } from '@/lib/workspace/goalCalendar';

import { Icon } from '../Admin/shared/AdminUI';
import type { GoalRow } from './model';
import { card, STATE_META } from './ui';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** Goals listed in a day before "+N more". */
const SHOWN = 4;

const STATE_ORDER = [
  'missed',
  'open',
  'partial',
  'reached',
  'done',
  'progress',
  'planned',
] as const;

export type DayEntry = { row: GoalRow; cell: GoalDay };

/** The goals with something on `day`, most urgent first. */
export const entriesOn = (rows: GoalRow[], day: string): DayEntry[] =>
  rows
    .map((row) => ({ row, cell: row.days.get(day) }))
    .filter((e): e is DayEntry => !!e.cell && e.cell.state !== 'none')
    .sort(
      (a, b) =>
        STATE_ORDER.indexOf(a.cell.state as (typeof STATE_ORDER)[number]) -
        STATE_ORDER.indexOf(b.cell.state as (typeof STATE_ORDER)[number]),
    );

/** How a day went: due runs done out of due, once the day is over. */
const dayScore = (entries: DayEntry[], day: string, today: string) => {
  const due = entries.filter((e) => e.cell.due > 0);
  if (!due.length || day > today) return null;
  const done = due.filter((e) => e.cell.state === 'done').length;
  return { done, of: due.length };
};

/**
 * A month of goals, a square per day: each goal due or worked on that day
 * as a small pill coloured by how it went. Tapping a day opens it.
 */
export const GoalsMonth = ({
  weeks,
  month,
  rows,
  today,
  selected,
  onSelect,
}: {
  weeks: string[][];
  /** YYYY-MM of the month shown. */
  month: string;
  rows: GoalRow[];
  today: string;
  selected: string | null;
  onSelect: (day: string) => void;
}) => (
  <div className={cn(card, 'overflow-hidden')}>
    <div className="grid grid-cols-7 border-b border-white/[0.06] auto-light:border-black/[0.06]">
      {WEEKDAYS.map((d) => (
        <p
          key={d}
          className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-neutral-500"
        >
          {d}
        </p>
      ))}
    </div>
    <div className="grid grid-cols-7">
      {weeks.flat().map((day, i) => {
        const entries = entriesOn(rows, day);
        const inMonth = day.startsWith(month);
        const score = dayScore(entries, day, today);
        const isToday = day === today;
        const isSelected = day === selected;
        const extra = entries.length - SHOWN;
        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelect(day)}
            aria-label={day}
            aria-pressed={isSelected}
            className={cn(
              'group relative flex min-h-[64px] flex-col gap-1 border-white/[0.05] p-1 text-left transition-colors auto-light:border-black/[0.06] md:min-h-[128px] md:p-1.5',
              i % 7 !== 6 && 'border-r',
              i < weeks.length * 7 - 7 && 'border-b',
              !inMonth && 'bg-black/20 auto-light:bg-black/[0.02]',
              isSelected
                ? 'bg-white/[0.06] auto-light:bg-black/[0.04]'
                : 'hover:bg-white/[0.03] auto-light:hover:bg-black/[0.02]',
            )}
          >
            {isSelected && (
              <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/40 auto-light:ring-black/30" />
            )}
            <span className="flex items-center justify-between gap-1">
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums',
                  isToday
                    ? 'bg-white text-neutral-950 auto-light:bg-neutral-900 auto-light:text-white'
                    : inMonth
                      ? 'text-neutral-200 auto-light:text-neutral-800'
                      : 'text-neutral-600 auto-light:text-neutral-400',
                )}
              >
                {Number(day.slice(8, 10))}
              </span>
              {score && (
                <span
                  title={`${score.done} of ${score.of} goals due were done`}
                  className={cn(
                    'hidden rounded-full px-1.5 text-[10px] font-medium tabular-nums md:inline',
                    score.done === score.of
                      ? 'text-emerald-300 auto-light:text-emerald-700'
                      : score.done === 0
                        ? 'text-rose-300 auto-light:text-rose-600'
                        : 'text-amber-200 auto-light:text-amber-700',
                  )}
                >
                  {score.done}/{score.of}
                </span>
              )}
            </span>

            {/* Phones: a dot per goal. */}
            <span className="flex flex-wrap gap-[3px] md:hidden">
              {entries.slice(0, 8).map(({ row, cell }) => (
                <span
                  key={row.key}
                  className={cn(
                    'size-1.5 rounded-full',
                    STATE_META[cell.state as keyof typeof STATE_META].dot,
                  )}
                />
              ))}
              {entries.length > 8 && (
                <span className="text-[8px] leading-[6px] text-neutral-500">
                  +
                </span>
              )}
            </span>

            {/* Wider screens: a pill per goal. */}
            <span className="hidden min-w-0 flex-col gap-[3px] md:flex">
              {entries.slice(0, SHOWN).map(({ row, cell }) => {
                const meta = STATE_META[cell.state as keyof typeof STATE_META];
                return (
                  <span
                    key={row.key}
                    title={`${row.project.name} · ${row.goal.title} · ${meta.label}`}
                    className={cn(
                      'flex min-w-0 items-center gap-1 overflow-hidden rounded-md py-[3px] pl-1 pr-1.5 text-[11px] leading-none',
                      meta.pill,
                    )}
                  >
                    <span
                      className="h-3 w-[3px] shrink-0 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    <Icon name={meta.icon} className="shrink-0 text-[11px]" />
                    <span className="truncate">{row.goal.title}</span>
                    {cell.due > 1 && (
                      <span className="ml-auto shrink-0 pl-1 tabular-nums opacity-70">
                        {Math.min(cell.done, cell.due)}/{cell.due}
                      </span>
                    )}
                  </span>
                );
              })}
              {extra > 0 && (
                <span className="px-1 text-[10px] text-neutral-500">
                  +{extra} more
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);
