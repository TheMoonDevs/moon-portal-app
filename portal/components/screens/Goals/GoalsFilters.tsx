'use client';

import * as Popover from '@radix-ui/react-popover';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import {
  type CalendarCompany,
  type CalendarProject,
  type EffortKey,
  GOAL_STATUS,
  type GoalStatus,
} from '@/lib/workspace/goalCalendar';
import type { GoalPeriod } from '@/models/workspace';

import { Icon, UserAvatar } from '../Admin/shared/AdminUI';
import { EFFORTS } from './ui';

export type GoalKindKey = 'scheduled' | 'target';

export type Filters = {
  q: string;
  companyId: string | null;
  efforts: EffortKey[];
  projectIds: string[];
  statuses: GoalStatus[];
  kinds: GoalKindKey[];
  cadences: GoalPeriod[];
  /** A person the goals are for (or whose team owns them). */
  personId: string | null;
};

export const NO_FILTERS: Filters = {
  q: '',
  companyId: null,
  efforts: [],
  projectIds: [],
  statuses: [],
  kinds: [],
  cadences: [],
  personId: null,
};

export const CADENCES: { key: GoalPeriod; label: string }[] = [
  { key: 'day', label: 'Daily' },
  { key: 'week', label: 'Weekly' },
  { key: 'fortnight', label: 'Every 2 weeks' },
  { key: 'month', label: 'Monthly' },
  { key: 'quarter', label: 'Quarterly' },
];

const KINDS: { key: GoalKindKey; label: string; icon: string }[] = [
  { key: 'scheduled', label: 'Repeating', icon: 'event_repeat' },
  { key: 'target', label: 'Target', icon: 'flag' },
];

const toggle = <T,>(list: T[], v: T) =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

/** How many filters are on, not counting the company and effort rows. */
export const extraCount = (f: Filters) =>
  f.projectIds.length +
  f.statuses.length +
  f.kinds.length +
  f.cadences.length +
  (f.personId ? 1 : 0);

const menu =
  'auto-theme z-[60] w-[260px] rounded-2xl border border-white/10 bg-neutral-900/95 p-1.5 text-sm text-neutral-200 shadow-2xl shadow-black/50 backdrop-blur animate-in fade-in-0 zoom-in-95 auto-light:border-black/10 auto-light:bg-white/95 auto-light:text-neutral-800 auto-light:shadow-black/10';

const Option = ({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors',
      on
        ? 'bg-white/[0.08] text-white auto-light:bg-black/[0.06] auto-light:text-neutral-950'
        : 'hover:bg-white/[0.05] auto-light:hover:bg-black/[0.04]',
    )}
  >
    <span
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-[5px] border',
        on
          ? 'border-white bg-white text-neutral-950 auto-light:border-neutral-900 auto-light:bg-neutral-900 auto-light:text-white'
          : 'border-white/20 auto-light:border-black/20',
      )}
    >
      {on && <Icon name="check" className="text-[12px]" />}
    </span>
    {children}
  </button>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div className="py-1">
    <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
      {title}
    </p>
    {children}
  </div>
);

/** A chip that opens a menu of choices. */
const MenuChip = ({
  label,
  icon,
  count,
  children,
}: {
  label: string;
  icon: string;
  count: number;
  children: ReactNode;
}) => (
  <Popover.Root>
    <Popover.Trigger asChild>
      <button
        type="button"
        className={cn(
          'flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors',
          count
            ? 'bg-white/[0.12] text-white ring-1 ring-inset ring-white/25 auto-light:bg-black/[0.07] auto-light:text-neutral-950 auto-light:ring-black/20'
            : 'text-neutral-400 ring-1 ring-inset ring-white/[0.07] hover:bg-white/[0.05] hover:text-neutral-100 auto-light:text-neutral-600 auto-light:ring-black/[0.08] auto-light:hover:bg-black/[0.04]',
        )}
      >
        <Icon name={icon} className="text-[15px]" />
        {label}
        {count > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] text-neutral-950 auto-light:bg-neutral-900 auto-light:text-white">
            {count}
          </span>
        )}
        <Icon name="expand_more" className="-mr-1 text-[15px] opacity-60" />
      </button>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className={menu}
      >
        <div className="custom-scrollbar max-h-[60vh] overflow-y-auto">
          {children}
        </div>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
);

