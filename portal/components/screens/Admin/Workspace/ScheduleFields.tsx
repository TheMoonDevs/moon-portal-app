'use client';

import type { TaskSchedule, User } from '@db/client';

import { cn } from '@/lib/utils';
import { WEEKDAYS } from '@/lib/workspace/projects';
import type { ProjectGoal } from '@/models/workspace';

import { Field, NativeSelect, Segmented, TextInput } from '../shared/AdminUI';
import { GoalPicker, PeoplePicker } from './shared';

/*
 * The form for a scheduled task, shared by a project's scheduled tasks and
 * the ones set up in a plan.
 */

export type ScheduleDraft = {
  title: string;
  every: 'day' | 'week' | 'month';
  weekdays: number[];
  monthDay: number;
  count: number;
  dueInDays: string;
  size: 'MINOR' | 'MAJOR';
  assigneeIds: string[];
  goal: string;
};

export const emptyScheduleDraft: ScheduleDraft = {
  title: '',
  every: 'week',
  weekdays: [1],
  monthDay: 1,
  count: 1,
  dueInDays: '',
  size: 'MINOR',
  assigneeIds: [],
  goal: '',
};

export const scheduleToDraft = (s: TaskSchedule): ScheduleDraft => ({
  title: s.title,
  every: s.every,
  weekdays: s.weekdays?.length ? s.weekdays : [1],
  monthDay: s.monthDay ?? 1,
  count: s.count ?? 1,
  dueInDays: s.dueInDays == null ? '' : String(s.dueInDays),
  size: s.size as ScheduleDraft['size'],
  assigneeIds: s.assigneeIds ?? [],
  goal: s.goalId ? `${s.goalId}:${s.goalPartId ?? ''}` : '',
});

/** What the schedules API takes for a draft. */
export const scheduleDraftPayload = (draft: ScheduleDraft) => {
  const [goalId, goalPartId] = draft.goal.split(':');
  return {
    title: draft.title,
    every: draft.every,
    weekdays: draft.weekdays,
    monthDay: draft.monthDay,
    count: draft.count,
    dueInDays: draft.dueInDays === '' ? null : Number(draft.dueInDays),
    size: draft.size,
    assigneeIds: draft.assigneeIds,
    goalId: goalId || null,
    goalPartId: goalPartId || null,
  };
};

export const ScheduleFields = ({
  draft,
  onChange,
  goals,
  users,
}: {
  draft: ScheduleDraft;
  onChange: (draft: ScheduleDraft) => void;
  goals: ProjectGoal[];
  users: User[];
}) => {
  const set = <K extends keyof ScheduleDraft>(
    key: K,
    value: ScheduleDraft[K],
  ) => onChange({ ...draft, [key]: value });
  return (
    <div className="flex flex-col gap-4">
      <Field label="Task" required>
        <TextInput
          autoFocus
          value={draft.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Post a short"
        />
      </Field>
      <Field label="Repeats">
        <Segmented
          value={draft.every}
          onChange={(every) => set('every', every)}
          options={[
            { value: 'day', label: 'Every day' },
            { value: 'week', label: 'Weekly' },
            { value: 'month', label: 'Monthly' },
          ]}
        />
      </Field>
      {draft.every === 'week' && (
        <Field label="On">
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((label, day) => {
              const on = draft.weekdays.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    set(
                      'weekdays',
                      on
                        ? draft.weekdays.filter((d) => d !== day)
                        : [...draft.weekdays, day],
                    )
                  }
                  className={cn(
                    'h-8 w-11 rounded-lg border text-xs font-medium transition-colors',
                    on
                      ? 'border-white/30 bg-white/[0.12] text-white'
                      : 'border-white/[0.07] text-neutral-500 hover:text-neutral-300',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </Field>
      )}
      {draft.every === 'month' && (
        <Field label="Day of the month">
          <NativeSelect
            value={draft.monthDay}
            onChange={(e) => set('monthDay', Number(e.target.value))}
            className="w-28"
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Tasks each time"
          hint="e.g. 3 for three shorts on each channel"
        >
          <TextInput
            type="number"
            min={1}
            value={draft.count}
            onChange={(e) =>
              set('count', Math.max(1, Number(e.target.value) || 1))
            }
          />
        </Field>
        <Field label="Due" hint="Leave empty for no due date">
          <div className="flex items-center gap-2">
            <TextInput
              type="number"
              min={0}
              value={draft.dueInDays}
              onChange={(e) => set('dueInDays', e.target.value)}
              placeholder="—"
              className="w-20"
            />
            <span className="text-xs text-neutral-500">days later</span>
          </div>
        </Field>
      </div>
      {goals.length > 0 && (
        <Field label="Counts towards">
          <GoalPicker
            goals={goals}
            value={draft.goal}
            onChange={(goal) => set('goal', goal)}
          />
        </Field>
      )}
      <Field label="Assign to">
        <PeoplePicker
          users={users}
          value={draft.assigneeIds}
          onChange={(ids) => set('assigneeIds', ids)}
        />
      </Field>
    </div>
  );
};
