'use client';

import * as HoverCard from '@radix-ui/react-hover-card';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import { APP_ROUTES } from '@/utils/constants/appInfo';

import { Icon } from '../Admin/shared/AdminUI';
import { AvatarStack, CompanyMark } from '../Admin/Workspace/shared';
import type { Person } from '../Project/types';
import {
  familyOf,
  goalLines,
  monthName,
  monthTasks,
  type OverviewProject,
  pulseOf,
  PULSES,
} from './overview';

const Stat = ({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone?: string;
}) => (
  <div className="flex-1 rounded-lg bg-white/[0.04] px-2.5 py-1.5">
    <p className={cn('text-sm font-semibold tabular-nums text-white', tone)}>
      {value.toLocaleString('en-US')}
    </p>
    <p className="text-[10px] text-neutral-500">{label}</p>
  </div>
);

/**
 * A sub-project's badge in its parent's card. Hovering it opens a card with
 * how the sub-project is doing; clicking it opens the sub-project.
 */
export const SubProjectBadge = ({
  project,
  all,
  people,
  fallbackColor,
}: {
  project: OverviewProject;
  all: OverviewProject[];
  people: Map<string, Person>;
  fallbackColor: string;
}) => {
  const color = project.color || fallbackColor;
  const href = `${APP_ROUTES.projects}/${project.id}`;
  const pulse = pulseOf(project);
  const month = monthTasks(project, all);
  const goals = goalLines(project);
  const below = familyOf(project, all).length - 1;
  const team = [
    ...project.activity.people,
    ...(project.leadIds ?? []),
    ...(project.memberIds ?? []),
  ]
    .filter((id, i, list) => list.indexOf(id) === i)
    .map((id) => people.get(id))
    .filter((p): p is Person => !!p);
  const leads = (project.leadIds ?? [])
    .map((id) => people.get(id)?.name)
    .filter(Boolean);

  return (
    <HoverCard.Root openDelay={150} closeDelay={80}>
      <HoverCard.Trigger asChild>
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="flex max-w-[150px] items-center gap-1.5 rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] text-neutral-300 outline-none transition-colors hover:bg-white/[0.1] hover:text-white focus-visible:bg-white/[0.1]"
        >
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="truncate">{project.name}</span>
        </Link>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onClick={(e) => e.stopPropagation()}
          className="z-[100] w-[290px] rounded-2xl border border-white/10 bg-neutral-900/95 p-3.5 text-xs text-neutral-300 shadow-2xl backdrop-blur animate-in fade-in-0 zoom-in-95"
        >
          <div className="flex items-center gap-2.5">
            <CompanyMark
              name={project.name}
              color={color}
              logo={project.logo}
              size={32}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {project.name}
              </p>
              <p className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                <span
                  className={cn('size-1.5 rounded-full', PULSES[pulse].dot)}
                />
                {PULSES[pulse].label}
                {below > 0 && (
                  <span>
                    · {below} sub-project{below === 1 ? '' : 's'}
                  </span>
                )}
              </p>
            </div>
          </div>

          {project.description && (
            <p className="mt-2.5 line-clamp-2 text-neutral-400">
              {project.description}
            </p>
          )}

          {goals.length > 0 && (
            <div className="mt-2.5 flex flex-col gap-1">
              {goals.map((g) => (
                <p key={g.id} className="flex items-center gap-1.5">
                  <Icon
                    name={g.met ? 'check_circle' : 'track_changes'}
                    className={cn(
                      'text-[14px]',
                      g.met ? 'text-emerald-400' : 'text-neutral-500',
                    )}
                  />
                  <span className={cn(g.met && 'text-emerald-300')}>
                    {g.text}
                  </span>
                </p>
              ))}
            </div>
          )}

          <p className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            {monthName()} so far
          </p>
          <div className="flex gap-1.5">
            <Stat value={month.done} label="tasks done" />
            <Stat value={month.open} label="open" />
            <Stat
              value={month.overdue}
              label="overdue"
              tone={month.overdue ? 'text-rose-300' : undefined}
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            {team.length > 0 ? (
              <div className="flex min-w-0 items-center gap-2">
                <AvatarStack users={team} max={4} />
                {leads.length > 0 && (
                  <span className="truncate text-[11px] text-neutral-500">
                    Led by {leads.join(', ')}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-neutral-500">
                Nobody on it yet
              </span>
            )}
            <Link
              href={href}
              className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-white hover:underline"
            >
              Open
              <Icon name="arrow_forward" className="text-[13px]" />
            </Link>
          </div>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
};
