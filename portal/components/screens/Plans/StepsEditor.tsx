'use client';

import type { User } from '@db/client';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { newStep } from '@/lib/workspace/plans';
import type { GoalKind, PlanStepKind } from '@/models/workspace';

import { Icon, Spin } from '../Admin/shared/AdminUI';
import {
  AvatarStack,
  PeoplePicker,
  TASK_STATUS_META,
} from '../Admin/Workspace/shared';
import {
  goalLine,
  GoalStar,
  GrowingText,
  ProjectDot,
  ProjectOptions,
} from './planBits';
import { linkFields, LinkMenu, type StepLink, useStepLinks } from './StepLinks';
import type { Person, PlanView, ProjectChoice, StepView } from './types';
import { isPast, stepKind } from './types';

/*
 * A plan's steps, edited like a Notion page: each step is a line, "/" opens
 * the commands (what kind of step, or a task or goal to link), Enter starts
 * the next step, Ctrl+Enter makes the step's task (or adds a note to the
 * task it links) and starts the next. Under each step sit its project,
 * date, people and type; Details opens it in full on the right.
 */

/** A step the editor holds; a new goal waits for its details. */
export type EditorStep = StepView & {
  /** Client only: the goal kind picked with "/", until it is set up. */
  draftGoal?: GoalKind;
};

export const KIND_META: Record<
  PlanStepKind,
  { label: string; icon: string; hint: string }
> = {
  info: {
    label: 'Text',
    icon: 'notes',
    hint: 'A note, idea or heading: nothing to tick off',
  },
  todo: { label: 'To-do', icon: 'check_box', hint: 'A step to tick off' },
  task: {
    label: 'Task',
    icon: 'task_alt',
    hint: 'Becomes a task in its project (Ctrl+Enter)',
  },
  goal: {
    label: 'Goal',
    icon: 'star',
    hint: 'A repeating goal or a number to reach',
  },
};

type Command =
  | { type: 'kind'; key: string; kind: PlanStepKind; goal?: GoalKind }
  | { type: 'link'; key: string; link: StepLink };

const KIND_COMMANDS: {
  kind: PlanStepKind;
  goal?: GoalKind;
  label: string;
  icon: string;
  hint: string;
}[] = [
  { kind: 'info', ...KIND_META.info },
  { kind: 'todo', ...KIND_META.todo },
  { kind: 'task', ...KIND_META.task },
  {
    kind: 'goal',
    goal: 'scheduled',
    label: 'Repeating goal',
    icon: 'event_repeat',
    hint: 'Makes its own tasks every day, week or month',
  },
  {
    kind: 'goal',
    goal: 'target',
    label: 'Target goal',
    icon: 'emoji_events',
    hint: 'One number to reach',
  },
];

/* -------------------------------------------------------------------------- */
/*                                 Step menu                                  */
/* -------------------------------------------------------------------------- */

/** The "⋮" menu beside a step: insert, move, delete. */
const RowMenu = ({
  onInsert,
  onMove,
  onDelete,
  canUp,
  canDown,
}: {
  onInsert: (where: 'above' | 'below') => void;
  onMove: (by: -1 | 1) => void;
  onDelete: () => void;
  canUp: boolean;
  canDown: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const item = (
    icon: string,
    label: string,
    run: () => void,
    disabled = false,
    keys?: string,
  ) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        setOpen(false);
        run();
      }}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-neutral-200 hover:bg-white/[0.06] disabled:opacity-40"
    >
      <Icon name={icon} className="text-[15px] text-neutral-400" />
      <span className="flex-1">{label}</span>
      {keys && <span className="text-[10px] text-neutral-500">{keys}</span>}
    </button>
  );
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Step menu"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex size-6 items-center justify-center rounded text-neutral-500 hover:bg-white/[0.06] hover:text-neutral-200"
      >
        <Icon name="drag_indicator" className="text-[16px]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-7 z-30 w-52 rounded-xl border border-white/10 bg-neutral-900 p-1 shadow-2xl">
            {item('vertical_align_top', 'Insert above', () =>
              onInsert('above'),
            )}
            {item(
              'vertical_align_bottom',
              'Insert below',
              () => onInsert('below'),
              false,
              'Enter',
            )}
            {item('arrow_upward', 'Move up', () => onMove(-1), !canUp, 'Alt ↑')}
            {item(
              'arrow_downward',
              'Move down',
              () => onMove(1),
              !canDown,
              'Alt ↓',
            )}
            <div className="my-1 h-px bg-white/[0.06]" />
            {item('delete', 'Delete step', onDelete)}
          </div>
        </>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                          The edit row under a step                         */
