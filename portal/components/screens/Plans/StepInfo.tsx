'use client';

import type { User } from '@db/client';
import { useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';

import { Icon } from '../Admin/shared/AdminUI';
import { AvatarStack, TASK_STATUS_META } from '../Admin/Workspace/shared';
import { goalLine, ProjectDot } from './planBits';
import type { Person, PlanView, ProjectChoice, StepView } from './types';
import { shortDay, stepKind } from './types';

/** Where a plan (and one of its steps) opens on the plans page. */
export const planLink = (planId: string, stepId?: string) =>
  `/plans?plan_id=${planId}${stepId ? `&step_id=${stepId}` : ''}`;

const KIND_LABEL = { info: 'Text', task: 'Task', goal: 'Goal' } as const;

/**
 * The (i) at the end of a step: its details at a glance, for anyone who can
 * see the plan, and a link to it on the plans page.
 */
export const StepInfo = ({
  plan,
  step,
  projects,
  people,
}: {
  plan: PlanView;
  step: StepView;
  projects: ProjectChoice[];
  people: Person[];
}) => {
  const [open, setOpen] = useState(false);
  const kind = stepKind(step);
  const project = projects.find(
    (p) => p.id === (step.task?.projectId || step.projectId),
  );
  const who = (
    step.task?.assigneeIds?.length ? step.task.assigneeIds : step.assigneeIds
  )
    .map((id) => people.find((p) => p.id === id))
    .filter(Boolean) as Person[];
  const due = step.task?.dueDate?.slice(0, 10) || step.dueOn;
  const details = [step.notes, step.task?.description]
    .map((t) => t?.trim())
    .filter(Boolean) as string[];
  const href = planLink(plan.id, step.id);

  const row = (icon: string, children: React.ReactNode) => (
    <div className="flex items-center gap-2 text-xs text-neutral-300">
      <Icon name={icon} className="text-[14px] text-neutral-500" />
      {children}
    </div>
  );

  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="About this step"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'mt-0.5 flex size-5 items-center justify-center rounded-full transition-colors',
          open
            ? 'text-neutral-200'
            : 'text-neutral-700 hover:text-neutral-300 group-hover:text-neutral-500',
        )}
      >
        <Icon name="info" className="text-[15px]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-40 w-72 rounded-xl border border-white/10 bg-neutral-900 p-3 shadow-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              {KIND_LABEL[kind]}
              {step.task &&
                ` · ${TASK_STATUS_META[step.task.status]?.label ?? ''}`}
              {kind === 'task' && !step.task && step.done && ' · Done'}
            </p>
            <p className="mt-1 text-sm font-medium text-white">
              {step.task?.title ?? step.goal?.title ?? step.text}
            </p>
            {details.map((d, i) => (
              <p
                key={i}
                className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-neutral-400"
              >
                {d}
              </p>
            ))}
            <div className="mt-3 space-y-1.5">
              {project &&
                row(
                  'folder',
                  <span className="flex items-center gap-1.5">
                    <ProjectDot project={project} />
                    {project.name}
                  </span>,
                )}
              {due && kind !== 'goal' && row('event', shortDay(due))}
              {who.length > 0 &&
                row(
                  'group',
                  <span className="flex items-center gap-2">
                    <AvatarStack users={who as unknown as User[]} max={4} />
                    <span className="truncate">
                      {who.map((p) => p.name).join(', ')}
                    </span>
                  </span>,
                )}
              {step.goal && row('star', goalLine(step.goal))}
            </div>
            <div className="mt-3 flex items-center gap-1 border-t border-white/[0.06] pt-2">
              <a
                href={href}
                className="flex flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-sky-300 hover:bg-white/[0.05]"
              >
                <Icon name="map" className="text-[14px]" />
                Open in {plan.title || 'the plan'}
              </a>
              <button
                type="button"
                aria-label="Copy link"
                title="Copy link"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      `${window.location.origin}${href}`,
                    );
                    toast.success('Link copied');
                  } catch {
                    toast.error('Could not copy the link.');
                  }
                }}
                className="flex size-7 items-center justify-center rounded-md text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200"
              >
                <Icon name="link" className="text-[15px]" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
