'use client';

import type { User } from '@db/client';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import {
  describeGoalSchedule,
  mondayOf,
  PERIOD_LABELS,
  toDay,
  WEEKDAYS,
} from '@/lib/workspace/projects';
import type {
  GoalKind,
  GoalPeriod,
  GoalSlot,
  ProjectGoal,
} from '@/models/workspace';

import {
  AdminButton,
  Icon,
  IconAction,
  NativeSelect,
  Segmented,
  TextInput,
} from '../shared/AdminUI';
import { ImageField } from '../shared/ImageField';
import { PeoplePicker } from './shared';

export type GoalDraft = Omit<ProjectGoal, 'id' | 'parts'> & {
  id?: string;
  parts?: { id?: string; label: string; target: number }[];
};

const tempId = () => `new-${Math.random().toString(36).slice(2, 8)}`;

export const KIND_META: Record<
  GoalKind,
  { label: string; icon: string; hint: string }
> = {
  scheduled: {
    label: 'Repeats',
    icon: 'event_repeat',
    hint: 'A target every day, week, 2 weeks, month or quarter, like “2 releases a week”. It makes its own dated tasks; each period is met or missed.',
  },
  target: {
    label: 'Target',
    icon: 'emoji_events',
    hint: 'One number to reach, like “1,000 subscribers”. It adds up from today and becomes an achievement when reached.',
  },
};

export const newGoalDraft = (kind: GoalKind = 'scheduled'): GoalDraft => ({
  title: '',
  kind,
  target: kind === 'target' ? 100 : 1,
  period: 'week',
});

const NumberBox = ({
  value,
  onChange,
  label,
  wide,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  wide?: boolean;
}) => (
  <TextInput
    aria-label={label}
    type="number"
    min={1}
    value={value || ''}
    onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value))))}
    className={cn('text-center', wide ? 'w-28' : 'w-20')}
  />
);

