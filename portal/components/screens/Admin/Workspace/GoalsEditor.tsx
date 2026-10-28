'use client';

import type { User } from '@db/client';

import { cn } from '@/lib/utils';
import {
  describeGoalSchedule,
  PERIOD_LABELS,
  WEEKDAYS,
} from '@/lib/workspace/projects';
import type { GoalKind, GoalPeriod, ProjectGoal } from '@/models/workspace';

import {
  AdminButton,
  Icon,
  IconAction,
  NativeSelect,
  Segmented,
  TextInput,
} from '../shared/AdminUI';
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
    hint: 'A target every day, week or month, like “2 releases a week”. It makes its own dated tasks; each period is met or missed.',
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
              onChange({ period: e.target.value as GoalPeriod, days: [] })
            }
            className="w-32"
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
          {makesTasks && goal.period === 'week' && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              For
              <DayPicker
                value={goal.days ?? []}
                onChange={(days) => onChange({ days })}
              />
            </div>
          )}
          {makesTasks && goal.period === 'month' && (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              On day
              <TextInput
                aria-label="Day of the month"
                type="number"
                min={1}
                max={28}
                value={goal.monthDay ?? 1}
                onChange={(e) =>
                  onChange({
                    monthDay: Math.min(
                      28,
                      Math.max(1, Math.round(Number(e.target.value)) || 1),
                    ),
                  })
                }
                className="w-16 text-center"
              />
              of the month
            </div>
          )}
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
