'use client';

import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { isTarget } from '@/lib/workspace/projects';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { Icon, Spin } from '../Admin/shared/AdminUI';
import { TASK_STATUS_META } from '../Admin/Workspace/shared';
import type { ProjectChoice, StepView } from './types';

/*
 * Linking a plan step to an existing task or a project goal: type "/" in
 * the step box, or use "Link a task or goal" on a step, then search.
 */

export type StepLink =
  | {
      kind: 'task';
      key: string;
      taskId: string;
      title: string;
      status: string;
      projectId: string;
    }
  | {
      kind: 'goal';
      key: string;
      goalId: string;
      title: string;
      projectId: string;
      hint: string;
    };

/** The step a link makes, or the fields it sets on a step. */
export const linkFields = (link: StepLink): Partial<StepView> =>
  link.kind === 'task'
    ? {
        text: link.title,
        taskId: link.taskId,
        goalId: null,
        projectId: link.projectId,
        task: { id: link.taskId, status: link.status, title: link.title },
        goal: null,
        done: link.status === 'DONE',
      }
    : {
        text: link.title,
        goalId: link.goalId,
        taskId: null,
        projectId: link.projectId,
        task: null,
      };

/**
 * Tasks (from the server) and goals (from `projects`) matching `query`,
 * for a plan in `companyId`; `rootId` keeps to a project plan's project.
 * Tasks and goals already in the plan are left out.
 */
export const useStepLinks = ({
  enabled,
  companyId,
  rootId,
  projects,
  query,
  taken,
}: {
  enabled: boolean;
  companyId: string;
  rootId?: string | null;
  projects: ProjectChoice[];
  query: string;
  /** Task and goal ids the plan's steps already link to. */
  taken: Set<string>;
}) => {
  const [tasks, setTasks] = useState<StepLink[]>([]);
  const [loading, setLoading] = useState(false);
  const q = query.trim().toLowerCase();

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ companyId, q: query.trim() });
        if (rootId) params.set('projectId', rootId);
        const res = await PortalSdk.getData(
          `/api/plans/link-search?${params}`,
          null,
        );
        if (!live) return;
        setTasks(
          (res?.data?.tasks ?? []).map(
            (t: {
              id: string;
              title: string;
              status: string;
              projectId: string;
            }) => ({
              kind: 'task' as const,
              key: `task:${t.id}`,
              taskId: t.id,
              title: t.title,
              status: t.status,
              projectId: t.projectId,
            }),
          ),
        );
      } catch {
        if (live) setTasks([]);
      } finally {
        if (live) setLoading(false);
      }
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [enabled, companyId, rootId, query]);

  const goals = useMemo<StepLink[]>(
    () =>
      projects
        .flatMap((p) =>
          (p.goals ?? []).map((g) => ({
            kind: 'goal' as const,
            key: `goal:${g.id}`,
            goalId: g.id,
            title: g.title,
            projectId: p.id,
            hint: isTarget(g)
              ? `Reach ${g.target.toLocaleString()}`
              : `${g.target} a ${g.period}`,
          })),
        )
        .filter((g) => !q || g.title.toLowerCase().includes(q))
        .slice(0, 6),
    [projects, q],
  );

  const items = useMemo(
    () =>
      [...tasks.slice(0, 8), ...goals].filter(
        (l) => !taken.has(l.kind === 'task' ? l.taskId : l.goalId),
      ),
    [tasks, goals, taken],
  );
  return { items, loading };
};

/** The list of tasks and goals to link, under the step box. */
export const LinkMenu = ({
  items,
  loading,
  active,
  projects,
  onPick,
  onHover,
  className,
}: {
  items: StepLink[];
  loading: boolean;
  active: number;
  projects: ProjectChoice[];
  onPick: (link: StepLink) => void;
  onHover?: (index: number) => void;
  className?: string;
}) => {
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const sections: { label: string; kind: StepLink['kind'] }[] = [
    { label: 'Tasks', kind: 'task' },
    { label: 'Goals', kind: 'goal' },
  ];
  return (
    <div
      className={cn(
        'max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-neutral-900 p-1.5 shadow-2xl',
        className,
      )}
      // Keep the focus in the step box while picking.
      onMouseDown={(e) => e.preventDefault()}
    >
      {sections.map((section) => {
        const list = items
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.kind === section.kind);
        if (!list.length) return null;
        return (
          <div key={section.kind} className="mb-1 last:mb-0">
            <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              {section.label}
            </p>
            {list.map(({ item, index }) => {
              const project = projectById.get(item.projectId);
              return (
                <button
                  key={item.key}
                  type="button"
                  onMouseEnter={() => onHover?.(index)}
                  onClick={() => onPick(item)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm',
                    index === active
                      ? 'bg-white/[0.08] text-white'
                      : 'text-neutral-300 hover:bg-white/[0.05]',
                  )}
                >
                  <Icon
                    name={
                      item.kind === 'goal'
                        ? 'star'
                        : (TASK_STATUS_META[item.status]?.icon ?? 'task_alt')
                    }
                    className={cn(
                      'shrink-0 text-[16px]',
                      item.kind === 'goal'
                        ? 'text-amber-300/80'
                        : item.status === 'DONE'
                          ? 'text-emerald-400'
                          : 'text-neutral-500',
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-neutral-500">
                    {item.kind === 'goal' && <span>{item.hint}</span>}
                    {project && (
                      <>
                        <span
                          className="size-1.5 rounded-full"
                          style={{
                            backgroundColor: project.color || '#525252',
                          }}
                        />
                        <span className="max-w-[110px] truncate">
                          {project.name}
                        </span>
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
      {!items.length && (
        <p className="flex items-center gap-2 p-2 text-xs text-neutral-500">
          {loading ? (
            <>
              <Spin className="size-3" /> Searching…
            </>
          ) : (
            'No tasks or goals match.'
          )}
        </p>
      )}
    </div>
  );
};

/**
 * Keyboard for a box with the link menu open: arrows move, Enter picks,
 * Escape closes. Returns whether it used the key.
 */
export const menuKeys = (
  e: React.KeyboardEvent,
  items: StepLink[],
  active: number,
  setActive: (i: number) => void,
  onPick: (link: StepLink) => void,
  onClose: () => void,
) => {
  if (e.key === 'ArrowDown') {
    setActive(Math.min(items.length - 1, active + 1));
  } else if (e.key === 'ArrowUp') {
    setActive(Math.max(0, active - 1));
  } else if (e.key === 'Enter' && items[active]) {
    onPick(items[active]);
  } else if (e.key === 'Escape') {
    onClose();
  } else return false;
  e.preventDefault();
  return true;
};
