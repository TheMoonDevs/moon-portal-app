'use client';

import type { User } from '@db/client';
import type { ReactNode } from 'react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { newStep } from '@/lib/workspace/plans';
import type { GoalKind, PlanStepKind } from '@/models/workspace';

import { Icon, Spin } from '../Admin/shared/AdminUI';
import {
  AvatarStack,
  PeoplePicker,
  TASK_STATUS_META,
} from '../Admin/Workspace/shared';
import { DeleteStepDialog } from './DeleteStepDialog';
import {
  goalLine,
  GoalStar,
  GrowingText,
  hasMarkdown,
  headingOf,
  MarkdownLines,
  MarkdownText,
  ProjectDot,
  ProjectOptions,
} from './planBits';
import { StepInfo } from './StepInfo';
import { linkFields, LinkMenu, type StepLink, useStepLinks } from './StepLinks';
import type { Person, PlanView, ProjectChoice, StepView } from './types';
import { isPast, stepKind } from './types';

/*
 * A plan's steps, edited like a Notion page: each step is a line, "/" opens
 * the commands (what kind of step, or a task or goal to link), Enter starts
 * the next step, and Shift+Enter opens the step's details under its title.
 * A task step becomes a real task in its project by itself once it has a
 * title and a project and the cursor leaves it; its circle ticks the task
 * done. The step being edited shows its project, date, people and type;
 * Details opens it in full under the step, and the (i) at the end of a step
 * shows it to anyone.
 * Steps move with the handle (drag, or its menu) or Alt+↑/↓.
 *
 * Steps take Markdown too: "[] " starts a task, "- " a text step, "# " a
 * heading; **bold**, *italic*, `code`, ~~strike~~, ==highlight== and
 * [links](…) show formatted once the cursor leaves the step. Pasting a
 * Markdown list makes a step of each line.
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
  task: {
    label: 'Task',
    icon: 'task_alt',
    hint: 'Something to do; Ctrl+Enter makes it a task in its project',
  },
  goal: {
    label: 'Goal',
    icon: 'star',
    hint: 'A repeating goal or a number to reach',
  },
};

type Command =
  | {
      type: 'kind';
      key: string;
      kind: PlanStepKind;
      goal?: GoalKind;
      prefix?: string;
    }
  | { type: 'link'; key: string; link: StepLink };

const KIND_COMMANDS: {
  kind: PlanStepKind;
  goal?: GoalKind;
  label: string;
  icon: string;
  hint: string;
  /** More words it is found by. */
  also?: string;
  /** The Markdown that makes it while typing, shown in the menu. */
  md?: string;
  /** What the step starts with, e.g. "## " for a heading. */
  prefix?: string;
}[] = [
  { kind: 'info', ...KIND_META.info, also: 'note paragraph bullet', md: '-' },
  {
    kind: 'info',
    label: 'Heading',
    icon: 'format_h2',
    hint: 'A title for the steps under it',
    also: 'h1 h2 h3 section title phase',
    md: '#',
    prefix: '## ',
  },
  {
    kind: 'task',
    ...KIND_META.task,
    also: 'todo to-do checkbox',
    md: '[]',
  },
  {
    kind: 'goal',
    goal: 'scheduled',
    label: 'Repeating goal',
    icon: 'event_repeat',
    hint: 'Makes its own tasks every day, week or month',
    also: 'schedule recurring weekly daily',
  },
  {
    kind: 'goal',
    goal: 'target',
    label: 'Target goal',
    icon: 'emoji_events',
    hint: 'One number to reach',
    also: 'number kpi metric',
  },
];

