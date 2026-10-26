'use client';

import type { TaskSchedule, User } from '@db/client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { describeSchedule, WEEKDAYS } from '@/lib/workspace/projects';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  EmptyState,
  Field,
  formatDate,
  IconAction,
  NativeSelect,
  Segmented,
  SkeletonRows,
  TextInput,
  ToggleSwitch,
} from '../shared/AdminUI';
import type { ProjectRow } from './AdminProjects';
import { errorText, GoalPicker, PeoplePicker } from './shared';

type Draft = {
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

const emptyDraft: Draft = {
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

const fromSchedule = (s: TaskSchedule): Draft => ({
  title: s.title,
  every: s.every,
  weekdays: s.weekdays?.length ? s.weekdays : [1],
  monthDay: s.monthDay ?? 1,
  count: s.count ?? 1,
  dueInDays: s.dueInDays == null ? '' : String(s.dueInDays),
  size: s.size as Draft['size'],
  assigneeIds: s.assigneeIds ?? [],
  goal: s.goalId ? `${s.goalId}:${s.goalPartId ?? ''}` : '',
});

/** Tasks that create themselves on a schedule. */
export const ProjectSchedules = ({
  project,
  users,
  canEdit,
  canDelete,
  onOpenChange,
  onSaved,
}: {
  project: ProjectRow | null;
  users: User[];
  canEdit: boolean;
  canDelete: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) => {
  const [schedules, setSchedules] = useState<TaskSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<TaskSchedule | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const projectId = project?.id;
  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await PortalSdk.getData(
        `/api/schedules?projectId=${projectId}`,
        null,
      );
      setSchedules(res?.data?.schedules ?? []);
    } catch (err) {
      toast.error(errorText(err, 'Could not load schedules.'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setSchedules([]);
    setEditing(null);
    load();
  }, [load]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const startEdit = (s: TaskSchedule | 'new') => {
    setEditing(s);
    setDraft(s === 'new' ? emptyDraft : fromSchedule(s));
  };

  const save = async () => {
    if (!project || !editing) return;
    if (!draft.title.trim()) return toast.error('Give the task a title.');
    const [goalId, goalPartId] = draft.goal.split(':');
    const payload = {
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
    setSaving(true);
    try {
      if (editing === 'new')
        await PortalSdk.postData('/api/schedules', {
          ...payload,
          projectId: project.id,
        });
      else await PortalSdk.patchData(`/api/schedules/${editing.id}`, payload);
      toast.success('Schedule saved');
      setEditing(null);
      await load();
      onSaved();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (s: TaskSchedule) => {
    try {
      await PortalSdk.patchData(`/api/schedules/${s.id}`, {
        active: !s.active,
      });
      await load();
      onSaved();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const remove = async (s: TaskSchedule) => {
    try {
      await PortalSdk.deleteData(`/api/schedules/${s.id}`, {});
      toast.success('Schedule removed. Tasks it already made stay.');
      await load();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const goalName = (s: TaskSchedule) => {
    const goal = project?.goals?.find((g) => g.id === s.goalId);
    const part = goal?.parts?.find((p) => p.id === s.goalPartId);
    return goal ? `${goal.title}${part ? ` · ${part.label}` : ''}` : null;
  };

  return (
    <AdminModal
      open={!!project}
      onOpenChange={onOpenChange}
      size="lg"
      icon="event_repeat"
      title={`${project?.name ?? 'Project'} scheduled tasks`}
      description="These tasks create themselves, so the routine work is always on the list."
      footer={
        editing && (
          <>
            <AdminButton
              tone="ghost"
              size="sm"
              onClick={() => setEditing(null)}
            >
              Cancel
            </AdminButton>
            <AdminButton
              tone="primary"
              size="sm"
              loading={saving}
              onClick={save}
            >
              {editing === 'new' ? 'Add schedule' : 'Save'}
            </AdminButton>
          </>
        )
      }
    >
      {editing ? (
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
          {(project?.goals?.length ?? 0) > 0 && (
            <Field label="Counts towards">
              <GoalPicker
                goals={project!.goals ?? []}
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
      ) : loading ? (
        <SkeletonRows rows={3} />
      ) : (
        <div className="flex flex-col gap-3">
          {schedules.length === 0 ? (
            <EmptyState
              icon="event_repeat"
              title="No scheduled tasks"
              description="Add the work that repeats, like a weekly release or daily shorts."
            />
          ) : (
            <ul className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.07]">
              {schedules.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-sm',
                        s.active ? 'text-neutral-100' : 'text-neutral-500',
                      )}
                    >
                      {s.title}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {describeSchedule(s)}
                      {goalName(s) && ` · ${goalName(s)}`}
                      {s.active && ` · next ${formatDate(s.nextRunOn)}`}
                    </p>
                  </div>
                  {canEdit && (
                    <ToggleSwitch
                      checked={s.active}
                      onChange={() => toggle(s)}
                      label={s.active ? 'On' : 'Off'}
                    />
                  )}
                  {canEdit && (
                    <IconAction
                      icon="edit"
                      label="Edit schedule"
                      onClick={() => startEdit(s)}
                    />
                  )}
                  {canDelete && (
                    <IconAction
                      icon="delete"
                      label="Remove schedule"
                      tone="danger"
                      onClick={() => remove(s)}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <AdminButton
              size="sm"
              icon="add"
              className="self-start"
              onClick={() => startEdit('new')}
            >
              Add a scheduled task
            </AdminButton>
          )}
        </div>
      )}
    </AdminModal>
  );
};
