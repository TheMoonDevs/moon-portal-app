'use client';

import { cn } from '@/lib/utils';
import type { GoalDay } from '@/lib/workspace/goalCalendar';
import { isTarget, PERIOD_LABELS } from '@/lib/workspace/projects';

import type { GoalRow } from './model';
import { card, fmtDay, STATE_META } from './ui';

type Entry = { row: GoalRow; cell: GoalDay };

/**
 * The goals of one day in row order (effort, company, project), so the
 * same goal sits at the same height across the week.
 */
const entriesFor = (rows: GoalRow[], day: string): Entry[] =>
  rows
    .map((row) => ({ row, cell: row.days.get(day) }))
    .filter((e): e is Entry => !!e.cell && e.cell.state !== 'none');

/**
 * One goal on a day: what is due that day ("1 song releases"), the goal's
 * whole target ("2 a week"), its project, and how it went.
 */
const GoalLine = ({ row, cell }: Entry) => {
  const meta = STATE_META[cell.state as keyof typeof STATE_META];
  const target = isTarget(row.goal);
  // A day's share of a repeating goal; a target goal's whole number.
  const text =
    !target && cell.due > 0
      ? `${cell.due.toLocaleString('en-US')} ${row.goal.title}`
      : row.label;
  const whole = target
    ? 'target'
    : `${row.goal.target.toLocaleString('en-US')} ${PERIOD_LABELS[row.goal.period]}`;
  return (
    <li
      title={`${text} (${whole}) · ${row.project.name} · ${meta.label}`}
      className="flex gap-2 rounded-lg p-1.5 hover:bg-white/[0.04] auto-light:hover:bg-black/[0.03]"
    >
      <span
        className={cn(
          'mt-[5px] size-2 shrink-0 rounded-full',
          meta.dot,
          cell.state === 'planned' && 'opacity-60',
        )}
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block break-words text-[12px] leading-snug',
            cell.state === 'done'
              ? 'text-neutral-400 auto-light:text-neutral-500'
              : 'text-neutral-100 auto-light:text-neutral-900',
          )}
        >
          {text}
          {cell.due > 1 && (
            <span className="ml-1 tabular-nums text-neutral-500">
              {Math.min(cell.done, cell.due)}/{cell.due}
            </span>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[10px] text-neutral-500">
          <span
            className="size-1.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: row.color }}
          />
          <span className="truncate">{row.project.name}</span>
          <span className="shrink-0 text-neutral-600 auto-light:text-neutral-400">
            · {whole}
          </span>
        </span>
      </span>
    </li>
  );
};

/**
 * A week to plan by: a column a day, each listing every goal due or worked
 * on that day with what is due that day and the goal's whole target, its
 * project and how it went. On phones the days stack. Clicking a day opens it in full.
 */
export const GoalsWeek = ({
  days,
  rows,
  today,
  selected,
  onSelect,
}: {
  /** Monday to Sunday. */
  days: string[];
  rows: GoalRow[];
  today: string;
  selected: string | null;
  onSelect: (day: string) => void;
}) => (
  <div
    className={cn(
      card,
      'grid grid-cols-1 divide-y divide-white/[0.06] overflow-hidden auto-light:divide-black/[0.06] md:grid-cols-7 md:divide-x md:divide-y-0',
    )}
  >
    {days.map((day) => {
      const entries = entriesFor(rows, day);
      const due = entries.filter((e) => e.cell.due > 0);
      const done = due.filter((e) => e.cell.state === 'done').length;
      const isToday = day === today;
      const isSelected = day === selected;
      const past = day < today;
      return (
        <section
          key={day}
          className={cn(
            'flex min-w-0 flex-col',
            isSelected && 'bg-white/[0.04] auto-light:bg-black/[0.03]',
          )}
        >
          <button
            type="button"
            onClick={() => onSelect(day)}
            aria-pressed={isSelected}
            className="flex items-center gap-2 border-b border-white/[0.06] px-2.5 py-2 text-left hover:bg-white/[0.03] auto-light:border-black/[0.06] auto-light:hover:bg-black/[0.02]"
          >
            <span
              className={cn(
                'text-[10px] font-semibold uppercase tracking-wider',
                isToday
                  ? 'text-white auto-light:text-neutral-950'
                  : 'text-neutral-500',
              )}
            >
              {fmtDay(day, {
                weekday: 'short',
                day: undefined,
                month: undefined,
              })}
            </span>
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums',
                isToday
                  ? 'bg-white text-neutral-950 auto-light:bg-neutral-900 auto-light:text-white'
                  : 'text-neutral-200 auto-light:text-neutral-800',
              )}
            >
              {Number(day.slice(8, 10))}
            </span>
            <span className="ml-auto text-[10px] tabular-nums text-neutral-500">
              {!due.length
                ? entries.length
                  ? ''
                  : 'Free'
                : past || isToday
                  ? `${done}/${due.length} done`
                  : `${due.length} due`}
            </span>
          </button>
          {entries.length ? (
            <ul
              className={cn(
                'flex flex-col gap-0.5 p-1.5 md:min-h-[320px]',
                past && 'opacity-80',
              )}
            >
              {entries.map((e) => (
                <GoalLine key={e.row.key} {...e} />
              ))}
            </ul>
          ) : (
            <p className="p-3 text-[11px] text-neutral-600 auto-light:text-neutral-400 md:min-h-[320px]">
              No goals due.
            </p>
          )}
        </section>
      );
    })}
  </div>
);
