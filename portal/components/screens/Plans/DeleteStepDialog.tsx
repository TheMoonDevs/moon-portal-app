'use client';

import { useState } from 'react';

import { AdminButton, AdminModal } from '../Admin/shared/AdminUI';

/**
 * Removing a step that is linked to a task: the task can go with it, or
 * stay in its project with only the step removed.
 */
export const DeleteStepDialog = ({
  open,
  title,
  onClose,
  onRemoveStep,
  onDeleteTask,
}: {
  open: boolean;
  /** The task's title. */
  title: string;
  onClose: () => void;
  onRemoveStep: () => void;
  /** Deletes the task and the step; resolves when done. */
  onDeleteTask: () => Promise<boolean>;
}) => {
  const [busy, setBusy] = useState(false);
  return (
    <AdminModal
      open={open}
      onOpenChange={(v) => !v && !busy && onClose()}
      title="Delete the task as well?"
      icon="warning"
      size="sm"
      footer={
        <>
          <AdminButton tone="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </AdminButton>
          <AdminButton
            tone="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              onRemoveStep();
              onClose();
            }}
          >
            Remove step only
          </AdminButton>
          <AdminButton
            tone="danger"
            size="sm"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const done = await onDeleteTask();
              setBusy(false);
              if (done) onClose();
            }}
          >
            Delete step and task
          </AdminButton>
        </>
      }
    >
      <p className="text-sm text-neutral-300">
        This step is linked to the task{' '}
        <span className="font-medium text-white">“{title}”</span>. Delete the
        task from its project too, or remove only the step and keep the task?
      </p>
    </AdminModal>
  );
};
