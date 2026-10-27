'use client';

import type { TaskSchedule, User } from '@db/client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { describeSchedule } from '@/lib/workspace/projects';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  EmptyState,
  formatDate,
  IconAction,
  SkeletonRows,
  ToggleSwitch,
} from '../shared/AdminUI';
import type { ProjectRow } from './AdminProjects';
import {
  emptyScheduleDraft,
  type ScheduleDraft,
  scheduleDraftPayload,
  ScheduleFields,
  scheduleToDraft,
} from './ScheduleFields';
import { errorText } from './shared';

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
  const [draft, setDraft] = useState<ScheduleDraft>(emptyScheduleDraft);
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

  const startEdit = (s: TaskSchedule | 'new') => {
    setEditing(s);
    setDraft(s === 'new' ? emptyScheduleDraft : scheduleToDraft(s));
  };

  const save = async () => {
    if (!project || !editing) return;
    if (!draft.title.trim()) return toast.error('Give the task a title.');
    const payload = scheduleDraftPayload(draft);
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
        <ScheduleFields
          draft={draft}
          onChange={setDraft}
          goals={project?.goals ?? []}
          users={users}
        />
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
