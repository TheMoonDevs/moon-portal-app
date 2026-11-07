'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import type { DayState, EffortKey } from '@/lib/workspace/goalCalendar';

import { Icon, UserAvatar } from '../Admin/shared/AdminUI';

/* Colours and words shared by the goals calendar. The page is an
 * auto-theme screen: dark by default, `auto-light:` for light mode. */

export const STATE_META: Record<
  Exclude<DayState, 'none'>,
  { label: string; icon: string; pill: string; dot: string; hint: string }
> = {
  done: {
    label: 'Done',
    icon: 'check',
    pill: 'bg-emerald-400/[0.14] text-emerald-200 auto-light:bg-emerald-50 auto-light:text-emerald-800',
    dot: 'bg-emerald-400',
    hint: 'Everything due that day was done.',
  },
  partial: {
    label: 'Part done',
    icon: 'contrast',
    pill: 'bg-amber-300/[0.14] text-amber-100 auto-light:bg-amber-50 auto-light:text-amber-800',
    dot: 'bg-amber-300',
    hint: 'Some of it was done; the day is over.',
  },
  missed: {
    label: 'Missed',
    icon: 'close',
    pill: 'bg-rose-400/[0.14] text-rose-200 auto-light:bg-rose-50 auto-light:text-rose-700',
    dot: 'bg-rose-400',
    hint: 'Due, and the day passed with nothing done.',
  },
  open: {
    label: 'Due now',
    icon: 'radio_button_unchecked',
    pill: 'bg-white/[0.06] text-neutral-100 ring-1 ring-inset ring-white/25 auto-light:bg-white auto-light:text-neutral-900 auto-light:ring-black/20',
    dot: 'bg-white auto-light:bg-neutral-900',
    hint: 'Due and still in time.',
  },
  planned: {
    label: 'Coming up',
    icon: 'schedule',
    pill: 'text-neutral-400 ring-1 ring-inset ring-dashed ring-white/10 auto-light:text-neutral-500 auto-light:ring-black/10',
    dot: 'bg-neutral-500 auto-light:bg-neutral-400',
    hint: 'One of its days, still to come.',
  },
  progress: {
    label: 'Moved',
    icon: 'trending_up',
    pill: 'bg-violet-400/[0.14] text-violet-200 auto-light:bg-violet-50 auto-light:text-violet-800',
    dot: 'bg-violet-400',
    hint: 'A target goal moved closer that day.',
  },
  reached: {
    label: 'Reached',
    icon: 'emoji_events',
    pill: 'bg-amber-300/[0.2] text-amber-100 auto-light:bg-amber-100 auto-light:text-amber-900',
    dot: 'bg-amber-300',
    hint: 'A target goal hit its number that day.',
  },
};

export const EFFORTS: { key: EffortKey; label: string; icon: string }[] = [
  { key: 'HIGH', label: 'High', icon: 'signal_cellular_4_bar' },
  { key: 'MEDIUM', label: 'Medium', icon: 'signal_cellular_3_bar' },
  { key: 'LOW', label: 'Low', icon: 'signal_cellular_1_bar' },
  { key: 'NONE', label: 'Not set', icon: 'signal_cellular_null' },
];

export const effortLabel = (e: EffortKey) =>
  EFFORTS.find((x) => x.key === e)?.label ?? 'Not set';

export const EffortTag = ({
  effort,
  className,
}: {
  effort: EffortKey;
  className?: string;
}) => {
  const meta = EFFORTS.find((x) => x.key === effort) ?? EFFORTS[3];
  return (
    <span
      title={`${meta.label} effort project`}
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        effort === 'HIGH'
          ? 'bg-rose-400/10 text-rose-200 auto-light:bg-rose-50 auto-light:text-rose-700'
          : effort === 'MEDIUM'
            ? 'bg-amber-300/10 text-amber-100 auto-light:bg-amber-50 auto-light:text-amber-800'
            : effort === 'LOW'
              ? 'bg-sky-400/10 text-sky-200 auto-light:bg-sky-50 auto-light:text-sky-800'
              : 'bg-white/[0.05] text-neutral-400 auto-light:bg-black/[0.04] auto-light:text-neutral-500',
        className,
      )}
    >
      <Icon name={meta.icon} className="text-[11px]" />
      {meta.label}
    </span>
  );
};

