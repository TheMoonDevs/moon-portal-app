'use client';

import dayjs from 'dayjs';
import { useMemo } from 'react';

import type { ActivityData } from '@/lib/people/types';
import { cn } from '@/lib/utils';

/*
 * Six months of worklogs at a glance: a square per day, brighter the more
 * points were logged. Picking a square opens that day.
 */

const LEVELS = [
  'bg-white/[0.045]',
  'bg-white/[0.14]',
  'bg-white/[0.3]',
  'bg-white/[0.55]',
  'bg-white/[0.85]',
];

const level = (n: number) =>
  n <= 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : n <= 7 ? 3 : 4;

/** Days in a row up to today (or yesterday, when today is still empty). */
function streakOf(days: Record<string, number>) {
  let d = dayjs();
  if (!days[d.format('YYYY-MM-DD')]) d = d.subtract(1, 'day');
  let n = 0;
  while (days[d.format('YYYY-MM-DD')]) {
    n++;
    d = d.subtract(1, 'day');
  }
  return n;
}

export const ActivityGrid = ({
  data,
  selected,
  onPick,
}: {
  data: ActivityData | null;
  /** The days of the period on view, to outline. */
  selected: { from: string; to: string };
  onPick: (day: string) => void;
}) => {
  const weeks = useMemo(() => {
    const end = dayjs();
    // Columns are Monday-first weeks; 26 of them end with this one.
    const firstMonday = end
      .subtract((end.day() + 6) % 7, 'day')
      .subtract(25, 'week');
    return Array.from({ length: 26 }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => firstMonday.add(w * 7 + d, 'day')),
    );
  }, []);

  const days = data?.days ?? {};
  const logged = Object.keys(days).length;
  const points = Object.values(days).reduce((n, v) => n + v, 0);
  const streak = streakOf(days);
  const today = dayjs();

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium text-neutral-500">
          Last 6 months
        </p>
        <p className="text-[11px] tabular-nums text-neutral-500">
          {data ? (
            <>
              <span className="text-neutral-300">{logged}</span> days ·{' '}
              <span className="text-neutral-300">{points}</span> points
              {streak > 1 && (
                <>
                  {' '}
                  · <span className="text-neutral-300">{streak}</span>-day
                  streak
                </>
              )}
            </>
          ) : (
            '…'
          )}
        </p>
      </div>
      <div className="flex gap-[3px]">
        {weeks.map((week, w) => (
          <div key={w} className="flex flex-1 flex-col gap-[3px]">
            {week.map((d) => {
              const key = d.format('YYYY-MM-DD');
              const future = d.isAfter(today, 'day');
              const n = days[key] ?? 0;
              const inPeriod = key >= selected.from && key <= selected.to;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={future}
                  onClick={() => onPick(key)}
                  title={`${d.format('ddd D MMM')}: ${n ? `${n} ${n === 1 ? 'point' : 'points'}` : 'nothing logged'}`}
                  className={cn(
                    'aspect-square w-full rounded-[3px] transition-transform hover:scale-125',
                    future ? 'bg-transparent' : LEVELS[level(n)],
                    !data && !future && 'animate-pulse',
                    inPeriod && !future && 'ring-1 ring-sky-400/70',
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
