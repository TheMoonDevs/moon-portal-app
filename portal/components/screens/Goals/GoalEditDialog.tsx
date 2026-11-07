'use client';

import type { User } from '@db/client';
import { useState } from 'react';
import { toast } from 'sonner';

import type { CalendarGoal } from '@/lib/workspace/goalCalendar';
import type { GoalKind } from '@/models/workspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  AdminModal,
  ConfirmDialog,
} from '../Admin/shared/AdminUI';
import {
  type GoalDraft,
  GoalFields,
  goalForSave,
  KIND_META,
  newGoalDraft,
} from '../Admin/Workspace/GoalsEditor';
import { errorText } from '../Admin/Workspace/shared';

/** A goal being edited (or added) from the goals page, and its project. */
export type GoalEdit = {
  projectId: string;
  projectName: string;
  draft: GoalDraft;
};

/** A goal of the calendar as the editor takes it, without what it worked out. */
export const editOf = (goal: CalendarGoal, projectName: string): GoalEdit => {
  const { projectId, progress: _progress, ...draft } = goal;
  return { projectId, projectName, draft };
};

export const newEdit = (
  projectId: string,
  projectName: string,
  kind: GoalKind = 'scheduled',
): GoalEdit => ({ projectId, projectName, draft: newGoalDraft(kind) });

/**
 * The project page's goal editor, opened from the goals page: the same
 * fields, saved the same way, with Remove for a goal already set.
 */
export const GoalEditDialog = ({
  edit,
  users,
  onClose,
  onSaved,
}: {
  edit: GoalEdit;
  /** People who can be on it: the project's first. */
  users: User[];
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [draft, setDraft] = useState<GoalDraft>(edit.draft);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const base = `/api/projects/${edit.projectId}/goals`;

  const save = async () => {
    if (!draft.title.trim()) return toast.error('Give the goal a title.');
    setSaving(true);
    try {
      const goal = goalForSave(draft);
      if (draft.id) await PortalSdk.patchData(`${base}/${draft.id}`, { goal });
      else await PortalSdk.postData(base, { goal });
      toast.success(draft.id ? 'Goal saved' : 'Goal added');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft.id) return;
    setSaving(true);
    try {
      await PortalSdk.deleteData(`${base}/${draft.id}`, {});
      toast.success('Goal removed');
      setRemoving(false);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const kind = draft.kind ?? 'scheduled';
  return (
    <>
      <AdminModal
        open
        onOpenChange={(open) => !open && onClose()}
        size="lg"
        icon={kind === 'target' ? 'emoji_events' : 'track_changes'}
        title={`${draft.id ? 'Edit goal' : 'New goal'} · ${edit.projectName}`}
        description={KIND_META[kind].hint}
        footer={
          <>
            {draft.id && (
              <AdminButton
                tone="danger"
                size="sm"
                icon="delete"
                className="mr-auto"
                onClick={() => setRemoving(true)}
              >
                Remove
              </AdminButton>
            )}
            <AdminButton tone="ghost" size="sm" onClick={onClose}>
              Cancel
            </AdminButton>
            <AdminButton
              tone="primary"
              size="sm"
              loading={saving}
              onClick={save}
            >
              {draft.id ? 'Save goal' : 'Add goal'}
            </AdminButton>
          </>
        }
      >
        <GoalFields
          goal={draft}
          users={users}
          onChange={(patch) => setDraft((g) => ({ ...g, ...patch }))}
        />
      </AdminModal>
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title={`Remove ${draft.title || 'this goal'}?`}
        message="It makes no new tasks, and the tasks it made stop counting towards it."
        confirmLabel="Remove goal"
        loading={saving}
        onConfirm={remove}
      />
    </>
  );
};
