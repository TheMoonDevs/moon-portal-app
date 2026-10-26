'use client';

import type { Project, Task } from '@db/client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { PortalSdk } from '@/utils/services/PortalSdk';

const SHOW = 6;

const dueLabel = (day?: string | null) => {
  if (!day) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (day < today) return { text: 'Overdue', late: true };
  if (day === today) return { text: 'Due today', late: true };
  return {
    text: new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }),
    late: false,
  };
};

/** Open tasks assigned to the user; ticking one marks it done. */
export const TasksSection = () => {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [doneIds, setDoneIds] = useState<string[]>([]);

  const load = useCallback(() => {
    PortalSdk.getData('/api/me/tasks', null)
      .then((res) => {
        setTasks(res?.data?.tasks ?? []);
        setProjects(res?.data?.projects ?? []);
      })
      .catch(() => setTasks([]));
  }, []);

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
  const projectOf = (id: string) => projects.find((p) => p.id === id);

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
            const project = projectOf(task.projectId);
            const due = dueLabel(task.dueDate);
            const done = doneIds.includes(task.id);
            return (
              <div key={task.id} className="flex items-start gap-3 p-3">
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
                  <p className="flex items-center gap-1.5 truncate text-xs text-neutral-500">
                    {project && (
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: project.color || '#a3a3a3' }}
                      />
                    )}
                    <span className="truncate">{project?.name}</span>
                    {due && (
                      <span
                        className={cn(
                          'shrink-0',
                          due.late && 'font-medium text-red-500',
                        )}
                      >
                        · {due.text}
                      </span>
                    )}
                  </p>
                </div>
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
