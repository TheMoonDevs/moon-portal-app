'use client';

import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';
import type { CalendarCompany, GoalDay } from '@/lib/workspace/goalCalendar';

import { Icon } from '../Admin/shared/AdminUI';
import { Tip } from '../Projects/Tip';
import { doneOn, type GoalRow, type WorkIndex } from './model';
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
const DayCard = ({
  day,
  entries,
  finished,
}: {
  day: string;
  entries: DayEntry[];
  finished: number;
}) => (
  <div className="w-[240px]">
    <p className="mb-1.5 flex items-baseline justify-between gap-2 font-semibold text-white">
      {new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      })}
      {finished > 0 && (
        <span className="text-[11px] font-medium text-emerald-300">
          {finished} task{finished === 1 ? '' : 's'} done
        </span>
      )}
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

/** A day's entries split by company, in row order. */
const byCompany = (entries: DayEntry[]) => {
  const groups: {
    company: CalendarCompany | undefined;
    entries: DayEntry[];
  }[] = [];
  for (const e of entries) {
    const g = groups.find((x) => x.company?.id === e.row.company?.id);
    if (g) g.entries.push(e);
    else groups.push({ company: e.row.company, entries: [e] });
  }
  return groups;
};

const Dots = ({ entries, max }: { entries: DayEntry[]; max: number }) => (
  <>
    {entries.slice(0, max).map(({ row, cell }) => (
      <span
        key={row.key}
        className={cn(
          'size-1.5 shrink-0 rounded-full md:size-2',
          STATE_META[cell.state as keyof typeof STATE_META].dot,
          cell.state === 'planned' && 'opacity-50',
        )}
      />
    ))}
    {entries.length > max && (
      <span className="text-[9px] leading-[8px] text-neutral-500">
        +{entries.length - max}
      </span>
    )}
  </>
);

/**
 * A month of goals, kept quiet: a dot per goal due or worked on each day,
 * coloured by how it went, a line per company when there are several, and
 * how many tasks were finished. Hovering a day lists its goals; clicking
 * it opens the day in the sidebar. On wide screens the month fills the
 * screen.
 */
export const GoalsMonth = ({
  weeks,
  month,
  rows,
  done,
  today,
  selected,
  onSelect,
}: {
  weeks: string[][];
  /** YYYY-MM of the month shown. */
  month: string;
  rows: GoalRow[];
  done: WorkIndex;
  today: string;
  selected: string | null;
  onSelect: (day: string) => void;
}) => {
  const projectIds = Array.from(new Set(rows.map((r) => r.project.id)));
  const split = new Set(rows.map((r) => r.company?.id)).size > 1;
  return (
    <div
      className={cn(card, 'flex flex-col overflow-hidden md:h-full')}
      style={{ '--weeks': weeks.length } as CSSProperties}
    >
      <div className="grid shrink-0 grid-cols-7 border-b border-white/[0.06] auto-light:border-black/[0.06]">
        {WEEKDAYS.map((d) => (
          <p
            key={d}
            className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-neutral-500"
          >
            {d}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7 md:min-h-0 md:flex-1 md:[grid-template-rows:repeat(var(--weeks),minmax(0,1fr))]">
        {weeks.flat().map((day, i) => {
          const entries = entriesOn(rows, day);
          const finished = projectIds.reduce(
            (n, id) => n + doneOn(done, id, day),
            0,
          );
          const inMonth = day.startsWith(month);
          const score = dayScore(entries, day, today);
          const isToday = day === today;
          const isSelected = day === selected;
          return (
            <Tip
              key={day}
              content={
                <DayCard day={day} entries={entries} finished={finished} />
              }
            >
              <button
                type="button"
                onClick={() => onSelect(day)}
                aria-label={day}
                aria-pressed={isSelected}
                className={cn(
                  'group relative flex min-h-[64px] flex-col gap-1.5 overflow-hidden border-white/[0.05] p-1.5 text-left transition-colors auto-light:border-black/[0.06] md:min-h-0 md:p-2',
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
                {/* A run of dots per company, the companies apart. */}
                <span className="flex flex-col gap-1.5">
                  {(split
                    ? byCompany(entries)
                    : [{ company: undefined, entries }]
                  ).map((g, gi) => (
                    <span
                      key={g.company?.id ?? gi}
                      title={g.company?.name}
                      className="flex flex-wrap gap-1 md:gap-[5px]"
                    >
                      <Dots entries={g.entries} max={split ? DOTS - 2 : DOTS} />
                    </span>
                  ))}
                </span>
                {finished > 0 && (
                  <span className="mt-auto hidden items-center gap-0.5 text-[10px] font-medium tabular-nums text-emerald-300/80 auto-light:text-emerald-700 md:flex">
                    <Icon name="check" className="text-[11px]" />
                    {finished} done
                  </span>
                )}
              </button>
            </Tip>
          );
        })}
      </div>
    </div>
  );
};
