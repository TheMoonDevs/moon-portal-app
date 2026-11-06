'use client';

import { cn } from '@/lib/utils';
import type { GoalDay } from '@/lib/workspace/goalCalendar';

import { Tip } from '../Projects/Tip';
import type { GoalRow } from './model';
import { card, STATE_META } from './ui';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** Dots a day shows before "+N". */
const DOTS = 12;
/** Goals the hover card lists before "+N more". */
const LISTED = 8;

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

/** What a day holds, shown on hover: each goal, how it went, its count. */
const DayCard = ({ day, entries }: { day: string; entries: DayEntry[] }) => (
  <div className="w-[240px]">
    <p className="mb-1.5 font-semibold text-white">
      {new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      })}
    </p>
    {entries.length ? (
      <ul className="flex flex-col gap-1">
        {entries.slice(0, LISTED).map(({ row, cell }) => {
          const meta = STATE_META[cell.state as keyof typeof STATE_META];
          return (
            <li key={row.key} className="flex items-center gap-2">
              <span className={cn('size-2 shrink-0 rounded-full', meta.dot)} />
              <span className="min-w-0 flex-1 truncate">
                <span className="text-neutral-100">{row.label}</span>
                <span className="text-neutral-500"> · {row.project.name}</span>
              </span>
              {cell.due > 1 && (
                <span className="shrink-0 tabular-nums text-neutral-400">
                  {Math.min(cell.done, cell.due)}/{cell.due}
                </span>
              )}
            </li>
          );
        })}
        {entries.length > LISTED && (
          <li className="text-neutral-500">
            +{entries.length - LISTED} more · click to see all
          </li>
        )}
      </ul>
    ) : (
      <p className="text-neutral-500">Nothing due.</p>
    )}
  </div>
);

/**
 * A month of goals, kept quiet: a dot per goal due or worked on each day,
 * coloured by how it went. Hovering a day lists its goals; clicking it
 * opens the day with everything about it.
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
        return (
          <Tip key={day} content={<DayCard day={day} entries={entries} />}>
            <button
              type="button"
              onClick={() => onSelect(day)}
              aria-label={day}
              aria-pressed={isSelected}
              className={cn(
                'group relative flex min-h-[64px] flex-col gap-1.5 border-white/[0.05] p-1.5 text-left transition-colors auto-light:border-black/[0.06] md:min-h-[96px] md:p-2',
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
                    className={cn(
                      'hidden text-[10px] font-medium tabular-nums md:inline',
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
              <span className="flex flex-wrap gap-1 md:gap-1.5">
                {entries.slice(0, DOTS).map(({ row, cell }) => (
                  <span
                    key={row.key}
                    className={cn(
                      'size-1.5 rounded-full md:size-2',
                      STATE_META[cell.state as keyof typeof STATE_META].dot,
                      cell.state === 'planned' && 'opacity-50',
                    )}
                  />
                ))}
                {entries.length > DOTS && (
                  <span className="text-[9px] leading-[8px] text-neutral-500">
                    +{entries.length - DOTS}
                  </span>
                )}
              </span>
            </button>
          </Tip>
        );
      })}
    </div>
  </div>
);
