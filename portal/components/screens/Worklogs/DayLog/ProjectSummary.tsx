'use client';

import * as HoverCard from '@radix-ui/react-hover-card';

import { cn } from '@/lib/utils';

import { Icon } from '../../Admin/shared/AdminUI';
import type { Place } from './sheetParts';
import { PlaceLogo, placeOf, readablePoints, rowStatus } from './sheetParts';
import type { Day, DayTask } from './useDay';

/*
 * The day by project, above its sheet: a badge for each company, and one
 * bar split by project, each part filled as far as its tasks are done.
 * Hovering a part tells what it is; picking a badge or a part shows only
 * its tasks. The switch on the right shows the work points under tasks.
 */

export type PlaceCount = {
  place: Place;
  done: number;
  doing: number;
  total: number;
  points: number;
};

/** The key a place is filtered by when its company is picked. */
export const companyKeyOf = (place: Place) =>
  place.companyId ? `company:${place.companyId}` : place.key;

export function countPlaces(day: Day, tasks: DayTask[]): PlaceCount[] {
  const groups = new Map<string, PlaceCount>();
  for (const task of tasks) {
    if (task.draft || !task.title.trim()) continue;
    const place = placeOf(task, day.projects, day.companies);
    const group = groups.get(place.key) ?? {
      place,
      done: 0,
      doing: 0,
      total: 0,
      points: 0,
    };
    group.total += 1;
    const status = rowStatus(task, day.points, day.date);
    if (status === 'done') group.done += 1;
    else if (status === 'doing') group.doing += 1;
    group.points += readablePoints(
      day.points.filter((p) => p.taskId === task.id),
    ).length;
    groups.set(place.key, group);
  }
  // Projects first, biggest first; no project last.
  return Array.from(groups.values()).sort(
    (a, b) =>
      Number(a.place.kind === 'none') - Number(b.place.kind === 'none') ||
      b.total - a.total,
  );
}

type Badge = {
  key: string;
  place: Pick<Place, 'name' | 'color' | 'logo' | 'kind'>;
  done: number;
  total: number;
};

