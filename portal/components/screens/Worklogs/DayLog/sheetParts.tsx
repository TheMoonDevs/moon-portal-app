'use client';

import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';
import type { PointStatus } from '@/lib/worklogs/timeline';

import { Icon } from '../../Admin/shared/AdminUI';
import type { PickerOption } from './Picker';
import { Picker } from './Picker';
import type {
  DayCompany,
  DayPoint,
  DayProject,
  DayTask,
  PlaceInput,
} from './useDay';

/*
 * The small parts the worklog page's sheet and side panel share: a task's
 * status icon and keys, where a task is (and the list to move it), and the
 * line a task's words are typed in.
 */

export type TaskRowStatus = PointStatus | 'archived' | null;

const STATUS_ICON: Record<
  Exclude<TaskRowStatus, null>,
  { icon: string; className: string }
> = {
  doing: {
    icon: 'clock_loader_40',
    className: 'text-amber-300 auto-light:text-amber-700',
  },
  done: {
    icon: 'check_circle',
    className: 'text-emerald-400 auto-light:text-emerald-600',
  },
  not_done: {
    icon: 'cancel',
    className: 'text-rose-400 auto-light:text-rose-700',
  },
  blocked: {
    icon: 'block',
    className: 'text-rose-400 auto-light:text-rose-700',
  },
  waiting: {
    icon: 'help',
    className: 'text-violet-300 auto-light:text-violet-700',
  },
  archived: {
    icon: 'inventory_2',
    className: 'text-neutral-500',
  },
};

export const StatusIcon = ({
  status,
  className,
}: {
  status: TaskRowStatus;
  className?: string;
}) => {
  // Under way: still an open circle; the yellow dot sits after its words.
  if (status === 'doing')
    return (
      <Icon
        name="radio_button_unchecked"
        className={cn(
          'text-neutral-500 auto-light:text-neutral-400',
          className,
        )}
      />
    );
  if (!status)
    return (
      <Icon
        name="radio_button_unchecked"
        className={cn(
          'text-neutral-600 auto-light:text-neutral-400',
          className,
        )}
      />
    );
  return (
    <Icon
      name={STATUS_ICON[status].icon}
      filled={status === 'done'}
      className={cn(STATUS_ICON[status].className, className)}
    />
  );
};

/** How a task shows on a day: its status, or not done when it was let go. */
export function rowStatus(
  task: DayTask,
  points: DayPoint[] = [],
  date?: string,
): TaskRowStatus {
  if (task.status === 'DONE') return 'done';
  if (task.status === 'ARCHIVED' || task.status === 'IGNORED')
    return 'archived';
  if (task.flag === 'blocked' || task.flag === 'waiting') return task.flag;
  if (task.status === 'IN_PROGRESS' || task.status === 'IN_REVIEW')
    return 'doing';
  const last = points
    .filter(
      (p) => p.taskId === task.id && p.status && (!date || p.date === date),
    )
    .at(-1);
  return last?.status === 'not_done' ? 'not_done' : null;
}

/**
 * A task's work points worth reading: the ones that say something. A bare
 * status (doing, waiting) shows only when it is the latest, since the task's
 * icon already tells the rest.
 */
export const readablePoints = (points: DayPoint[]) =>
  points.filter((p, i) => p.text.trim() || i === points.length - 1);

/** Status keys while typing: the same as the old editor's emoji keys. */
export const statusForKey = (e: React.KeyboardEvent): PointStatus | null => {
  if (e.ctrlKey && !e.altKey && !e.metaKey) {
    if (e.key === ' ') return 'done';
    if (e.key.toLowerCase() === 'q') return 'not_done';
    if (e.key.toLowerCase() === 'p') return 'doing';
  }
  if (e.altKey && !e.ctrlKey && !e.metaKey) {
    const digit = e.code.match(/^(?:Digit|Numpad)(\d)$/)?.[1];
    return (
      (
        {
          '1': 'done',
          '2': 'not_done',
          '3': 'doing',
          '4': 'blocked',
          '8': 'waiting',
        } as Record<string, PointStatus>
      )[digit ?? ''] ?? null
    );
  }
  return null;
};

/** The small yellow dot after an under-way task's words. */
export const DoingDot = ({ className }: { className?: string }) => (
  <span
    title="Under way"
    className={cn(
      'ml-1.5 inline-block size-1.5 rounded-full bg-amber-400 align-middle auto-light:bg-amber-500',
      className,
    )}
  />
);

/* -------------------------------------------------------------------------- */

export type Place = {
  /** For grouping: `project:<id>`, `company:<id>`, `personal` or `none`. */
  key: string;
  kind: 'project' | 'company' | 'personal' | 'none';
  name: string;
  color?: string | null;
  /** Placed by the portal from its words, not by the person. */
  auto?: boolean;
  logo?: string | null;
  /** The company it is in, for a project or company work. */
  companyId?: string;
};

export const PERSONAL_ID = 'personal';

