'use client';

import type { Task } from '@db/client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

const SHOW = 6;

/**
 * Open tasks assigned to the user; ticking one marks it done, and the + on
 * one adds a follow-up: the next step, linked to it.
 */
export const TasksSection = () => {
  const { user } = useUser();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [following, setFollowing] = useState<string | null>(null);
  const [next, setNext] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    PortalSdk.getData('/api/me/tasks', null)
      .then((res) => {
        setTasks(res?.data?.tasks ?? []);
      })
      .catch(() => setTasks([]));
  }, []);

  const addFollowUp = async (task: Task) => {
    const title = next.trim();
    if (!title || saving) return;
    setSaving(true);
    try {
      await PortalSdk.postData('/api/tasks', {
        projectId: task.projectId,
        title,
        followsId: task.id,
        assigneeIds: user?.id ? [user.id] : [],
      });
      toast.success(`Follow-up added: ${title}`);
      setNext('');
      setFollowing(null);
      load();
    } catch (err) {
      toast.error(
        (err as any)?.response?.data?.error ?? 'Could not add the follow-up.',
      );
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    load();
  }, [load]);

  const complete = async (task: Task) => {
    setDoneIds((ids) => [...ids, task.id]);
    try {
      await PortalSdk.patchData(`/api/tasks/${task.id}`, { status: 'DONE' });
      // Leave it ticked for a moment, then drop it from the list.
      setTimeout(
        () => setTasks((all) => all?.filter((t) => t.id !== task.id) ?? null),
        700,
      );
    } catch {
      setDoneIds((ids) => ids.filter((id) => id !== task.id));
      toast.error('Could not update the task.');
    }
  };

  // Overdue and soonest first; tasks with no due date after them.
  const sorted = (tasks ?? [])
    .slice()
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  const shown = expanded ? sorted : sorted.slice(0, SHOW);

  return (
    <div className="mt-6">
      <h4 className="px-4 text-lg font-bold">Your tasks</h4>
      <div className="m-4 mt-3 flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-xl bg-white shadow-md">
        {!tasks ? (
          <div className="h-16 animate-pulse bg-neutral-50" />
        ) : sorted.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500">
            Nothing assigned to you right now.
          </p>
        ) : (
          shown.map((task) => {
            const done = doneIds.includes(task.id);
            return (
              <div key={task.id}>
                <div className="group flex items-start gap-3 p-3">
                  <button
                    type="button"
                    aria-label="Mark as done"
                    disabled={done}
                    onClick={() => complete(task)}
                    className={cn(
                      'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      done
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-neutral-300 hover:border-green-500',
                    )}
                  >
                    {done && (
                      <span className="material-symbols-outlined text-[14px]">
                        check
                      </span>
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm text-neutral-900',
                        done && 'text-neutral-400 line-through',
                      )}
                    >
                      {task.title}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Add a follow-up task"
                    title="Add a follow-up task: the next step after this one"
                    onClick={() => {
                      setNext('');
                      setFollowing(following === task.id ? null : task.id);
                    }}
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-opacity hover:bg-neutral-100 hover:text-neutral-900 focus:opacity-100 group-hover:opacity-100 max-md:opacity-100',
                      following === task.id
                        ? 'bg-neutral-100 text-neutral-900 opacity-100'
                        : 'opacity-0',
                    )}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      add
                    </span>
                  </button>
                </div>
                {following === task.id && (
                  <div className="mx-3 mb-3 flex items-center gap-2 rounded-lg border border-neutral-200 px-2.5 py-1.5">
                    <span className="material-symbols-outlined text-[14px] text-neutral-400">
                      subdirectory_arrow_right
                    </span>
                    <input
                      autoFocus
                      value={next}
                      onChange={(e) => setNext(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addFollowUp(task);
                        if (e.key === 'Escape') setFollowing(null);
                      }}
                      placeholder="Next step after this…"
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
                    />
                    {saving && (
                      <span className="size-3 animate-spin rounded-full border-y-2 border-neutral-500" />
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        {sorted.length > SHOW && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-2.5 text-center text-xs font-medium text-neutral-500 hover:text-neutral-800"
          >
            {expanded ? 'Show less' : `Show all ${sorted.length}`}
          </button>
        )}
      </div>
    </div>
  );
};