/** Weekday chips; none picked means one batch on Monday. */
const DayPicker = ({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) => (
  <div className="flex flex-wrap gap-1">
    {[1, 2, 3, 4, 5, 6, 0].map((d) => {
      const on = value.includes(d);
      return (
        <button
          key={d}
          type="button"
          aria-pressed={on}
          onClick={() =>
            onChange(on ? value.filter((x) => x !== d) : [...value, d].sort())
          }
          className={cn(
            'h-7 rounded-md px-2 text-xs font-medium transition-colors',
            on
              ? 'bg-white text-neutral-950'
              : 'bg-white/[0.05] text-neutral-400 hover:bg-white/[0.1] hover:text-neutral-100',
          )}
        >
          {WEEKDAYS[d]}
        </button>
      );
    })}
  </div>
);

/** "Date" or which weekday of the month a slot is. */
const NTH_OPTIONS = [
  { value: 0, label: 'Date' },
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
  { value: 5, label: 'Last' },
];

const smallSelect = 'h-8 py-0 pl-2 pr-7 text-xs';

/**
 * The days of a month or quarter a goal makes its tasks on: dates (the
 * 1st, the 21st) or weekdays (the 1st Monday, the last Friday); in a
 * quarter, each in one of its three months. None: one batch at the start.
 */
const SlotsPicker = ({
  value,
  quarter,
  firstDate,
  onChange,
}: {
  value: GoalSlot[];
  quarter: boolean;
  /** The date a first slot starts on (a monthly goal's old day). */
  firstDate: number;
  onChange: (slots: GoalSlot[]) => void;
}) => {
  const set = (k: number, slot: GoalSlot) =>
    onChange(value.map((s, m) => (m === k ? slot : s)));
  return (
    <div className="flex flex-col gap-1.5">
      {value.map((slot, k) => {
        const nth = slot.nth ?? 0;
        const month = quarter ? { month: slot.month ?? 1 } : {};
        return (
          <div key={k} className="flex flex-wrap items-center gap-1.5">
            {quarter && (
              <NativeSelect
                aria-label="Month of the quarter"
                value={slot.month ?? 1}
                onChange={(e) =>
                  set(k, { ...slot, month: Number(e.target.value) })
                }
                className={cn(smallSelect, 'w-28')}
              >
                <option value={1}>1st month</option>
                <option value={2}>2nd month</option>
                <option value={3}>3rd month</option>
              </NativeSelect>
            )}
            <NativeSelect
              aria-label="Date or weekday"
              value={nth}
              onChange={(e) => {
                const n = Number(e.target.value);
                set(
                  k,
                  n
                    ? { ...month, nth: n, weekday: slot.weekday ?? 1 }
                    : { ...month, date: slot.date ?? 1 },
                );
              }}
              className={cn(smallSelect, 'w-20')}
            >
              {NTH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
            {nth ? (
              <NativeSelect
                aria-label="Weekday"
                value={slot.weekday ?? 1}
                onChange={(e) =>
                  set(k, { ...slot, weekday: Number(e.target.value) })
                }
                className={cn(smallSelect, 'w-20')}
              >
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <option key={d} value={d}>
                    {WEEKDAYS[d]}
                  </option>
                ))}
              </NativeSelect>
            ) : (
              <TextInput
                aria-label="Date of the month"
                type="number"
                min={1}
                max={31}
                value={slot.date ?? 1}
                onChange={(e) =>
                  set(k, {
                    ...month,
                    date: Math.min(
                      31,
                      Math.max(1, Math.round(Number(e.target.value)) || 1),
                    ),
                  })
                }
                className="h-8 w-16 text-center text-xs"
              />
            )}
            <span>{nth ? 'of the month' : 'day of the month'}</span>
            <IconAction
              icon="close"
              label="Remove day"
              onClick={() => onChange(value.filter((_, m) => m !== k))}
            />
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => {
          const last = value[value.length - 1];
          onChange([
            ...value,
            last
              ? last.nth
                ? { ...last, nth: Math.min(5, (last.nth ?? 1) + 2) }
                : { ...last, date: Math.min(31, (last.date ?? 1) + 14) }
              : { ...(quarter && { month: 1 }), date: firstDate },
          ]);
        }}
        className="self-start text-xs text-neutral-400 hover:text-neutral-200"
      >
        {value.length
          ? '+ Add a day'
          : quarter
            ? 'Pick days (else all on the quarter’s first day)'
            : 'Pick days (else all on one day)'}
      </button>
      {value.some((s) => (s.date ?? 0) > 28) && (
        <span className="text-[11px] text-neutral-600">
          In shorter months, a date past the end falls on the last day.
        </span>
      )}
    </div>
  );
};

/**
 * How the period's target splits over the picked days, in words: "3 shorts
 * a week over 3 days: 1 on each day, not 3". When it does not split evenly,
 * says how many that makes, since each day gets the same number.
 */
const SpreadNote = ({ goal, total }: { goal: GoalDraft; total: number }) => {
  const days =
    goal.period === 'week' || goal.period === 'fortnight'
      ? (goal.days ?? []).length
      : goal.period === 'month' || goal.period === 'quarter'
        ? (goal.slots ?? []).length
        : 0;
  if (days < 2 || total < 1) return null;
  const each = Math.ceil(total / days);
  const what = goal.title.trim() || 'tasks';
  const per = PERIOD_LABELS[goal.period];
  if (each * days === total)
    return (
      <p className="text-[11px] text-neutral-400">
        {total} {what} {per} over {days} days:{' '}
        <span className="font-medium text-neutral-200">{each} on each day</span>
        {each !== total && `, not ${total} on each`}.
      </p>
    );
  return (
    <p className="flex items-start gap-1.5 text-[11px] text-amber-300/90">
      <Icon name="warning" className="mt-px text-[13px]" />
      {total} doesn’t split evenly over {days} days, so each day gets {each} (
      {each * days} {per}). Set the target to a multiple of {days}, or pick
      other days.
    </p>
  );
};

/**
 * One goal: what kind, the target, and for a repeating one when its tasks
 * are made and for whom.
 */
export const GoalFields = ({
  goal,
  onChange,
  users,
  onRemove,
}: {
  goal: GoalDraft;
  onChange: (patch: Partial<GoalDraft>) => void;
  /** People who can be on it; leave out to hide the picker. */
  users?: User[];
  onRemove?: () => void;
}) => {
  const kind = goal.kind ?? 'scheduled';
  const isTarget = kind === 'target';
  const parts = goal.parts ?? [];
  const total = parts.length
    ? parts.reduce((n, p) => n + (p.target || 0), 0)
    : goal.target;
  const makesTasks = goal.makeTasks !== false;
  const [addingImage, setAddingImage] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
      <div className="flex items-center justify-between gap-2">
        <Segmented<GoalKind>
          value={kind}
          onChange={(k) =>
            onChange({
              kind: k,
              ...(k === 'target' && { parts: undefined, days: undefined }),
            })
          }
          options={(Object.keys(KIND_META) as GoalKind[]).map((k) => ({
            value: k,
            label: KIND_META[k].label,
            icon: KIND_META[k].icon,
          }))}
        />
        {onRemove && (
          <IconAction
            icon="delete"
            label="Remove goal"
            tone="danger"
            onClick={onRemove}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isTarget && <span className="text-sm text-neutral-400">Reach</span>}
        {parts.length ? (
          <span className="w-20 text-center text-sm font-semibold text-white">
            {total}
          </span>
        ) : (
          <NumberBox
            label="Target"
            wide={isTarget}
            value={goal.target}
            onChange={(target) => onChange({ target })}
          />
        )}
        <TextInput
          aria-label="Goal"
          value={goal.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={isTarget ? 'subscribers' : 'songs released'}
          className="min-w-[160px] flex-1"
        />
        {!isTarget && (
          <NativeSelect
            aria-label="Every"
            value={goal.period}
            onChange={(e) =>
              onChange({
                period: e.target.value as GoalPeriod,
                days: [],
                slots: [],
              })
            }
            className="w-36"
          >
            {(Object.keys(PERIOD_LABELS) as GoalPeriod[]).map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABELS[p]}
              </option>
            ))}
          </NativeSelect>
        )}
      </div>

      {!isTarget && (
        <div className="flex flex-col gap-2 rounded-lg bg-white/[0.02] p-2.5">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-300">
            <input
              type="checkbox"
              checked={makesTasks}
              onChange={(e) => onChange({ makeTasks: e.target.checked })}
              className="accent-white"
            />
            Make its tasks on their days
          </label>
          {makesTasks &&
            (goal.period === 'week' || goal.period === 'fortnight') && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                Spread over
                <DayPicker
                  value={goal.days ?? []}
                  onChange={(days) => onChange({ days })}
                />
                {goal.period === 'fortnight' && (
                  <span>
                    every other week, from the week of{' '}
                    {new Date(
                      `${mondayOf(goal.since || toDay())}T00:00:00Z`,
                    ).toLocaleDateString('en', {
                      day: 'numeric',
                      month: 'short',
                      timeZone: 'UTC',
                    })}
                  </span>
                )}
              </div>
            )}
          {makesTasks &&
            (goal.period === 'month' || goal.period === 'quarter') && (
              <div className="flex flex-col gap-1.5 text-xs text-neutral-500">
                <SlotsPicker
                  value={goal.slots ?? []}
                  quarter={goal.period === 'quarter'}
                  firstDate={goal.monthDay || 1}
                  onChange={(slots) => onChange({ slots })}
                />
              </div>
            )}
          {makesTasks && <SpreadNote goal={goal} total={total} />}
          <p className="flex items-center gap-1.5 text-[11px] text-neutral-500">
            <Icon name="event_repeat" className="text-[13px]" />
            {makesTasks
              ? `${describeGoalSchedule({ ...goal, target: total })}. Done early still counts for its own day.`
              : 'No tasks are made; tick it off by hand or with linked tasks.'}
          </p>
        </div>
      )}

      {!isTarget && parts.length > 0 && (
        <div className="flex flex-col gap-1.5 pl-2">
          {parts.map((part, k) => (
            <div key={part.id ?? k} className="flex items-center gap-2">
              <NumberBox
                label="Part target"
                value={part.target}
                onChange={(target) =>
                  onChange({
                    parts: parts.map((p, m) =>
                      m === k ? { ...p, target } : p,
                    ),
                  })
                }
              />
              <TextInput
                aria-label="Part"
                value={part.label}
                onChange={(e) =>
                  onChange({
                    parts: parts.map((p, m) =>
                      m === k ? { ...p, label: e.target.value } : p,
                    ),
                  })
                }
                placeholder="Channel name"
                className="flex-1"
              />
              <IconAction
                icon="close"
                label="Remove part"
                onClick={() =>
                  onChange({ parts: parts.filter((_, m) => m !== k) })
                }
              />
            </div>
          ))}
        </div>
      )}
      {!isTarget && (
        <button
          type="button"
          onClick={() =>
            onChange({
              parts: [
                ...(parts.length
                  ? parts
                  : [{ id: tempId(), label: '', target: goal.target }]),
                { id: tempId(), label: '', target: 1 },
              ],
            })
          }
          className="self-start text-xs text-neutral-500 hover:text-neutral-300"
        >
          {parts.length ? '+ Add a part' : 'Split it (e.g. across channels)'}
        </button>
      )}

      {goal.image || addingImage ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            Inspiration{' '}
            <span className="normal-case tracking-normal text-neutral-600">
              · an image to keep in mind, shown on the goal
            </span>
          </p>
          <ImageField
            value={goal.image ?? ''}
            size={72}
            onChange={(url) => {
              onChange({ image: url || null });
              if (!url) setAddingImage(false);
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingImage(true)}
          className="flex items-center gap-1.5 self-start text-xs text-neutral-500 hover:text-neutral-300"
        >
          <Icon name="add_photo_alternate" className="text-[15px]" />
          Add an inspiration image
        </button>
      )}

      {users && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            Who it’s for{' '}
            <span className="normal-case tracking-normal text-neutral-600">
              {goal.assigneeIds?.length
                ? ''
                : isTarget
                  ? '· the whole team (pick people to make it theirs)'
                  : '· the whole team'}
            </span>
          </p>
          <PeoplePicker
            users={users}
            value={goal.assigneeIds ?? []}
            onChange={(assigneeIds) => onChange({ assigneeIds })}
          />
        </div>
      )}
    </div>
  );
};