export function placeOf(
  task: Pick<DayTask, 'projectId' | 'companyId' | 'placedBy'>,
  projects: DayProject[],
  companies: DayCompany[],
): Place {
  const auto = task.placedBy === 'auto';
  if (task.projectId) {
    const project = projects.find((p) => p.id === task.projectId);
    return {
      key: `project:${task.projectId}`,
      kind: 'project',
      name: project?.name ?? 'Project',
      color: project?.color,
      logo: project?.logo,
      companyId: project?.companyId,
      auto,
    };
  }
  if (task.companyId === PERSONAL_ID)
    return { key: 'personal', kind: 'personal', name: 'Personal' };
  if (task.companyId) {
    const company = companies.find((c) => c.id === task.companyId);
    return {
      key: `company:${task.companyId}`,
      kind: 'company',
      name: company?.name ?? 'Company',
      color: company?.color,
      logo: company?.logo,
      companyId: task.companyId,
      auto,
    };
  }
  return { key: 'none', kind: 'none', name: 'No project' };
}

/** Where a task can go, for the picker. */
export function placeOptions(
  projects: DayProject[],
  companies: DayCompany[],
): PickerOption[] {
  const names = new Map(companies.map((c) => [c.id, c.name]));
  return [
    ...projects.map((p) => ({
      id: `project:${p.id}`,
      label: p.name,
      hint: names.get(p.companyId) ?? p.companyName,
      group: 'Projects',
      color: p.color,
    })),
    // A company with a CORE project takes its company work there.
    ...companies
      .filter((c) => !c.coreProjectId)
      .map((c) => ({
        id: `company:${c.id}`,
        label: c.name,
        hint: 'Company work, on none of its projects',
        group: 'Company work',
        icon: 'domain',
      })),
    {
      id: 'personal',
      label: 'Personal',
      hint: 'Only you see it',
      group: 'Other',
      icon: 'lock',
    },
    {
      id: 'none',
      label: 'No project',
      hint: 'Stays off every project',
      group: 'Other',
      icon: 'block',
    },
  ];
}

export function placeInput(option: PickerOption): PlaceInput {
  if (option.id.startsWith('project:'))
    return { projectId: option.id.slice(8) };
  if (option.id.startsWith('company:'))
    return { companyId: option.id.slice(8) };
  if (option.id === 'personal') return { personal: true };
  return { none: true };
}

/** A project's or company's logo, or its first letter in its colour. */
export const PlaceLogo = ({
  place,
  className,
}: {
  place: Pick<Place, 'name' | 'color' | 'logo' | 'kind'>;
  className?: string;
}) =>
  place.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={place.logo}
      alt=""
      className={cn('size-4 shrink-0 rounded object-cover', className)}
    />
  ) : (
    <span
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded text-[9px] font-bold uppercase text-white',
        className,
      )}
      style={{ backgroundColor: place.color || '#525252' }}
    >
      {place.kind === 'personal' ? (
        <Icon name="lock" className="text-[10px]" />
      ) : (
        place.name.slice(0, 1)
      )}
    </span>
  );

export const PlaceDot = ({ place }: { place: Place }) =>
  place.kind === 'personal' ? (
    <Icon name="lock" className="text-[12px]" />
  ) : place.kind === 'none' ? (
    <span className="size-1.5 shrink-0 rounded-full border border-dashed border-neutral-500" />
  ) : (
    <span
      className="size-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: place.color || '#a3a3a3' }}
    />
  );

/** Where a task is, as a chip that moves it when clicked. */
export const PlaceChip = ({
  place,
  options,
  onPick,
}: {
  place: Place;
  options?: PickerOption[];
  onPick?: (option: PickerOption) => void;
}) => {
  const chip = (
    <span className="flex min-w-0 items-center gap-1.5">
      <PlaceDot place={place} />
      <span className="truncate">{place.name}</span>
      {place.auto && (
        <span
          title="Placed by the portal from its words. Click to change."
          className="rounded bg-white/[0.06] px-1 text-[10px] text-neutral-500 auto-light:bg-black/[0.06]"
        >
          auto
        </span>
      )}
    </span>
  );
  if (!options || !onPick)
    return <span className="flex min-w-0 items-center">{chip}</span>;
  return (
    <Picker
      options={options}
      onPick={onPick}
      placeholder="Move to a project…"
      trigger={
        <button
          type="button"
          title="Move it to a project"
          className="-mx-1 flex min-w-0 items-center rounded px-1 hover:bg-white/[0.06] hover:text-neutral-200 auto-light:hover:bg-black/[0.06] auto-light:hover:text-neutral-800"
        >
          {chip}
        </button>
      }
    />
  );
};

/* -------------------------------------------------------------------------- */

export const LineInput = ({
  value,
  onChange,
  onKeyDown,
  onBlur,
  inputRef,
  disabled,
  className,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur?: () => void;
  inputRef?: (el: HTMLTextAreaElement | null) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    };
    fit();
    // Fonts and widths settle after the first paint (and on resize).
    const observer = new ResizeObserver(fit);
    observer.observe(el.parentElement ?? el);
    return () => observer.disconnect();
  }, [value]);
  return (
    <textarea
      ref={(el) => {
        ref.current = el;
        inputRef?.(el);
      }}
      rows={1}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      className={cn(
        'block w-full resize-none overflow-hidden bg-transparent text-sm leading-6 placeholder:text-neutral-600 focus:outline-none disabled:cursor-default auto-light:placeholder:text-neutral-400',
        className,
      )}
    />
  );
};
