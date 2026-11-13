'use client';

import { AdminButton, AdminModal } from '../Admin/shared/AdminUI';
import type { PlanView } from './types';

/**
 * Asks before a plan is deleted. When its steps link to tasks, it asks
 * whether those tasks should go too: "Delete plan only" keeps them in their
 * projects, "Delete plan and tasks" deletes them with the plan.
 */
export const DeletePlanDialog = ({
  plan,
  open,
  onOpenChange,
  deleting,
  onDelete,
}: {
  plan: PlanView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which choice is running, to show its spinner. */
  deleting: 'plan' | 'all' | null;
  onDelete: (withTasks: boolean) => void;
}) => {
  const steps = plan?.steps.length ?? 0;
  const tasks = new Set(
    (plan?.steps ?? []).map((s) => s.taskId).filter(Boolean),
  ).size;
  const busy = deleting !== null;
  const plural = (n: number, word: string) =>
    `${n} ${word}${n === 1 ? '' : 's'}`;

  return (
    <AdminModal
      open={open}
      onOpenChange={(next) => !busy && onOpenChange(next)}
      title={`Delete ${plan?.title || 'this plan'}?`}
      icon="warning"
      size="sm"
      footer={
        <>
          <AdminButton
            tone="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </AdminButton>
          {tasks > 0 && (
            <AdminButton
              tone="secondary"
              size="sm"
              loading={deleting === 'plan'}
              disabled={busy}
              onClick={() => onDelete(false)}
            >
              Delete plan only
            </AdminButton>
          )}
          <AdminButton
            tone="danger"
            size="sm"
            icon="delete"
            loading={tasks > 0 ? deleting === 'all' : busy}
            disabled={busy}
            onClick={() => onDelete(tasks > 0)}
          >
            {tasks > 0 ? 'Delete plan and tasks' : 'Delete plan'}
          </AdminButton>
        </>
      }
    >
      {tasks > 0 ? (
        <div className="space-y-2 text-sm text-neutral-400 auto-light:text-neutral-600">
          <p>
            This plan has {plural(steps, 'step')}, and{' '}
            {tasks === 1
              ? 'one of them links to a task'
              : `${tasks} of them link to tasks`}
            . Should the {tasks === 1 ? 'task' : 'tasks'} be deleted too?
          </p>
          <p>
            <span className="font-medium text-neutral-200 auto-light:text-neutral-800">
              Delete plan and tasks
            </span>{' '}
            removes the plan, its steps and the linked tasks with their work
            points. This can’t be undone.
          </p>
          <p>
            <span className="font-medium text-neutral-200 auto-light:text-neutral-800">
              Delete plan only
            </span>{' '}
            keeps the tasks in their projects.
          </p>
        </div>
      ) : (
        <p className="text-sm text-neutral-400 auto-light:text-neutral-600">
          The plan and its {plural(steps, 'step')} go away. This can’t be
          undone.
        </p>
      )}
    </AdminModal>
  );
};
