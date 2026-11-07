'use client';

import type { User } from '@db/client';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import type { PlanStepKind } from '@/models/workspace';
import { TASK_STATUS } from '@/models/workspace';

import { Icon, Spin } from '../Admin/shared/AdminUI';
import { PeoplePicker, TASK_STATUS_META } from '../Admin/Workspace/shared';
import { ProjectOptions } from './planBits';
import { planLink } from './StepInfo';
import type { Person, PlanView, ProjectChoice, StepView } from './types';
import { stepKind } from './types';

const KINDS: { kind: PlanStepKind; label: string; icon: string }[] = [
  { kind: 'info', label: 'Text', icon: 'notes' },
  { kind: 'task', label: 'Task', icon: 'task_alt' },
  { kind: 'goal', label: 'Goal', icon: 'star' },
];

const STATUSES = [
  TASK_STATUS.TODO,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.IN_REVIEW,
  TASK_STATUS.DONE,
];

export type StepTaskFields = {
  status?: string;
  dueDate?: string | null;
  assigneeIds?: string[];
};

/**
 * The "⋮" at the end of a step: what its Details can do, in a menu. Change
 * its kind, its task's status, project, date and people, add a note to its
 * task, open it in full, copy its link, unlink or delete it.
 */
export const StepMenu = ({
  plan,
  step,
  projects,
  people,
  isOpen,
  onKind,
  onChange,
  onTaskChange,
  onAddNote,
  onDetails,
  onDelete,
}: {
  plan: PlanView;
  step: StepView;
  projects: ProjectChoice[];
  people: Person[];
  /** Its Details are open under it. */
  isOpen: boolean;
  onKind: (kind: PlanStepKind) => void;
  /** Changes the step's own fields (a step with no task yet). */
  onChange: (fields: Partial<StepView>) => void;
  /** Changes the task it links to. */
  onTaskChange: (fields: StepTaskFields) => void;
  /** Adds a note to the task it links to. */
  onAddNote: (text: string) => Promise<boolean>;
  onDetails: () => void;
  onDelete: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'main' | 'people' | 'note'>('main');
  const [upward, setUpward] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const kind = stepKind(step);
  const task = step.task;
  const linked = !!(step.taskId || step.goalId);
  const due = task ? (task.dueDate?.slice(0, 10) ?? '') : (step.dueOn ?? '');
  const who = task?.assigneeIds ?? step.assigneeIds;
  const project = projects.find(
    (p) => p.id === (task?.projectId || step.projectId),
  );

  const toggle = () => {
    if (!open) {
      const box = buttonRef.current?.getBoundingClientRect();
      setUpward(!!box && box.bottom > window.innerHeight - 440);
      setView('main');
    }
    setOpen((v) => !v);
  };
  const close = () => {
    setOpen(false);
    setView('main');
  };
  const run = (action: () => void) => () => {
    close();
    action();
  };

  const send = async () => {
    if (!note.trim()) return;
    setSending(true);
    const sent = await onAddNote(note.trim());
    setSending(false);
    if (sent) {
      setNote('');
      close();
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${planLink(plan.id, step.id)}`,
      );
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link.');
    }
  };

  // A plain step again: text, so it does not make a new task by itself.
  const unlink = () =>
    onChange({
      kind: 'info',
      taskId: null,
      goalId: null,
      task: null,
      goal: null,
      text: task?.title ?? step.goal?.title ?? step.text,
    });

  const label =
    'px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500';
  const row =
    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-neutral-200 hover:bg-white/[0.06]';

  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Step actions"
        title="Step actions"
        onClick={toggle}
        className={cn(
          'mt-0.5 flex size-5 items-center justify-center rounded transition-colors',
          open
            ? 'bg-white/[0.08] text-neutral-200'
            : 'text-neutral-700 hover:text-neutral-300 group-hover:text-neutral-500',
        )}
      >
        <Icon name="more_vert" className="text-[16px]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={close} />
          <div
            className={cn(
              'absolute right-0 z-40 w-72 rounded-xl border border-white/10 bg-neutral-900 p-1.5 shadow-2xl',
              upward ? 'bottom-7' : 'top-7',
            )}
          >
            {view === 'people' && (
              <div className="p-1.5">
                <button
                  type="button"
                  onClick={() => setView('main')}
                  className="mb-2 flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200"
                >
                  <Icon name="arrow_back" className="text-[15px]" />
                  Who
                </button>
                <PeoplePicker
                  users={people as unknown as User[]}
                  value={who}
                  onChange={(assigneeIds) =>
                    task
                      ? onTaskChange({ assigneeIds })
                      : onChange({ assigneeIds })
                  }
                />
              </div>
            )}

            {view === 'note' && (
              <div className="p-1.5">
                <button
                  type="button"
                  onClick={() => setView('main')}
                  className="mb-2 flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200"
                >
                  <Icon name="arrow_back" className="text-[15px]" />
                  Add a note to the task
                </button>
                <textarea
                  autoFocus
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={3}
                  placeholder="What happened, for the task's history (Ctrl+Enter)"
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!note.trim() || sending}
                  onClick={send}
                  className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-1.5 text-xs font-medium text-neutral-900 disabled:opacity-40"
                >
                  {sending ? (
                    <Spin className="size-3" />
                  ) : (
                    <Icon name="add_comment" className="text-[14px]" />
                  )}
                  Add to the task
                </button>
              </div>
            )}

            {view === 'main' && (
              <>
                {/* What kind of step */}
                <p className={label}>Turn into</p>
                <div className="flex gap-1 px-1">
                  {KINDS.map((k) => (
                    <button
                      key={k.kind}
                      type="button"
                      onClick={run(() => onKind(k.kind))}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-xs',
                        kind === k.kind
                          ? 'bg-white/[0.1] text-white'
                          : 'text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200',
                      )}
                    >
                      <Icon name={k.icon} className="text-[14px]" />
                      {k.label}
                    </button>
                  ))}
                </div>

                {/* The task's status */}
                {kind === 'task' && task && (
                  <>
                    <p className={label}>Status</p>
                    <div className="grid grid-cols-2 gap-1 px-1">
                      {STATUSES.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={run(() => onTaskChange({ status }))}
                          className={cn(
                            'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs',
                            task.status === status
                              ? 'bg-white/[0.1] text-white'
                              : 'text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200',
                          )}
                        >
                          <Icon
                            name={
                              status === TASK_STATUS.DONE
                                ? 'check_circle'
                                : status === TASK_STATUS.IN_PROGRESS
                                  ? 'pending'
                                  : status === TASK_STATUS.IN_REVIEW
                                    ? 'rate_review'
                                    : 'radio_button_unchecked'
                            }
                            className={cn(
                              'text-[14px]',
                              status === TASK_STATUS.DONE && 'text-emerald-400',
                            )}
                          />
                          {TASK_STATUS_META[status]?.label ?? status}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Project, date and people */}
                {kind !== 'info' && (
                  <div className="mt-1.5 flex flex-col gap-0.5 border-t border-white/[0.06] pt-1.5">
                    <label className={row} title="Project">
                      <Icon
                        name="folder"
                        className="text-[15px] text-neutral-400"
                      />
                      <span className="w-12 text-neutral-500">Project</span>
                      {linked ? (
                        <span className="flex-1 truncate">
                          {project?.name ?? 'A project'}
                        </span>
                      ) : (
                        <select
                          value={step.projectId ?? ''}
                          onChange={(e) =>
                            onChange({ projectId: e.target.value || null })
                          }
                          className="min-w-0 flex-1 cursor-pointer truncate bg-transparent focus:outline-none [&>option]:bg-neutral-900"
                        >
                          <option value="">No project</option>
                          {step.projectId && !project && (
                            <option value={step.projectId}>A project</option>
                          )}
                          <ProjectOptions projects={projects} />
                        </select>
                      )}
                    </label>
                    {kind === 'task' && (
                      <>
                        <label className={row} title="By when">
                          <Icon
                            name="event"
                            className="text-[15px] text-neutral-400"
                          />
                          <span className="w-12 text-neutral-500">Due</span>
                          <input
                            type="date"
                            value={due}
                            onChange={(e) =>
                              task
                                ? onTaskChange({
                                    dueDate: e.target.value || null,
                                  })
                                : onChange({ dueOn: e.target.value || null })
                            }
                            className="min-w-0 flex-1 bg-transparent [color-scheme:dark] focus:outline-none"
                          />
                        </label>
                        <button
                          type="button"
                          className={row}
                          onClick={() => setView('people')}
                        >
                          <Icon
                            name="group"
                            className="text-[15px] text-neutral-400"
                          />
                          <span className="w-12 text-neutral-500">Who</span>
                          <span className="flex-1 truncate">
                            {who.length
                              ? who
                                  .map(
                                    (id) =>
                                      people
                                        .find((p) => p.id === id)
                                        ?.name.split(' ')[0] ?? 'Someone',
                                  )
                                  .join(', ')
                              : 'No one yet'}
                          </span>
                          <Icon
                            name="chevron_right"
                            className="text-[15px] text-neutral-500"
                          />
                        </button>
                      </>
                    )}
                    {kind === 'task' && task && (
                      <button
                        type="button"
                        className={row}
                        onClick={() => setView('note')}
                      >
                        <Icon
                          name="add_comment"
                          className="text-[15px] text-neutral-400"
                        />
                        <span className="flex-1">Add a note to the task</span>
                        <Icon
                          name="chevron_right"
                          className="text-[15px] text-neutral-500"
                        />
                      </button>
                    )}
                  </div>
                )}

                {/* The step itself */}
                <div className="mt-1.5 flex flex-col gap-0.5 border-t border-white/[0.06] pt-1.5">
                  <button
                    type="button"
                    className={row}
                    onClick={run(onDetails)}
                  >
                    <Icon
                      name="tune"
                      className="text-[15px] text-neutral-400"
                    />
                    <span className="flex-1">
                      {isOpen ? 'Close details' : 'Open details'}
                    </span>
                  </button>
                  <button type="button" className={row} onClick={run(copyLink)}>
                    <Icon
                      name="link"
                      className="text-[15px] text-neutral-400"
                    />
                    <span className="flex-1">Copy link to step</span>
                  </button>
                  {linked && (
                    <button
                      type="button"
                      className={row}
                      onClick={run(unlink)}
                      title="Make it a plain step again; the task or goal stays"
                    >
                      <Icon
                        name="link_off"
                        className="text-[15px] text-neutral-400"
                      />
                      <span className="flex-1">
                        Unlink the {step.goalId ? 'goal' : 'task'}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    className={cn(row, 'text-rose-300 hover:text-rose-200')}
                    onClick={run(onDelete)}
                  >
                    <Icon name="delete" className="text-[15px]" />
                    <span className="flex-1">
                      {step.taskId ? 'Delete step…' : 'Delete step'}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