/** Every goal of a project, in one list. */
export const GoalsEditor = ({
  value,
  onChange,
  users,
}: {
  value: GoalDraft[];
  onChange: (goals: GoalDraft[]) => void;
  users?: User[];
}) => (
  <div className="flex flex-col gap-2">
    {value.map((goal, i) => (
      <GoalFields
        key={goal.id ?? i}
        goal={goal}
        users={users}
        onChange={(patch) =>
          onChange(value.map((g, j) => (j === i ? { ...g, ...patch } : g)))
        }
        onRemove={() => onChange(value.filter((_, j) => j !== i))}
      />
    ))}
    <div className="flex gap-2">
      <AdminButton
        size="sm"
        tone="ghost"
        icon="event_repeat"
        onClick={() => onChange([...value, newGoalDraft('scheduled')])}
      >
        Add a repeating goal
      </AdminButton>
      <AdminButton
        size="sm"
        tone="ghost"
        icon="emoji_events"
        onClick={() => onChange([...value, newGoalDraft('target')])}
      >
        Add a target
      </AdminButton>
    </div>
  </div>
);

/** Drops the temporary ids of new parts so the server assigns real ones. */
export const goalForSave = (g: GoalDraft) => ({
  ...g,
  parts: g.parts
    ?.filter((p) => p.label.trim())
    .map((p) => ({
      ...p,
      id: p.id?.startsWith('new-') ? undefined : p.id,
    })),
});

export const goalsForSave = (goals: GoalDraft[]) =>
  goals.filter((g) => g.title.trim()).map(goalForSave);
