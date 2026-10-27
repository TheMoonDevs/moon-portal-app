'use client';

import type { ProjectGoal, User } from '@db/client';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import type { WorkspaceCompany } from '@/utils/hooks/useWorkspace';

import {
  CheckBox,
  Icon,
  NativeSelect,
  type PillTone,
  SearchInput,
  UserAvatar,
} from '../shared/AdminUI';

/** Turns an API rejection into a sentence for a toast. */
export const errorText = (err: unknown, fallback = 'Something went wrong.') => {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const e = err as { error?: unknown; message?: unknown };
    if (typeof e.error === 'string') return e.error;
    if (typeof e.message === 'string') return e.message;
  }
  return fallback;
};

export const BRAND_COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#f43f5e',
  '#a855f7',
  '#14b8a6',
  '#64748b',
];

export const ColorPicker = ({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (color: string) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {BRAND_COLORS.map((color) => (
      <button
        key={color}
        type="button"
        aria-label={`Color ${color}`}
        onClick={() => onChange(color)}
        style={{ backgroundColor: color }}
        className={cn(
          'size-7 rounded-full border-2 transition-transform hover:scale-110',
          value === color ? 'border-white' : 'border-transparent',
        )}
      />
    ))}
  </div>
);

export const CompanyMark = ({
  name,
  color,
  logo,
  size = 36,
}: {
  name?: string | null;
  color?: string | null;
  logo?: string | null;
  size?: number;
}) =>
  logo ? (
    <UserAvatar src={logo} name={name} size={size} className="rounded-xl" />
  ) : (
    <span
      style={{
        width: size,
        height: size,
        backgroundColor: color || '#404040',
        fontSize: size / 2.4,
      }}
      className="flex shrink-0 items-center justify-center rounded-xl font-bold text-white"
    >
      {(name || '?').slice(0, 1).toUpperCase()}
    </span>
  );

export const CompanyPicker = ({
  companies,
  value,
  onChange,
  className,
}: {
  companies: WorkspaceCompany[];
  value: string | null;
  onChange: (companyId: string) => void;
  className?: string;
}) => (
  <NativeSelect
    aria-label="Company"
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    className={cn('min-w-[200px]', className)}
  >
    {!value && <option value="">Choose a company</option>}
    {companies.map(({ company }) => (
      <option key={company.id} value={company.id}>
        {company.name}
      </option>
    ))}
  </NativeSelect>
);

export const ProgressBar = ({
  percent,
  color,
  className,
}: {
  percent: number;
  color?: string | null;
  className?: string;
}) => (
  <div
    className={cn(
      'h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]',
      className,
    )}
    role="progressbar"
    aria-valuenow={percent}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <div
      className="h-full rounded-full transition-[width] duration-500"
      style={{
        width: `${Math.min(100, Math.max(0, percent))}%`,
        backgroundColor: color || '#10b981',
      }}
    />
  </div>
);

export const PROJECT_STATUS_META: Record<
  string,
  { label: string; tone: PillTone }
> = {
  PLANNING: { label: 'Planning', tone: 'info' },
  ACTIVE: { label: 'Active', tone: 'positive' },
  ON_HOLD: { label: 'On hold', tone: 'warning' },
  COMPLETED: { label: 'Completed', tone: 'purple' },
  ARCHIVED: { label: 'Archived', tone: 'neutral' },
};

/** How much work a project takes, shown as a small label. */
export const EFFORT_META: Record<string, { label: string; icon: string }> = {
  LOW: { label: 'Low effort', icon: 'signal_cellular_1_bar' },
  MEDIUM: { label: 'Medium effort', icon: 'signal_cellular_3_bar' },
  HIGH: { label: 'High effort', icon: 'signal_cellular_4_bar' },
};

export const TASK_STATUS_META: Record<
  string,
  { label: string; tone: PillTone; icon: string }
> = {
  TODO: { label: 'To do', tone: 'neutral', icon: 'radio_button_unchecked' },
  IN_PROGRESS: {
    label: 'In progress',
    tone: 'info',
    icon: 'progress_activity',
  },
  IN_REVIEW: { label: 'In review', tone: 'warning', icon: 'rate_review' },
  DONE: { label: 'Done', tone: 'positive', icon: 'check_circle' },
  IGNORED: { label: 'Won’t do', tone: 'neutral', icon: 'block' },
  ARCHIVED: { label: 'Archived', tone: 'neutral', icon: 'inventory_2' },
};

/**
 * Picks the goal (or one part of a goal) a task counts towards. The value is
 * `goalId:partId`, with an empty part for the whole goal and '' for none.
 */
export const GoalPicker = ({
  goals,
  value,
  onChange,
  className,
}: {
  goals: ProjectGoal[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) => (
  <NativeSelect
    aria-label="Goal"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={className}
  >
    <option value="">No goal</option>
    {goals.map((goal) =>
      goal.parts?.length ? (
        <optgroup key={goal.id} label={goal.title}>
          {goal.parts.map((part) => (
            <option key={part.id} value={`${goal.id}:${part.id}`}>
              {goal.title} · {part.label}
            </option>
          ))}
        </optgroup>
      ) : (
        <option key={goal.id} value={`${goal.id}:`}>
          {goal.title}
        </option>
      ),
    )}
  </NativeSelect>
);

/** Searchable multi-select of people. */
export const PeoplePicker = ({
  users,
  value,
  onChange,
  max,
}: {
  users: Array<Pick<User, 'id' | 'name' | 'avatar' | 'email'>>;
  value: string[];
  onChange: (ids: string[]) => void;
  max?: number;
}) => {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q),
    );
  }, [users, search]);

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else if (max === 1) onChange([id]);
    else if (!max || value.length < max) onChange([...value, id]);
  };

  return (
    <div className="flex flex-col gap-2">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search people…"
      />
      <div className="custom-scrollbar max-h-56 overflow-y-auto rounded-lg border border-white/[0.07]">
        {filtered.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-neutral-500">
            Nobody matches that search.
          </p>
        )}
        {filtered.map((u) => {
          const selected = value.includes(u.id);
          return (
            <button
              type="button"
              key={u.id}
              onClick={() => toggle(u.id)}
              className={cn(
                'flex w-full items-center gap-3 border-b border-white/[0.05] px-3 py-2 text-left last:border-b-0 hover:bg-white/[0.04]',
                selected && 'bg-white/[0.06]',
              )}
            >
              <CheckBox checked={selected} size="sm" />
              <UserAvatar src={u.avatar} name={u.name} size={26} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-neutral-200">
                  {u.name || 'Unnamed'}
                </span>
                <span className="block truncate text-[11px] text-neutral-500">
                  {u.email}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const AvatarStack = ({
  users,
  max = 4,
}: {
  users: Array<Pick<User, 'id' | 'name' | 'avatar'>>;
  max?: number;
}) => (
  <div className="flex items-center -space-x-2">
    {users.slice(0, max).map((u) => (
      <UserAvatar
        key={u.id}
        src={u.avatar}
        name={u.name}
        size={24}
        className="ring-2 ring-neutral-950"
      />
    ))}
    {users.length > max && (
      <span className="flex size-6 items-center justify-center rounded-full bg-neutral-800 text-[10px] text-neutral-400 ring-2 ring-neutral-950">
        +{users.length - max}
      </span>
    )}
  </div>
);

export const NeedsCompany = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm text-neutral-400">
    <Icon name="domain" className="text-[18px]" />
    {text}
  </div>
);