/** A shortcut typed at the start of an empty step: what it turns it into. */
const typedShortcut = (
  text: string,
): { kind: PlanStepKind; text: string; done?: boolean } | null => {
  const todo = /^(?:[-*+]\s)?\[( |x|X)?\]\s$/.exec(text);
  if (todo) return { kind: 'task', text: '', done: !!todo[1]?.trim() };
  if (/^[-*+]\s$/.test(text)) return { kind: 'info', text: '' };
  if (/^#{1,3}\s$/.test(text)) return { kind: 'info', text };
  return null;
};

/** Pasted Markdown lines as steps; null for a single line. */
const pastedSteps = (text: string) => {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^(```|~~~|-{3,}$)/.test(l));
  if (lines.length < 2) return null;
  return lines.map((line) => {
    const todo = /^(?:[-*+]\s+|\d+[.)]\s+)?\[([ xX])\]\s+(.*)$/.exec(line);
    if (todo)
      return { kind: 'task' as const, text: todo[2], done: todo[1] !== ' ' };
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading)
      return {
        kind: 'info' as const,
        text: `${'#'.repeat(Math.min(3, heading[1].length))} ${heading[2]}`,
      };
    const item = /^(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line);
    return { kind: null, text: item ? item[1] : line.replace(/^>\s?/, '') };
  });
};

/** A heading step ("# ", "## ", "### ") is bigger, as typed and shown. */
const headingClass = (text: string) => {
  const level = headingOf(text)?.level;
  return level === 1
    ? 'text-lg font-semibold leading-7'
    : level === 2
      ? 'text-base font-semibold leading-7'
      : level === 3
        ? 'font-semibold'
        : undefined;
};

/** "Nov 3, 4:12 PM": when a step's task was done. */
export const doneAt = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== new Date().getFullYear() && { year: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
  });
};

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
  deleteHint,
}: {
  onInsert: (where: 'above' | 'below') => void;
  onMove: (by: -1 | 1) => void;
  onDelete: () => void;
  /** Says why Delete is not here, e.g. a step linked to a task. */
  deleteHint?: string;
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
            {deleteHint ? (
              <p className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-neutral-500">
                <Icon name="info" className="text-[14px]" />
                {deleteHint}
              </p>
            ) : (
              item('delete', 'Delete step', onDelete)
            )}
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
  makeFailed,
  detailsOpen,
  onChange,
  onKind,
  onDetails,
  onMakeTask,
}: {
  step: EditorStep;
  projects: ProjectChoice[];
  people: Person[];
  canEdit: boolean;
  canMakeTask: boolean;
  makingTask: boolean;
  /** Making its task by itself failed: offer to try again. */
  makeFailed: boolean;
  /** Its details are open under it. */
  detailsOpen: boolean;
  onChange: (fields: Partial<EditorStep>) => void;
  onKind: (kind: PlanStepKind) => void;
  onDetails: () => void;
  onMakeTask: () => void;
}) => {
  const kind = stepKind(step);
  const linked = !!(step.taskId || step.goalId);
  const [picking, setPicking] = useState(false);
  const stepPeople = step.assigneeIds
    .map((id) => people.find((p) => p.id === id))
    .filter(Boolean) as Person[];
  const project = projects.find((p) => p.id === step.projectId);

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
        // The task is made by itself; this says what it waits for.
        <button
          type="button"
          disabled={!makeFailed || makingTask}
          onClick={onMakeTask}
          title={
            makeFailed
              ? 'Try making the task again'
              : !step.projectId
                ? 'Pick a project: the task is made there'
                : !canMakeTask
                  ? 'Only the people on that project can add its tasks'
                  : 'The task is made once you leave the step'
          }
          className={cn(
            chip,
            'disabled:hover:bg-transparent',
            makeFailed
              ? 'text-rose-300/90 hover:text-rose-200'
              : 'text-neutral-600 disabled:hover:text-neutral-600',
          )}
        >
          {makingTask ? (
            <>
              <Spin className="size-3" /> Making the task
            </>
          ) : makeFailed ? (
            <>
              <Icon name="refresh" className="text-[13px]" /> Make the task
            </>
          ) : !step.projectId ? (
            <>
              <Icon name="info" className="text-[13px]" /> Pick a project for
              its task
            </>
          ) : !canMakeTask ? (
            <>
              <Icon name="lock" className="text-[13px]" /> Not on that project’s
              team
            </>
          ) : (
            <>
              <Icon name="add_task" className="text-[13px]" /> Becomes a task
            </>
          )}
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
        className={cn(chip, 'ml-auto', detailsOpen && 'text-neutral-200')}
        title={detailsOpen ? 'Close the details' : 'Open the step in full'}
      >
        <Icon
          name={detailsOpen ? 'expand_less' : 'tune'}
          className="text-[13px]"
        />
        Details
      </button>
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
  onTickTask,
  onDeleteTask,
  details,
}: {
  plan: PlanView;
  /** The projects its steps can name. */
  projects: ProjectChoice[];
  people: Person[];
  canEdit: boolean;
  /** The step open in full, under its row. */
  selectedStepId: string | null;
  /** Opens a step in full (null closes it). */
  onSelectStep: (id: string | null) => void;
  onChange: (change: (plan: PlanView) => PlanView) => void;
  /** The project new steps are for, e.g. on that project's page. */
  newStepProjectId?: string;
  addsTasksIn: (projectId?: string | null) => boolean;
  /** Makes the step's task; resolves when done. `quiet`: no toast. */
  onMakeTask: (stepId: string, quiet?: boolean) => Promise<boolean>;
  /** Ticks a task step's task done or not. */
  onTickTask: (stepId: string, done: boolean) => void;
  /** The selected step in full, shown under its row. */
  details?: ReactNode;
  /** Deletes a step's task and the step; resolves when done. */
  onDeleteTask: (stepId: string) => Promise<boolean>;
}) => {
  const steps = plan.steps as EditorStep[];
  const boxes = useRef(new Map<string, HTMLElement | null>());
  const listRef = useRef<HTMLDivElement | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  /** The step being edited: it shows its options. */
  const [activeId, setActiveId] = useState<string | null>(null);
  /** Steps whose details box is open while still empty. */
  const [openDetails, setOpenDetails] = useState<Set<string>>(new Set());
  const [slashId, setSlashId] = useState<string | null>(null);
  /** The box being typed in ("<id>" or "<id>:details"): shows its Markdown. */
  const [typingId, setTypingId] = useState<string | null>(null);
  /** Whether a box shows its text formatted rather than as typed. */
  const showsFormatted = (box: string, text: string) =>
    hasMarkdown(text) && (!canEdit || (typingId !== box && focusId !== box));
  const [active, setActive] = useState(0);
  const [makingId, setMakingId] = useState<string | null>(null);
  /** Steps whose task could not be made: not tried again by themselves. */
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  /** A step linked to a task, asked about before it goes. */
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleting = steps.find((s) => s.id === deletingId);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<{
    id: string;
    where: 'above' | 'below';
  } | null>(null);

  // A click outside the steps puts the step being edited away.
  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (!listRef.current?.contains(e.target as Node)) setActiveId(null);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  // Move the cursor once the box shows: "<id>" for the title,
  // "<id>:details" for the details box.
  useEffect(() => {
    if (!focusId) return;
    const el = boxes.current.get(focusId);
    if (el) {
      el.focus();
      if (el instanceof HTMLTextAreaElement)
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
        (c) =>
          !q ||
          c.label.toLowerCase().includes(q) ||
          c.also?.split(' ').some((w) => w.startsWith(q)),
      ).map((c) => ({
        type: 'kind' as const,
        key: `kind:${c.label}`,
        kind: c.kind,
        goal: c.goal,
        prefix: c.prefix,
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
    const kind = from ? stepKind(from) : 'task';
    const fresh: EditorStep = newStep({
      // Keep writing the same kind of step; a goal is followed by a task.
      kind: kind === 'goal' ? 'task' : kind,
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
    setActiveId(fresh.id);
    setFocusId(fresh.id);
    return fresh;
  };

  const remove = (id: string, focusBefore = true) => {
    const at = steps.findIndex((s) => s.id === id);
    onChange((p) => ({ ...p, steps: p.steps.filter((s) => s.id !== id) }));
    if (selectedStepId === id) onSelectStep(null);
    const near = steps[at - 1] ?? steps[at + 1];
    if (focusBefore && near) {
      setActiveId(near.id);
      setFocusId(near.id);
    }
  };

  /** Puts step `id` next to step `to` (above or below it). */
  const moveTo = (id: string, to: string, where: 'above' | 'below') => {
    if (id === to) return;
    onChange((p) => {
      const step = p.steps.find((s) => s.id === id);
      if (!step) return p;
      const list = p.steps.filter((s) => s.id !== id);
      const at = list.findIndex((s) => s.id === to);
      if (at < 0) return p;
      list.splice(where === 'above' ? at : at + 1, 0, step);
      return { ...p, steps: list };
    });
    setActiveId(id);
  };

  const move = (id: string, by: -1 | 1) => {
    const at = steps.findIndex((s) => s.id === id);
    const next = steps[at + by];
    if (at < 0 || !next) return;
    moveTo(id, next.id, by < 0 ? 'above' : 'below');
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
      // A new goal is set up in its details.
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
    const text = command.prefix ?? '';
    setStep(step.id, { text });
    setKind({ ...step, text }, command.kind, command.goal);
    setFocusId(step.id);
  };

  /** Typing in a step's title, with its Markdown shortcuts. */
  const typeTitle = (step: EditorStep, text: string) => {
    const shortcut = typedShortcut(text);
    if (shortcut && !step.taskId && !step.goalId) {
      setSlashId(null);
      setStep(step.id, {
        text: shortcut.text,
        ...(shortcut.done !== undefined && { done: shortcut.done }),
      });
      setKind({ ...step, text: shortcut.text }, shortcut.kind);
      return;
    }
    setStep(step.id, { text });
    setSlashId(text.startsWith('/') ? step.id : null);
  };

  /** Pasting several lines (a Markdown list, notes) makes a step of each. */
  const pasteSteps = (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    step: EditorStep,
  ) => {
    const lines = pastedSteps(e.clipboardData.getData('text/plain'));
    if (!lines) return;
    e.preventDefault();
    const current = stepKind(step);
    const fallback: PlanStepKind = current === 'goal' ? 'task' : current;
    const projectId =
      (!step.taskId && !step.goalId ? step.projectId : null) ??
      newStepProjectId ??
      plan.projectId ??
      null;
    const fillsThis = !step.text.trim() && !step.taskId && !step.goalId;
    const made = lines.map((line, i) =>
      fillsThis && i === 0
        ? null
        : (newStep({
            kind: line.kind ?? fallback,
            text: line.text,
            done: !!('done' in line && line.done),
            projectId,
          }) as EditorStep),
    );
    onChange((p) => {
      const list = p.steps.map((s) =>
        s.id === step.id && fillsThis
          ? {
              ...s,
              kind: lines[0].kind ?? fallback,
              text: lines[0].text,
              done: !!('done' in lines[0] && lines[0].done),
            }
          : s,
      );
      const at = list.findIndex((s) => s.id === step.id);
      list.splice(at + 1, 0, ...(made.filter(Boolean) as EditorStep[]));
      return { ...p, steps: list };
    });
    const last = made.at(-1) ?? null;
    if (last) {
      setActiveId(last.id);
      setFocusId(last.id);
    }
  };

  const makeTask = async (step: EditorStep, quiet = false) => {
    setMakingId(step.id);
    const done = await onMakeTask(step.id, quiet);
    setMakingId(null);
    setFailedIds((set) => {
      const next = new Set(set);
      if (done) next.delete(step.id);
      else next.add(step.id);
      return next;
    });
    return done;
  };

  // A task step becomes its task by itself: once it has a title and a
  // project and is not being typed in. One at a time, so each link lands.
  useEffect(() => {
    if (!canEdit || makingId) return;
    const ready = steps.find(
      (s) =>
        stepKind(s) === 'task' &&
        !s.taskId &&
        !s.goalId &&
        !!s.projectId &&
        !!s.text.trim() &&
        !s.text.startsWith('/') &&
        typingId !== s.id &&
        slashId !== s.id &&
        !failedIds.has(s.id) &&
        addsTasksIn(s.projectId),
    );
    if (ready) makeTask(ready, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, canEdit, makingId, typingId, slashId, failedIds]);

  const showDetails = (id: string) => {
    setOpenDetails((set) => new Set(set).add(id));
    setActiveId(id);
    setFocusId(`${id}:details`);
  };
  const hideDetails = (id: string) =>
    setOpenDetails((set) => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });

  /* ------------------------------ keyboard ----------------------------- */

  /** Keys every step takes, typed in its title or on a linked step. */
  const stepKeys = (e: React.KeyboardEvent, step: EditorStep) => {
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      move(step.id, e.key === 'ArrowUp' ? -1 : 1);
      return true;
    }
    if (e.key !== 'Enter') return false;
    e.preventDefault();
    if (e.shiftKey) {
      // Shift+Enter: the step's details, under its title.
      showDetails(step.id);
      return true;
    }
    // Enter (or Ctrl+Enter) moves on; leaving a task step makes its task.
    insert(step.id, 'below');
    return true;
  };

  const onTitleKey = (
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
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        return runCommand(step, commands[active]);
      }
    }
    if (slashId === step.id && e.key === 'Escape') {
      e.preventDefault();
      return setSlashId(null);
    }
    if (stepKeys(e, step)) return;
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
    if (e.key === 'ArrowDown' && el.selectionEnd === el.value.length) {
      e.preventDefault();
      if (step.notes || openDetails.has(step.id))
        setFocusId(`${step.id}:details`);
      else if (index < steps.length - 1) setFocusId(steps[index + 1].id);
    }
  };

  const onDetailsKey = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    step: EditorStep,
    index: number,
  ) => {
    const el = e.currentTarget;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      insert(step.id, 'below');
      return;
    }
    if (
      e.key === 'Escape' ||
      (e.key === 'Backspace' && !el.value) ||
      (e.key === 'ArrowUp' && el.selectionStart === 0)
    ) {
      e.preventDefault();
      if (!el.value) hideDetails(step.id);
      setFocusId(step.id);
      return;
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
    <div
      ref={listRef}
      className="mt-2 flex flex-col"
      onDragEnd={() => setDragId(null)}
    >
      {steps.map((step, index) => {
        const kind = stepKind(step);
        const linked = !!(step.task || step.goal);
        const isOpen = step.id === selectedStepId;
        const editing = step.id === activeId || isOpen;
        const detailsShown = !!step.notes || openDetails.has(step.id);
        return (
          <Fragment key={step.id}>
            <div
              onClick={() => setActiveId(step.id)}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                const box = e.currentTarget.getBoundingClientRect();
                const where =
                  e.clientY < box.top + box.height / 2 ? 'above' : 'below';
                if (dropAt?.id !== step.id || dropAt.where !== where)
                  setDropAt({ id: step.id, where });
              }}
              onDragLeave={() =>
                setDropAt((d) => (d?.id === step.id ? null : d))
              }
              onDrop={(e) => {
                e.preventDefault();
                if (dragId && dropAt) moveTo(dragId, dropAt.id, dropAt.where);
                setDragId(null);
                setDropAt(null);
              }}
              className={cn(
                'group relative flex items-start gap-1.5 rounded-lg py-1 pl-0.5 pr-2 transition-colors',
                editing ? 'bg-white/[0.05]' : 'hover:bg-white/[0.025]',
                dragId === step.id && 'opacity-40',
              )}
            >
              {dropAt?.id === step.id && dragId && dragId !== step.id && (
                <span
                  className={cn(
                    'pointer-events-none absolute inset-x-2 h-0.5 rounded-full bg-sky-400',
                    dropAt.where === 'above' ? '-top-px' : '-bottom-px',
                  )}
                />
              )}
              {canEdit ? (
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', step.id);
                    setDragId(step.id);
                  }}
                  title="Drag to move, click for more"
                  className={cn(
                    'mt-0.5 cursor-grab transition-opacity active:cursor-grabbing',
                    editing
                      ? 'opacity-100'
                      : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100',
                  )}
                >
                  <RowMenu
                    canUp={index > 0}
                    canDown={index < steps.length - 1}
                    onInsert={(where) => insert(step.id, where)}
                    onMove={(by) => move(step.id, by)}
                    onDelete={() => remove(step.id, false)}
                    deleteHint={
                      step.taskId
                        ? 'Linked to a task: delete it from Details'
                        : undefined
                    }
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
                    disabled={!canEdit}
                    title={
                      step.task
                        ? step.done
                          ? 'Done: tick to open the task again'
                          : 'Tick its task done'
                        : undefined
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      if (step.taskId) onTickTask(step.id, !step.done);
                      else setStep(step.id, { done: !step.done });
                    }}
                    className={cn(
                      'text-[18px]',
                      step.done
                        ? 'text-emerald-400'
                        : step.task
                          ? 'text-sky-400/70'
                          : 'text-neutral-600 hover:text-neutral-400',
                    )}
                  >
                    <Icon
                      name={
                        step.done ? 'check_circle' : 'radio_button_unchecked'
                      }
                      filled={step.done}
                    />
                  </button>
                )}
              </div>

              <div className="relative min-w-0 flex-1">
                <div className="flex items-start gap-1">
                  {linked ? (
                    <p
                      tabIndex={0}
                      ref={(el) => {
                        boxes.current.set(step.id, el);
                      }}
                      onFocus={() => setActiveId(step.id)}
                      onKeyDown={(e) => {
                        if (!canEdit) return;
                        if (
                          step.taskId &&
                          (e.key === 'Backspace' || e.key === 'Delete')
                        ) {
                          // A task step asks first: the task may go too.
                          e.preventDefault();
                          setDeletingId(step.id);
                          return;
                        }
                        if (
                          !step.taskId &&
                          (e.key === 'Backspace' || e.key === 'Delete')
                        ) {
                          e.preventDefault();
                          remove(step.id);
                          return;
                        }
                        stepKeys(e, step);
                      }}
                      className="min-w-0 flex-1 py-px text-sm leading-6 focus:outline-none"
                    >
                      <span
                        className={cn(
                          step.done && kind === 'task'
                            ? 'text-neutral-500 line-through'
                            : 'text-neutral-100',
                        )}
                      >
                        <MarkdownText
                          text={
                            step.task?.title ?? step.goal?.title ?? step.text
                          }
                        />
                      </span>
                      {step.done && step.task?.completedAt && (
                        <span
                          className="ml-2 whitespace-nowrap text-[11px] text-emerald-400/80"
                          title="When the task was done"
                        >
                          <Icon
                            name="check"
                            className="mr-0.5 align-[-2px] text-[13px]"
                          />
                          {doneAt(step.task.completedAt)}
                        </span>
                      )}
                    </p>
                  ) : (
                    <div className="min-w-0 flex-1">
                      {showsFormatted(step.id, step.text) ? (
                        <div
                          tabIndex={canEdit ? 0 : -1}
                          onFocus={() => {
                            setActiveId(step.id);
                            setFocusId(step.id);
                          }}
                          className={cn(
                            'min-h-6 cursor-text whitespace-pre-wrap break-words py-px text-sm leading-6 focus:outline-none',
                            headingClass(step.text),
                            kind === 'info'
                              ? 'text-neutral-300'
                              : step.done
                                ? 'text-neutral-500 line-through'
                                : 'text-neutral-100',
                          )}
                        >
                          <MarkdownText
                            text={headingOf(step.text)?.text ?? step.text}
                          />
                        </div>
                      ) : (
                        <GrowingText
                          value={step.text}
                          boxRef={(el) => boxes.current.set(step.id, el)}
                          onChange={(text) => typeTitle(step, text)}
                          onPaste={(e) => pasteSteps(e, step)}
                          onFocus={() => {
                            setActiveId(step.id);
                            setTypingId(step.id);
                          }}
                          onBlur={() => {
                            setSlashId((id) => (id === step.id ? null : id));
                            setTypingId((id) => (id === step.id ? null : id));
                          }}
                          onKeyDown={(e) => onTitleKey(e, step, index)}
                          disabled={!canEdit}
                          placeholder={
                            kind === 'goal'
                              ? 'Name the goal, then set it up in Details'
                              : 'Type / for commands'
                          }
                          className={cn(
                            'py-px text-sm leading-6 placeholder:text-neutral-600',
                            headingClass(step.text),
                            kind === 'info'
                              ? 'text-neutral-300'
                              : step.done
                                ? 'text-neutral-500 line-through'
                                : 'text-neutral-100',
                          )}
                        />
                      )}
                    </div>
                  )}
                  <StepInfo
                    plan={plan}
                    step={step}
                    projects={projects}
                    people={people}
                  />
                </div>

                {/* Details, under the title (Shift+Enter) */}
                {detailsShown &&
                  showsFormatted(`${step.id}:details`, step.notes ?? '') && (
                    <div
                      tabIndex={canEdit ? 0 : -1}
                      onFocus={() => {
                        setActiveId(step.id);
                        setFocusId(`${step.id}:details`);
                      }}
                      className="mb-0.5 cursor-text whitespace-pre-wrap break-words border-l border-white/10 pl-2 text-xs leading-5 text-neutral-400 focus:outline-none"
                    >
                      <MarkdownLines text={step.notes ?? ''} />
                    </div>
                  )}
                {detailsShown &&
                  !showsFormatted(`${step.id}:details`, step.notes ?? '') && (
                    <GrowingText
                      value={step.notes ?? ''}
                      boxRef={(el) =>
                        boxes.current.set(`${step.id}:details`, el)
                      }
                      onChange={(notes) => setStep(step.id, { notes })}
                      onFocus={() => {
                        setActiveId(step.id);
                        setTypingId(`${step.id}:details`);
                      }}
                      onBlur={() => {
                        setTypingId((id) =>
                          id === `${step.id}:details` ? null : id,
                        );
                        if (!step.notes?.trim()) hideDetails(step.id);
                      }}
                      onKeyDown={(e) => onDetailsKey(e, step, index)}
                      disabled={!canEdit}
                      placeholder="Details, links, anything that helps"
                      className="mb-0.5 border-l border-white/10 pl-2 text-xs leading-5 text-neutral-400 placeholder:text-neutral-600"
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
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm text-neutral-100">
                                  {meta.label}
                                </span>
                                <span className="block truncate text-[11px] text-neutral-500">
                                  {meta.hint}
                                </span>
                              </span>
                              {meta.md && (
                                <kbd className="shrink-0 font-mono text-[11px] text-neutral-600">
                                  {meta.md}
                                </kbd>
                              )}
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
                          runCommand(step, {
                            type: 'link',
                            key: link.key,
                            link,
                          })
                        }
                        onHover={(i) =>
                          setActive(
                            i +
                              commands.filter((c) => c.type === 'kind').length,
                          )
                        }
                        className="mt-1 max-h-none border-0 bg-transparent p-0 shadow-none"
                      />
                    </div>
                  </div>
                )}

                {editing && canEdit && (
                  <StepBar
                    step={step}
                    projects={projects}
                    people={people}
                    canEdit={canEdit}
                    canMakeTask={addsTasksIn(step.projectId)}
                    makingTask={makingId === step.id}
                    makeFailed={failedIds.has(step.id)}
                    detailsOpen={isOpen}
                    onChange={(fields) => setStep(step.id, fields)}
                    onKind={(k) => setKind(step, k)}
                    onDetails={() => onSelectStep(isOpen ? null : step.id)}
                    onMakeTask={() => makeTask(step)}
                  />
                )}
              </div>
            </div>
            {isOpen && details && (
              <div className="mb-2 ml-7 mt-1">{details}</div>
            )}
          </Fragment>
        );
      })}

      <DeleteStepDialog
        open={!!deleting}
        title={deleting?.task?.title ?? deleting?.text ?? ''}
        onClose={() => setDeletingId(null)}
        onRemoveStep={() => deleting && remove(deleting.id)}
        onDeleteTask={async () => {
          if (!deleting) return false;
          const at = steps.findIndex((s) => s.id === deleting.id);
          const near = steps[at - 1] ?? steps[at + 1];
          const done = await onDeleteTask(deleting.id);
          if (done && near) {
            setActiveId(near.id);
            setFocusId(near.id);
          }
          return done;
        }}
      />

      {canEdit && (
        <button
          type="button"
          onClick={() => insert(steps.at(-1)?.id ?? null, 'below')}
          className="mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-neutral-600 hover:bg-white/[0.025] hover:text-neutral-400"
        >
          <Icon name="add" className="shrink-0 text-[18px]" />
          <span className="shrink-0">Add a step</span>
          <span className="hidden min-w-0 truncate text-xs text-neutral-700 sm:inline">
            · / for commands · Enter for the next · Shift+Enter for details · a
            task step with a project becomes its task
          </span>
        </button>
      )}
    </div>
  );
};
