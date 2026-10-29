'use client';

import { cn } from '@/lib/utils';

import type { Place } from './sheetParts';
import { PlaceDot, placeOf } from './sheetParts';
import type { Day, DayTask } from './useDay';

/*
 * The day by project, above its sheet: how many tasks each project has and
 * how many are done. Picking one shows only its tasks.
 */

export type PlaceCount = { place: Place; done: number; total: number };

export function countPlaces(day: Day, tasks: DayTask[]): PlaceCount[] {
  const groups = new Map<string, PlaceCount>();
  for (const task of tasks) {
    if (task.draft || !task.title.trim()) continue;
    const place = placeOf(task, day.projects, day.companies);
    const group = groups.get(place.key) ?? { place, done: 0, total: 0 };
    group.total += 1;
    if (task.status === 'DONE') group.done += 1;
    groups.set(place.key, group);
  }
  // Projects first, biggest first; no project last.
  return Array.from(groups.values()).sort(
    (a, b) =>
      Number(a.place.kind === 'none') - Number(b.place.kind === 'none') ||
      b.total - a.total,
  );
}

export const ProjectSummary = ({
  counts,
  filter,
  onFilter,
}: {
  counts: PlaceCount[];
  filter: string | null;
  onFilter: (key: string | null) => void;
}) => {
  const done = counts.reduce((n, c) => n + c.done, 0);
  const total = counts.reduce((n, c) => n + c.total, 0);
  if (!total) return null;
  const chip = (active: boolean) =>
    cn(
      'flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors',
      active
        ? 'border-white/30 bg-white/[0.08] text-white auto-light:border-black/30 auto-light:bg-black/[0.06] auto-light:text-neutral-950'
        : 'border-white/[0.08] text-neutral-400 hover:border-white/20 hover:text-neutral-200 auto-light:border-black/10 auto-light:text-neutral-600 auto-light:hover:border-black/20 auto-light:hover:text-neutral-900',
    );
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onFilter(null)}
        className={chip(!filter)}
      >
        All
        <span className="tabular-nums text-neutral-500">
          {done}/{total}
        </span>
      </button>
      {counts.map(({ place, done: d, total: t }) => (
        <button
          key={place.key}
          type="button"
          onClick={() => onFilter(filter === place.key ? null : place.key)}
          className={chip(filter === place.key)}
        >
          <PlaceDot place={place} />
          <span className="max-w-[160px] truncate">{place.name}</span>
          <span className="tabular-nums text-neutral-500">
            {d}/{t}
          </span>
        </button>
      ))}
    </div>
  );
};