/** The day's companies (and personal or loose work), for the badges. */
function companyBadges(counts: PlaceCount[], day: Day): Badge[] {
  const badges = new Map<string, Badge>();
  for (const c of counts) {
    const key = companyKeyOf(c.place);
    const company = c.place.companyId
      ? day.companies.find((x) => x.id === c.place.companyId)
      : undefined;
    const badge = badges.get(key) ?? {
      key,
      place: company
        ? {
            name: company.name,
            color: company.color,
            logo: company.logo,
            kind: 'company' as const,
          }
        : c.place,
      done: 0,
      total: 0,
    };
    badge.done += c.done;
    badge.total += c.total;
    badges.set(key, badge);
  }
  return Array.from(badges.values());
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** One project's part of the bar, and what it means on hover. */
const Part = ({
  count,
  day,
  active,
  dimmed,
  showPoints,
  onPick,
}: {
  count: PlaceCount;
  day: Day;
  active: boolean;
  dimmed: boolean;
  showPoints: boolean;
  onPick: () => void;
}) => {
  const { place, done, doing, total, points } = count;
  const color = place.color || '#a3a3a3';
  const company = place.companyId
    ? day.companies.find((c) => c.id === place.companyId)
    : undefined;
  const left = total - done - doing;
  return (
    <HoverCard.Root openDelay={80} closeDelay={60}>
      <HoverCard.Trigger asChild>
        <button
          type="button"
          onClick={onPick}
          aria-label={`${place.name}: ${done} of ${total} done`}
          style={{ flexGrow: total, flexBasis: 0 }}
          className={cn(
            'group/part relative h-5 min-w-[14px] py-[7px] transition-opacity',
            dimmed && 'opacity-35 hover:opacity-80',
          )}
        >
          <span
            className={cn(
              'relative block h-1.5 overflow-hidden rounded-full bg-white/[0.07] transition-[height] group-hover/part:h-2 auto-light:bg-black/[0.07]',
              active && 'h-2',
            )}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${(done / total) * 100}%`,
                backgroundColor: color,
              }}
            />
          </span>
        </button>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="bottom"
          sideOffset={6}
          collisionPadding={12}
          className="auto-theme z-[1300] w-64 rounded-xl border border-white/10 bg-neutral-900 p-3 text-neutral-200 shadow-2xl shadow-black/50 auto-light:border-black/10 auto-light:bg-white auto-light:text-neutral-800 auto-light:shadow-black/10"
        >
          <div className="flex items-center gap-2.5">
            <PlaceLogo place={place} className="size-8 rounded-lg text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white auto-light:text-neutral-950">
                {place.name}
              </p>
              <p className="truncate text-[11px] text-neutral-500">
                {place.kind === 'project'
                  ? (company?.name ?? 'Project')
                  : place.kind === 'company'
                    ? 'Company work'
                    : place.kind === 'personal'
                      ? 'Only you see it'
                      : 'On no project'}
              </p>
            </div>
          </div>
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-white/[0.07] auto-light:bg-black/[0.07]">
            <span
              style={{
                width: `${(done / total) * 100}%`,
                backgroundColor: color,
              }}
            />
            <span
              className="bg-amber-400/70"
              style={{ width: `${(doing / total) * 100}%` }}
            />
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Done', value: done },
              { label: 'Doing', value: doing },
              { label: 'To do', value: left },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg bg-white/[0.04] py-1.5 auto-light:bg-black/[0.04]"
              >
                <dd className="text-sm font-semibold tabular-nums text-white auto-light:text-neutral-950">
                  {s.value}
                </dd>
                <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
                  {s.label}
                </dt>
              </div>
            ))}
          </dl>
          <p className="mt-2.5 flex items-center justify-between text-[11px] text-neutral-500">
            <span>
              {done} of {plural(total, 'task')} done
            </span>
            <span className="flex items-center gap-1">
              <Icon name="notes" className="text-[13px]" />
              {plural(points, 'work point')}
            </span>
          </p>
          {!showPoints && points > 0 && (
            <p className="mt-1 text-[10px] text-neutral-600 auto-light:text-neutral-400">
              Turn on work points at the top right to read them.
            </p>
          )}
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
};

export const ProjectSummary = ({
  counts,
  day,
  filter,
  onFilter,
  showPoints,
  onShowPoints,
}: {
  counts: PlaceCount[];
  day: Day;
  filter: string | null;
  onFilter: (key: string | null) => void;
  showPoints: boolean;
  onShowPoints: (show: boolean) => void;
}) => {
  const done = counts.reduce((n, c) => n + c.done, 0);
  const total = counts.reduce((n, c) => n + c.total, 0);
  if (!total) return null;
  const badges = companyBadges(counts, day);
  const pick = (key: string) => onFilter(filter === key ? null : key);
  const lit = (c: PlaceCount) =>
    filter === c.place.key || filter === companyKeyOf(c.place);
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {badges.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => pick(b.key)}
              className={cn(
                'flex h-7 items-center gap-1.5 rounded-full border pl-1 pr-2.5 text-xs transition-colors',
                filter === b.key
                  ? 'border-white/30 bg-white/[0.08] text-white auto-light:border-black/30 auto-light:bg-black/[0.06] auto-light:text-neutral-950'
                  : 'border-white/[0.08] text-neutral-400 hover:border-white/20 hover:text-neutral-200 auto-light:border-black/10 auto-light:text-neutral-600 auto-light:hover:border-black/20 auto-light:hover:text-neutral-900',
              )}
            >
              <PlaceLogo place={b.place} className="size-5 rounded-full" />
              <span className="max-w-[140px] truncate">{b.place.name}</span>
              <span className="tabular-nums text-neutral-500">
                {b.done}/{b.total}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onShowPoints(!showPoints)}
          aria-pressed={showPoints}
          title={showPoints ? 'Hide work points' : 'Show work points'}
          className={cn(
            'flex size-7 shrink-0 items-center justify-center self-start rounded-lg transition-colors',
            showPoints
              ? 'bg-white/[0.1] text-white auto-light:bg-black/[0.08] auto-light:text-neutral-950'
              : 'text-neutral-500 hover:bg-white/[0.06] hover:text-neutral-200 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-800',
          )}
        >
          <Icon name="notes" className="text-[18px]" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex min-w-0 flex-1 gap-[3px]">
          {counts.map((c) => (
            <Part
              key={c.place.key}
              count={c}
              day={day}
              active={lit(c)}
              dimmed={!!filter && !lit(c)}
              showPoints={showPoints}
              onPick={() => pick(c.place.key)}
            />
          ))}
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-neutral-500">
          {done}/{total} done
        </span>
      </div>
    </div>
  );
};