/* -------------------------------------------------------------------------- */

const chip =
  'flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] text-neutral-500 hover:bg-white/[0.05] hover:text-neutral-200';

const StepBar = ({
  step,
  projects,
  people,
  canEdit,
  canMakeTask,
  makingTask,
  onChange,
  onKind,
  onDetails,
  onMakeTask,
  onAddNote,
}: {
  step: EditorStep;
  projects: ProjectChoice[];
  people: Person[];
  canEdit: boolean;
  canMakeTask: boolean;
  makingTask: boolean;
  onChange: (fields: Partial<EditorStep>) => void;
  onKind: (kind: PlanStepKind) => void;
  onDetails: () => void;
  onMakeTask: () => void;
  onAddNote: (text: string) => Promise<boolean>;
}) => {
  const kind = stepKind(step);
  const linked = !!(step.taskId || step.goalId);
  const [picking, setPicking] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const stepPeople = step.assigneeIds
    .map((id) => people.find((p) => p.id === id))
    .filter(Boolean) as Person[];
  const project = projects.find((p) => p.id === step.projectId);

  const send = async () => {
    if (!note.trim()) return;
    setSending(true);
    if (await onAddNote(note.trim())) setNote('');
    setSending(false);
  };

  return (
    <div
      className="flex flex-wrap items-center gap-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Type */}
      <label className={cn(chip, 'relative')} title="What kind of step">
        <Icon name={KIND_META[kind].icon} className="text-[13px]" />
        <select
          value={kind}
          disabled={!canEdit}
          onChange={(e) => onKind(e.target.value as PlanStepKind)}
          className="cursor-pointer bg-transparent focus:outline-none disabled:cursor-default [&>option]:bg-neutral-900"
        >
          {(Object.keys(KIND_META) as PlanStepKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_META[k].label}
            </option>
          ))}
        </select>
      </label>

      {/* Project */}
      {kind !== 'info' && (
        <label className={chip} title="Project">
          {project ? (
            <ProjectDot project={project} />
          ) : (
            <Icon name="folder" className="text-[13px]" />
          )}
          <select
            value={step.projectId ?? ''}
            disabled={!canEdit || linked}
            onChange={(e) => onChange({ projectId: e.target.value || null })}
            className="max-w-[140px] cursor-pointer truncate bg-transparent focus:outline-none disabled:cursor-default [&>option]:bg-neutral-900"
          >
            <option value="">No project</option>
            {step.projectId && !project && (
              <option value={step.projectId}>A project</option>
            )}
            <ProjectOptions projects={projects} />
          </select>
        </label>
      )}

      {/* Date */}
      {kind !== 'info' && kind !== 'goal' && (
        <label
          className={cn(
            chip,
            !step.done && isPast(step.dueOn) && 'text-rose-300',
          )}
          title="By when"
        >
          <Icon name="event" className="text-[13px]" />
          <input
            type="date"
            value={step.dueOn ?? ''}
            disabled={!canEdit}
            onChange={(e) => onChange({ dueOn: e.target.value || null })}
            className={cn(
              'w-[104px] bg-transparent [color-scheme:dark] focus:outline-none',
              !step.dueOn && 'text-neutral-600',
            )}
          />
        </label>
      )}

      {/* People */}
      {kind !== 'info' && kind !== 'goal' && (
        <div className="relative">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => setPicking((v) => !v)}
            className={chip}
            title="Who"
          >
            {stepPeople.length ? (
              <AvatarStack users={stepPeople as unknown as User[]} max={3} />
            ) : (
              <>
                <Icon name="person_add" className="text-[13px]" />
                Who
              </>
            )}
          </button>
          {picking && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setPicking(false)}
              />
              <div className="absolute left-0 top-7 z-30 w-72 rounded-xl border border-white/10 bg-neutral-900 p-3 shadow-2xl">
                <PeoplePicker
                  users={people as unknown as User[]}
                  value={step.assigneeIds}
                  onChange={(assigneeIds) => onChange({ assigneeIds })}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* What the step is tied to */}
      {kind === 'task' && step.task && (
        <span className={cn(chip, 'text-sky-300/80 hover:text-sky-200')}>
          <Icon name="link" className="text-[13px]" />
          {TASK_STATUS_META[step.task.status]?.label ?? 'Task'}
        </span>
      )}
      {kind === 'task' && !step.task && canEdit && (
        <button
          type="button"
          disabled={!canMakeTask || !step.projectId || !step.text.trim()}
          onClick={onMakeTask}
          title={
            !step.projectId
              ? 'Pick a project first'
              : canMakeTask
                ? 'Make it a task in its project (Ctrl+Enter)'
                : 'Only the people on that project can add its tasks'
          }
          className={cn(chip, 'text-sky-300/80 disabled:opacity-40')}
        >
          {makingTask ? (
            <Spin className="size-3" />
          ) : (
            <Icon name="add_task" className="text-[13px]" />
          )}
          Create task
        </button>
      )}
      {kind === 'goal' && step.goal && (
        <span className="flex h-6 items-center gap-1.5 px-1.5 text-[11px] text-amber-200/80">
          {goalLine(step.goal)}
          <span className="h-1 w-10 overflow-hidden rounded-full bg-white/[0.08]">
            <span
              className="block h-full rounded-full bg-amber-300"
              style={{ width: `${step.goal.percent}%` }}
            />
          </span>
        </span>
      )}
      {kind === 'goal' && !step.goalId && canEdit && (
        <button
          type="button"
          onClick={onDetails}
          className={cn(chip, 'text-amber-200/80')}
        >
          <Icon name="tune" className="text-[13px]" />
          Set up the goal
        </button>
      )}

      <button
        type="button"
        onClick={onDetails}
        className={cn(chip, 'ml-auto')}
        title="Open the step on the right"
      >
        Details
        <Icon name="chevron_right" className="text-[14px]" />
      </button>

      {/* A note for the linked task */}
      {kind === 'task' && step.task && canEdit && (
        <div className="mt-0.5 flex w-full items-center gap-1.5 pl-1">
          <Icon
            name="subdirectory_arrow_right"
            className="text-[13px] text-neutral-600"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Add a note to the task (Enter)"
            className="flex-1 bg-transparent text-xs text-neutral-300 placeholder:text-neutral-600 focus:outline-none"
          />
          {sending && <Spin className="size-3" />}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                  The steps                                 */
/* -------------------------------------------------------------------------- */

export const StepsEditor = ({
  plan,
  projects,
  people,
  canEdit,
  selectedStepId,
  onSelectStep,
  onChange,
  newStepProjectId,
  addsTasksIn,
  onMakeTask,
  onAddNote,
}: {
  plan: PlanView;
  /** The projects its steps can name. */
  projects: ProjectChoice[];
  people: Person[];
  canEdit: boolean;
  selectedStepId: string | null;
  onSelectStep: (id: string | null) => void;
  onChange: (change: (plan: PlanView) => PlanView) => void;
  /** The project new steps are for, e.g. on that project's page. */
  newStepProjectId?: string;
  addsTasksIn: (projectId?: string | null) => boolean;
  /** Makes the step's task; resolves when done. */
  onMakeTask: (stepId: string) => Promise<boolean>;
  /** Adds a note to the task the step links to. */
  onAddNote: (stepId: string, text: string) => Promise<boolean>;
}) => {
  const steps = plan.steps as EditorStep[];
  const boxes = useRef(new Map<string, HTMLTextAreaElement | null>());
  const [focusId, setFocusId] = useState<string | null>(null);
  const [slashId, setSlashId] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [makingId, setMakingId] = useState<string | null>(null);

  // Move the cursor to a step once it shows.
  useEffect(() => {
    if (!focusId) return;
    const el = boxes.current.get(focusId);
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      setFocusId(null);
    }
  });

  const slashStep = steps.find((s) => s.id === slashId);
  const query = slashStep?.text.startsWith('/') ? slashStep.text.slice(1) : '';
  const taken = useMemo(
    () =>
      new Set(
        steps.flatMap((s) => [s.taskId, s.goalId]).filter(Boolean),
      ) as Set<string>,
    [steps],
  );
  const links = useStepLinks({
    enabled: canEdit && !!slashStep,
    companyId: plan.companyId,
    rootId: plan.projectId,
    projects,
    query,
    taken,
  });
  const commands: Command[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [
      ...KIND_COMMANDS.filter(
        (c) => !q || c.label.toLowerCase().includes(q),
      ).map((c) => ({
        type: 'kind' as const,
        key: `kind:${c.label}`,
        kind: c.kind,
        goal: c.goal,
      })),
      ...links.items.map((link) => ({
        type: 'link' as const,
        key: link.key,
        link,
      })),
    ];
  }, [query, links.items]);
  useEffect(() => setActive(0), [query]);

  /* ------------------------------ changes ------------------------------ */

  const setStep = (id: string, fields: Partial<EditorStep>) =>
    onChange((p) => ({
      ...p,
      steps: p.steps.map((s) => (s.id === id ? { ...s, ...fields } : s)),
    }));

  /** A new step next to `id` (or at the end), with the cursor in it. */
  const insert = (
    id: string | null,
    where: 'above' | 'below',
    fields: Partial<EditorStep> = {},
  ) => {
    const from = steps.find((s) => s.id === id);
    const kind = from ? stepKind(from) : 'todo';
    const fresh: EditorStep = newStep({
      // Keep writing the same kind of step; a goal is followed by a to-do.
      kind: kind === 'goal' ? 'todo' : kind,
      projectId:
        (from && !from.taskId && !from.goalId ? from.projectId : null) ??
        newStepProjectId ??
        plan.projectId ??
        null,
      ...fields,
    });
    onChange((p) => {
      const at = p.steps.findIndex((s) => s.id === id);
      const list = [...p.steps];
      if (at < 0) list.push(fresh);
      else list.splice(where === 'above' ? at : at + 1, 0, fresh);
      return { ...p, steps: list };
    });
    setFocusId(fresh.id);
    return fresh;
  };

  const remove = (id: string, focusBefore = true) => {
    const at = steps.findIndex((s) => s.id === id);
    onChange((p) => ({ ...p, steps: p.steps.filter((s) => s.id !== id) }));
    if (selectedStepId === id) onSelectStep(null);
    const near = steps[at - 1] ?? steps[at + 1];
    if (focusBefore && near) setFocusId(near.id);
  };

  const move = (id: string, by: -1 | 1) => {
    onChange((p) => {
      const at = p.steps.findIndex((s) => s.id === id);
      const to = at + by;
      if (at < 0 || to < 0 || to >= p.steps.length) return p;
      const list = [...p.steps];
      [list[at], list[to]] = [list[to], list[at]];
      return { ...p, steps: list };
    });
    setFocusId(id);
  };

  /** Changes what kind of step it is; leaving a task or goal unlinks it. */
  const setKind = (step: EditorStep, kind: PlanStepKind, goal?: GoalKind) => {
    const current = stepKind(step);
    const fields: Partial<EditorStep> = { kind };
    if (current !== kind) {
      if (step.taskId || step.goalId)
        Object.assign(fields, {
          taskId: null,
          goalId: null,
          task: null,
          goal: null,
          text: step.task?.title ?? step.goal?.title ?? step.text,
        });
      if (kind === 'info') fields.done = false;
    }
    if (kind === 'goal' && !step.goalId) {
      fields.draftGoal = goal ?? 'scheduled';
      onSelectStep(step.id);
    }
    setStep(step.id, fields);
  };

  const runCommand = (step: EditorStep, command: Command) => {
    setSlashId(null);
    if (command.type === 'link') {
      setStep(step.id, { ...linkFields(command.link) });
      setFocusId(step.id);
      return;
    }
    setStep(step.id, { text: '' });
    setKind({ ...step, text: '' }, command.kind, command.goal);
    setFocusId(step.id);
  };

  const makeTask = async (step: EditorStep) => {
    setMakingId(step.id);
    const done = await onMakeTask(step.id);
    setMakingId(null);
    return done;
  };

  /* ------------------------------ keyboard ----------------------------- */

  const onKey = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    step: EditorStep,
    index: number,
  ) => {
    // The "/" menu takes the arrows and Enter while it is open.
    if (slashId === step.id && commands.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        return setActive(Math.min(commands.length - 1, active + 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        return setActive(Math.max(0, active - 1));
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        return runCommand(step, commands[active]);
      }
    }
    if (slashId === step.id && e.key === 'Escape') {
      e.preventDefault();
      return setSlashId(null);
    }
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      return move(step.id, e.key === 'ArrowUp' ? -1 : 1);
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const kind = stepKind(step);
      // Ctrl+Enter makes the task out of a task step, then moves on.
      if (
        kind === 'task' &&
        !step.taskId &&
        step.projectId &&
        step.text.trim() &&
        addsTasksIn(step.projectId)
      )
        makeTask(step);
      insert(step.id, 'below');
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      insert(step.id, 'below');
      return;
    }
    const el = e.currentTarget;
    if (e.key === 'Backspace' && !el.value && steps.length > 0) {
      e.preventDefault();
      remove(step.id);
      return;
    }
    if (e.key === 'ArrowUp' && el.selectionStart === 0 && index > 0) {
      e.preventDefault();
      setFocusId(steps[index - 1].id);
    }
    if (
      e.key === 'ArrowDown' &&
      el.selectionEnd === el.value.length &&
      index < steps.length - 1
    ) {
      e.preventDefault();
      setFocusId(steps[index + 1].id);
    }
  };

  /* -------------------------------- rows -------------------------------- */

  return (
    <div className="mt-2 flex flex-col">
      {steps.map((step, index) => {
        const kind = stepKind(step);
        const linked = !!(step.task || step.goal);
        const selected = step.id === selectedStepId;
        return (
          <div
            key={step.id}
            onClick={() => onSelectStep(step.id)}
            className={cn(
              'group relative flex items-start gap-1.5 rounded-lg py-1 pl-0.5 pr-2 transition-colors',
              selected ? 'bg-white/[0.05]' : 'hover:bg-white/[0.025]',
            )}
          >
            {canEdit ? (
              <div className="mt-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                <RowMenu
                  canUp={index > 0}
                  canDown={index < steps.length - 1}
                  onInsert={(where) => insert(step.id, where)}
                  onMove={(by) => move(step.id, by)}
                  onDelete={() => remove(step.id, false)}
                />
              </div>
            ) : (
              <span className="w-6" />
            )}

            {/* What kind of step, at a glance */}
            <div className="mt-[3px] flex w-5 shrink-0 justify-center">
              {kind === 'info' ? (
                <span className="mt-[7px] size-1.5 rounded-full bg-neutral-600" />
              ) : kind === 'goal' ? (
                <GoalStar met={!!step.goal?.met} />
              ) : (
                <button
                  type="button"
                  aria-label={step.done ? 'Mark not done' : 'Mark done'}
                  disabled={!canEdit || !!step.task}
                  title={step.task ? 'Done when its task is done' : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    setStep(step.id, { done: !step.done });
                  }}
                  className={cn(
                    'text-[18px]',
                    step.done
                      ? 'text-emerald-400'
                      : kind === 'task'
                        ? 'text-sky-400/60 hover:text-sky-300'
                        : 'text-neutral-600 hover:text-neutral-400',
                  )}
                >
                  <Icon
                    name={
                      step.done
                        ? 'check_circle'
                        : kind === 'task'
                          ? 'radio_button_unchecked'
                          : 'check_box_outline_blank'
                    }
                    filled={step.done}
                  />
                </button>
              )}
            </div>

            <div className="relative min-w-0 flex-1">
              {linked ? (
                <p
                  className={cn(
                    'py-px text-sm leading-6',
                    step.done && kind === 'task'
                      ? 'text-neutral-500 line-through'
                      : 'text-neutral-100',
                  )}
                >
                  {step.task?.title ?? step.goal?.title ?? step.text}
                </p>
              ) : (
                <GrowingText
                  value={step.text}
                  boxRef={(el) => boxes.current.set(step.id, el)}
                  onChange={(text) => {
                    setStep(step.id, { text });
                    setSlashId(text.startsWith('/') ? step.id : null);
                  }}
                  onFocus={() => onSelectStep(step.id)}
                  onBlur={() =>
                    setSlashId((id) => (id === step.id ? null : id))
                  }
                  onKeyDown={(e) => onKey(e, step, index)}
                  disabled={!canEdit}
                  placeholder={
                    kind === 'goal'
                      ? 'Name the goal, then set it up on the right'
                      : kind === 'task'
                        ? 'What the task is'
                        : 'Type / for commands'
                  }
                  className={cn(
                    'py-px text-sm leading-6 placeholder:text-neutral-600',
                    kind === 'info'
                      ? 'text-neutral-300'
                      : step.done
                        ? 'text-neutral-500 line-through'
                        : 'text-neutral-100',
                  )}
                />
              )}

              {slashId === step.id && (
                <div className="absolute inset-x-0 top-full z-30 mt-1">
                  <div
                    className="max-h-96 overflow-y-auto rounded-xl border border-white/10 bg-neutral-900 p-1.5 shadow-2xl"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      Turn into
                    </p>
                    {commands
                      .map((c, i) => ({ c, i }))
                      .filter(({ c }) => c.type === 'kind')
                      .map(({ c, i }) => {
                        const meta = KIND_COMMANDS.find(
                          (k) => `kind:${k.label}` === c.key,
                        )!;
                        return (
                          <button
                            key={c.key}
                            type="button"
                            onMouseEnter={() => setActive(i)}
                            onClick={() => runCommand(step, c)}
                            className={cn(
                              'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left',
                              i === active
                                ? 'bg-white/[0.08]'
                                : 'hover:bg-white/[0.05]',
                            )}
                          >
                            <span className="flex size-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
                              <Icon
                                name={meta.icon}
                                className="text-[16px] text-neutral-300"
                              />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm text-neutral-100">
                                {meta.label}
                              </span>
                              <span className="block truncate text-[11px] text-neutral-500">
                                {meta.hint}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    <LinkMenu
                      items={links.items}
                      loading={links.loading}
                      active={
                        active -
                        commands.filter((c) => c.type === 'kind').length
                      }
                      projects={projects}
                      onPick={(link) =>
                        runCommand(step, { type: 'link', key: link.key, link })
                      }
                      onHover={(i) =>
                        setActive(
                          i + commands.filter((c) => c.type === 'kind').length,
                        )
                      }
                      className="mt-1 max-h-none border-0 bg-transparent p-0 shadow-none"
                    />
                  </div>
                </div>
              )}

              <StepBar
                step={step}
                projects={projects}
                people={people}
                canEdit={canEdit}
                canMakeTask={addsTasksIn(step.projectId)}
                makingTask={makingId === step.id}
                onChange={(fields) => setStep(step.id, fields)}
                onKind={(k) => setKind(step, k)}
                onDetails={() => onSelectStep(step.id)}
                onMakeTask={() => makeTask(step)}
                onAddNote={(text) => onAddNote(step.id, text)}
              />
            </div>
          </div>
        );
      })}

      {canEdit && (
        <button
          type="button"
          onClick={() => insert(steps.at(-1)?.id ?? null, 'below')}
          className="mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-neutral-600 hover:bg-white/[0.025] hover:text-neutral-400"
        >
          <Icon name="add" className="text-[18px]" />
          Add a step
          <span className="text-xs text-neutral-700">
            · type / for commands · Enter for the next · Ctrl+Enter makes the
            task
          </span>
        </button>
      )}
    </div>
  );
};