/** A row of buttons in one pill, with an optional quiet label. */
const Segmented = ({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) => (
  <div className="flex h-8 shrink-0 items-center gap-0.5 rounded-full bg-white/[0.04] p-0.5 ring-1 ring-inset ring-white/[0.06] auto-light:bg-black/[0.035] auto-light:ring-black/[0.05]">
    {label && (
      <span className="px-2 text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </span>
    )}
    {children}
  </div>
);

const SegButton = ({
  active,
  onClick,
  children,
  title,
  muted,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
  muted?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    title={title}
    className={cn(
      'flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors',
      active
        ? 'bg-white text-neutral-950 shadow-sm auto-light:bg-neutral-900 auto-light:text-white'
        : cn(
            'text-neutral-400 hover:text-neutral-100 auto-light:text-neutral-600 auto-light:hover:text-neutral-950',
            muted && 'opacity-50',
          ),
    )}
  >
    {children}
  </button>
);

/**
 * The goals calendar's filters: a search box, companies, effort level (from
 * each goal's project), and menus for projects, status, kind, how often
 * and who it is for.
 */
export const GoalsFilters = ({
  filters,
  onChange,
  companies,
  projects,
  people,
  meId,
  counts,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  companies: CalendarCompany[];
  /** Projects with goals, in the companies shown. */
  projects: CalendarProject[];
  people: { id: string; name?: string | null; avatar?: string | null }[];
  meId?: string | null;
  /** Goals per effort level, before the effort filter. */
  counts: Record<EffortKey, number>;
}) => {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const any =
    !!filters.q ||
    !!filters.companyId ||
    filters.efforts.length > 0 ||
    extraCount(filters) > 0;
  const byCompany = companies
    .map((c) => ({ c, list: projects.filter((p) => p.companyId === c.id) }))
    .filter((g) => g.list.length);
  const person = people.find((p) => p.id === filters.personId);

  return (
    <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:gap-x-3 md:gap-y-2 md:overflow-visible md:px-0">
      <label className="flex h-8 w-44 shrink-0 items-center gap-1.5 rounded-full bg-white/[0.04] px-3 text-xs text-neutral-400 ring-1 ring-inset ring-white/[0.06] focus-within:ring-white/25 auto-light:bg-white auto-light:text-neutral-500 auto-light:ring-black/[0.08] auto-light:focus-within:ring-black/25">
        <Icon name="search" className="text-[15px]" />
        <input
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Find a goal"
          className="min-w-0 flex-1 bg-transparent text-neutral-100 outline-none placeholder:text-neutral-500 auto-light:text-neutral-900"
        />
        {filters.q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => set({ q: '' })}
          >
            <Icon name="close" className="text-[14px]" />
          </button>
        )}
      </label>

      {companies.length > 1 && (
        <Segmented>
          <SegButton
            active={!filters.companyId}
            onClick={() => set({ companyId: null, projectIds: [] })}
          >
            All
          </SegButton>
          {companies.map((c) => (
            <SegButton
              key={c.id}
              active={filters.companyId === c.id}
              onClick={() =>
                set({
                  companyId: filters.companyId === c.id ? null : c.id,
                  projectIds: [],
                })
              }
            >
              {c.name}
            </SegButton>
          ))}
        </Segmented>
      )}

      <Segmented label="Effort">
        {EFFORTS.map((e) => (
          <SegButton
            key={e.key}
            active={filters.efforts.includes(e.key)}
            onClick={() => set({ efforts: toggle(filters.efforts, e.key) })}
            title={`Goals of ${e.label.toLowerCase()} effort projects`}
            muted={!counts[e.key]}
          >
            {e.label}
            <span className="tabular-nums opacity-50">{counts[e.key]}</span>
          </SegButton>
        ))}
      </Segmented>

      <div className="flex shrink-0 items-center gap-1.5">
        <MenuChip
          label="Project"
          icon="folder"
          count={filters.projectIds.length}
        >
          {byCompany.map(({ c, list }) => (
            <Section key={c.id} title={c.name}>
              {list.map((p) => (
                <Option
                  key={p.id}
                  on={filters.projectIds.includes(p.id)}
                  onClick={() =>
                    set({ projectIds: toggle(filters.projectIds, p.id) })
                  }
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: p.color || '#10b981' }}
                  />
                  <span className="truncate">{p.name}</span>
                </Option>
              ))}
            </Section>
          ))}
          {!byCompany.length && (
            <p className="p-3 text-xs text-neutral-500">
              No projects with goals.
            </p>
          )}
        </MenuChip>

        <MenuChip
          label="Status"
          icon="donut_large"
          count={filters.statuses.length}
        >
          <Section title="Repeating goals, this period">
            {(['met', 'on_track', 'behind', 'not_started'] as GoalStatus[]).map(
              (s) => (
                <Option
                  key={s}
                  on={filters.statuses.includes(s)}
                  onClick={() => set({ statuses: toggle(filters.statuses, s) })}
                >
                  <span
                    className={cn('size-2 rounded-full', GOAL_STATUS[s].dot)}
                  />
                  <span className="flex-1">{GOAL_STATUS[s].label}</span>
                </Option>
              ),
            )}
          </Section>
          <Section title="Target goals">
            {(['climbing', 'reached'] as GoalStatus[]).map((s) => (
              <Option
                key={s}
                on={filters.statuses.includes(s)}
                onClick={() => set({ statuses: toggle(filters.statuses, s) })}
              >
                <span
                  className={cn('size-2 rounded-full', GOAL_STATUS[s].dot)}
                />
                <span className="flex-1">{GOAL_STATUS[s].label}</span>
              </Option>
            ))}
          </Section>
        </MenuChip>

        <MenuChip
          label="Type"
          icon="category"
          count={filters.kinds.length + filters.cadences.length}
        >
          <Section title="Kind">
            {KINDS.map((k) => (
              <Option
                key={k.key}
                on={filters.kinds.includes(k.key)}
                onClick={() => set({ kinds: toggle(filters.kinds, k.key) })}
              >
                <Icon name={k.icon} className="text-[15px] text-neutral-400" />
                {k.label}
              </Option>
            ))}
          </Section>
          <Section title="How often">
            {CADENCES.map((c) => (
              <Option
                key={c.key}
                on={filters.cadences.includes(c.key)}
                onClick={() =>
                  set({ cadences: toggle(filters.cadences, c.key) })
                }
              >
                {c.label}
              </Option>
            ))}
          </Section>
        </MenuChip>

        <MenuChip
          label={person ? (person.name ?? 'Person').split(' ')[0] : 'Person'}
          icon="person"
          count={filters.personId ? 1 : 0}
        >
          {meId && (
            <Option
              on={filters.personId === meId}
              onClick={() =>
                set({ personId: filters.personId === meId ? null : meId })
              }
            >
              <span className="flex-1 font-medium">My goals</span>
            </Option>
          )}
          <Section title="For">
            {people
              .filter((p) => p.id !== meId)
              .map((p) => (
                <Option
                  key={p.id}
                  on={filters.personId === p.id}
                  onClick={() =>
                    set({ personId: filters.personId === p.id ? null : p.id })
                  }
                >
                  <UserAvatar src={p.avatar} name={p.name} size={20} />
                  <span className="truncate">{p.name}</span>
                </Option>
              ))}
          </Section>
        </MenuChip>

        {any && (
          <button
            type="button"
            onClick={() => onChange(NO_FILTERS)}
            className="flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs text-neutral-400 hover:text-white auto-light:text-neutral-500 auto-light:hover:text-neutral-950"
          >
            <Icon name="filter_alt_off" className="text-[15px]" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
};