/** A rounded chip that toggles. */
export const Chip = ({
  active,
  onClick,
  children,
  className,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  title?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    title={title}
    className={cn(
      'flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors',
      active
        ? 'bg-white text-neutral-950 auto-light:bg-neutral-900 auto-light:text-white'
        : 'bg-white/[0.04] text-neutral-400 hover:bg-white/[0.08] hover:text-neutral-100 auto-light:bg-black/[0.04] auto-light:text-neutral-600 auto-light:hover:bg-black/[0.08] auto-light:hover:text-neutral-950',
      className,
    )}
  >
    {children}
  </button>
);

export const card =
  'rounded-2xl border border-white/[0.07] bg-white/[0.02] auto-light:border-black/[0.08] auto-light:bg-white';

export const muted = 'text-neutral-500 auto-light:text-neutral-500';
export const strong = 'text-white auto-light:text-neutral-950';

/** A slim bar that fills to `percent`. */
export const Bar = ({
  percent,
  color,
  className,
}: {
  percent: number;
  color: string;
  className?: string;
}) => (
  <span
    className={cn(
      'block h-1.5 overflow-hidden rounded-full bg-white/[0.07] auto-light:bg-black/[0.07]',
      className,
    )}
  >
    <span
      className="block h-full rounded-full transition-[width] duration-500"
      style={{
        width: `${Math.max(0, Math.min(100, percent))}%`,
        backgroundColor: color,
      }}
    />
  </span>
);

/** "2 Nov", "Mon 2 Nov". */
export const fmtDay = (day: string, opts: Intl.DateTimeFormatOptions = {}) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    ...opts,
  });

export const fmtNum = (n: number) => n.toLocaleString('en-US');

/** A project's logo, else its first letter on its colour. */
export const ProjectLogo = ({
  project,
  size = 20,
  className,
}: {
  project: { name: string; color?: string | null; logo?: string | null };
  size?: number;
  className?: string;
}) => {
  const radius = Math.round(size * 0.3);
  return project.logo ? (
    <UserAvatar
      src={project.logo}
      name={project.name}
      size={size}
      className={cn('border-0', className)}
    />
  ) : (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: project.color || '#525252',
        fontSize: Math.max(9, size * 0.48),
      }}
      className={cn(
        'flex shrink-0 items-center justify-center font-semibold leading-none text-white',
        className,
      )}
    >
      {(project.name || '?').slice(0, 1).toUpperCase()}
    </span>
  );
};

/** A company's name as a quiet, letter-spaced divider between sections. */
export const CompanyDivider = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => (
  <div className={cn('flex items-center gap-2.5', className)}>
    <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
      {name}
    </span>
    <span className="h-px flex-1 bg-white/[0.06] auto-light:bg-black/[0.07]" />
  </div>
);

/** A small ring that fills to `percent`. */
export const Ring = ({
  percent,
  size = 44,
  stroke = 4,
  color = '#34d399',
}: {
  percent: number | null;
  size?: number;
  stroke?: number;
  color?: string;
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent ?? 0));
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        className="stroke-white/[0.08] auto-light:stroke-black/[0.08]"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - p / 100)}
        className="transition-[stroke-dashoffset] duration-700"
      />
    </svg>
  );
};

/** Green when most of it is done, amber halfway, rose below. */
export const rateColor = (pct: number | null) =>
  pct == null
    ? '#737373'
    : pct >= 80
      ? '#34d399'
      : pct >= 50
        ? '#fcd34d'
        : '#fb7185';
