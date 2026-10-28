'use client';

import { cn } from '@/lib/utils';
import type { PointOrigin } from '@/lib/worklogs/origin';
import { ORIGIN_KEYS, POINT_ORIGINS } from '@/lib/worklogs/origin';

/*
 * Planned, unexpected and delayed points, as a bar with counts and as a
 * small tag on one point. Dark, for the worklog and user pages.
 */

export const ORIGIN_STYLE: Record<
  PointOrigin,
  { bar: string; dot: string; tag: string }
> = {
  planned: {
    bar: 'bg-sky-400',
    dot: 'bg-sky-400',
    tag: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
  },
  unexpected: {
    bar: 'bg-amber-400',
    dot: 'bg-amber-400',
    tag: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  },
  delayed: {
    bar: 'bg-rose-400',
    dot: 'bg-rose-400',
    tag: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
  },
};

export const OriginTag = ({
  origin,
  className,
}: {
  origin: PointOrigin;
  className?: string;
}) => (
  <span
    title={POINT_ORIGINS[origin].hint}
    className={cn(
      'inline-flex shrink-0 items-center rounded-full border px-1.5 py-px text-[10px] font-medium leading-4',
      ORIGIN_STYLE[origin].tag,
      className,
    )}
  >
    {POINT_ORIGINS[origin].label}
  </span>
);

export type OriginCounts = Record<PointOrigin, number> & { unknown?: number };

/** A stacked bar with a legend: how the points of a day or period came. */
export const OriginBar = ({
  counts,
  done,
  className,
}: {
  counts: OriginCounts;
  /** Done points of each origin, shown as "3 done". */
  done?: Partial<Record<PointOrigin, number>>;
  className?: string;
}) => {
  const total = ORIGIN_KEYS.reduce((n, k) => n + counts[k], 0);
  return (
    <div className={className}>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        {total > 0 &&
          ORIGIN_KEYS.map((k) =>
            counts[k] ? (
              <div
                key={k}
                className={cn('h-full', ORIGIN_STYLE[k].bar)}
                style={{ width: `${(counts[k] / total) * 100}%` }}
              />
            ) : null,
          )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {ORIGIN_KEYS.map((k) => (
          <span
            key={k}
            title={POINT_ORIGINS[k].hint}
            className="flex items-center gap-1.5 text-neutral-400"
          >
            <span className={cn('size-2 rounded-full', ORIGIN_STYLE[k].dot)} />
            {POINT_ORIGINS[k].label}
            <span className="font-semibold tabular-nums text-neutral-100">
              {counts[k]}
            </span>
            {done && counts[k] > 0 && (
              <span className="text-neutral-500">· {done[k] ?? 0} done</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
};
