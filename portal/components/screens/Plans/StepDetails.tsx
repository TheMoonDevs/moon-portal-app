'use client';

import type { User } from '@db/client';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import type { PlanStepKind } from '@/models/workspace';
import { TASK_STATUS } from '@/models/workspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  DateInput,
  Field,
  Icon,
  IconAction,
  NativeSelect,
  Segmented,
  TextArea,
  TextInput,
  UserAvatar,
} from '../Admin/shared/AdminUI';
import {
  type GoalDraft,
  GoalFields,
  goalForSave,
  newGoalDraft,
} from '../Admin/Workspace/GoalsEditor';
import {
  AvatarStack,
  errorText,
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
import {
  linkFields,
  LinkMenu,
  menuKeys,
  type StepLink,
  useStepLinks,
} from './StepLinks';
import { type EditorStep, KIND_META } from './StepsEditor';
import type { Person, PlanView, ProjectChoice } from './types';
import { stepCount, stepKind } from './types';

/*
 * The right side of a plan: the picked step in full (its task or goal
 * editable right here), or the plan at a glance when no step is picked.
 */

const Glance = ({
  plan,
  projects,
  people,
}: {
  plan: PlanView;
  projects: ProjectChoice[];
  people: Person[];
}) => {
  const byProject = new Map<string, number>();
  const byPerson = new Map<string, number>();
  for (const s of plan.steps) {
    if (stepKind(s) === 'info') continue;
    byProject.set(
      s.projectId ?? '',
      (byProject.get(s.projectId ?? '') ?? 0) + 1,
    );
    for (const id of s.assigneeIds)
      byPerson.set(id, (byPerson.get(id) ?? 0) + 1);
  }
  const count = stepCount(plan);
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          At a glance
        </p>
        <p className="mt-2 text-sm text-neutral-300">
          {count.total
            ? `${count.done} of ${count.total} steps done`
            : 'No steps yet. Type / in a step to pick what it is: text, a task or a goal.'}
        </p>
        {count.total > 0 && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${(count.done / count.total) * 100}%` }}
            />
          </div>
        )}
      </div>
      {byProject.size > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Projects
          </p>
          <div className="flex flex-col gap-1.5">
            {Array.from(byProject.entries()).map(([id, n]) => {
              const project = projects.find((p) => p.id === id);
              return (
                <div
                  key={id || 'none'}
                  className="flex items-center gap-2 text-sm text-neutral-300"
                >
                  <ProjectDot project={project} />
                  <span className="flex-1 truncate">
                    {project?.name ?? 'No project yet'}
                  </span>
                  <span className="text-xs text-neutral-500">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {byPerson.size > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            People
          </p>
          <div className="flex flex-col gap-1.5">
            {Array.from(byPerson.entries()).map(([id, n]) => {
              const person = people.find((p) => p.id === id);
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 text-sm text-neutral-300"
                >
                  <UserAvatar
                    src={person?.avatar}
                    name={person?.name}
                    size={22}
                  />
                  <span className="flex-1 truncate">
                    {person?.name ?? 'Someone'}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {n} {n === 1 ? 'step' : 'steps'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <p className="text-xs text-neutral-600">
        Pick a step to see it in full here: its task or goal can be changed
        right on this side.
      </p>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                              A step's task                                 */
/* -------------------------------------------------------------------------- */

const TaskBox = ({
  step,
  people,
  canEdit,
  onSaved,
  onAddNote,
}: {
  step: EditorStep;
  people: Person[];
  canEdit: boolean;
  onSaved: () => Promise<void>;
  onAddNote: (text: string) => Promise<boolean>;
}) => {
  const task = step.task!;
  const [draft, setDraft] = useState({
    title: task.title ?? step.text,
    status: task.status,
    assigneeIds: task.assigneeIds ?? [],
    dueDate: task.dueDate ?? '',
    description: task.description ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  useEffect(() => {
    setDraft({
      title: task.title ?? step.text,
      status: task.status,
      assigneeIds: task.assigneeIds ?? [],
      dueDate: task.dueDate ?? '',
      description: task.description ?? '',
    });
  }, [task, step.text]);

  const dirty =
    draft.title !== (task.title ?? step.text) ||
    draft.status !== task.status ||
    draft.dueDate !== (task.dueDate ?? '') ||
    draft.description !== (task.description ?? '') ||
    draft.assigneeIds.join() !== (task.assigneeIds ?? []).join();

  const save = async () => {
    if (!draft.title.trim()) return toast.error('Give the task a title.');
    setSaving(true);
    try {
      await PortalSdk.patchData(`/api/tasks/${task.id}`, {
        title: draft.title.trim(),
        status: draft.status,
        assigneeIds: draft.assigneeIds,
        dueDate: draft.dueDate || null,
        description: draft.description || null,
      });
      toast.success('Task saved');
      await onSaved();
    } catch (err) {
      toast.error(errorText(err, 'Could not save the task.'));
    } finally {
      setSaving(false);
    }
  };

  const send = async () => {
    if (!note.trim()) return;
    setSending(true);
    if (await onAddNote(note.trim())) setNote('');
    setSending(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="Task">
        <TextInput
          value={draft.title}
          disabled={!canEdit}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        />
      </Field>
      <Field label="Details">
        <TextArea
          value={draft.description}
          disabled={!canEdit}
          onChange={(e) =>
            setDraft((d) => ({ ...d, description: e.target.value }))
          }
          placeholder="What it takes, links, anything that helps"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <NativeSelect
            value={draft.status}
            disabled={!canEdit}
            onChange={(e) =>
              setDraft((d) => ({ ...d, status: e.target.value }))
            }
          >
            {Object.values(TASK_STATUS)
              .filter((s) => s !== TASK_STATUS.ARCHIVED)
              .map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS_META[s]?.label ?? s}
                </option>
              ))}
          </NativeSelect>
        </Field>
        <Field label="Due">
          <DateInput
            value={draft.dueDate}
            disabled={!canEdit}
            onChange={(e) =>
              setDraft((d) => ({ ...d, dueDate: e.target.value }))
            }
          />
        </Field>
      </div>
      <Field label="Who">
        {canEdit ? (
          <PeoplePicker
            users={people as unknown as User[]}
            value={draft.assigneeIds}
            onChange={(assigneeIds) => setDraft((d) => ({ ...d, assigneeIds }))}
          />
        ) : (
          <AvatarStack
            users={
              draft.assigneeIds
                .map((id) => people.find((p) => p.id === id))
                .filter(Boolean) as unknown as User[]
            }
          />
        )}
      </Field>
      {canEdit && (
        <AdminButton
          tone="primary"
          size="sm"
          icon="save"
          loading={saving}
          disabled={!dirty}
          onClick={save}
        >
          Save the task
        </AdminButton>
      )}
      {canEdit && (
        <Field label="Add a note">
          <div className="flex flex-col gap-2">
            <TextArea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="What happened, for the task's history (Ctrl+Enter)"
            />
            <AdminButton
              size="sm"
              tone="ghost"
              icon="add_comment"
              loading={sending}
              disabled={!note.trim()}
              onClick={send}
            >
              Add to the task
            </AdminButton>
          </div>
        </Field>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                              A step's goal                                 */
/* -------------------------------------------------------------------------- */

const GoalBox = ({
  plan,
  step,
  projects,
  people,
  canEdit,
  onChange,
  onSaved,
}: {
  plan: PlanView;
  step: EditorStep;
  projects: ProjectChoice[];
  people: Person[];
  canEdit: boolean;
  onChange: (fields: Partial<EditorStep>) => void;
  onSaved: () => Promise<void>;
}) => {
  const existing = step.goalId
    ? projects
        .find((p) => p.id === step.projectId)
        ?.goals.find((g) => g.id === step.goalId)
    : undefined;
  const fresh = (): GoalDraft =>
    existing
      ? { ...existing }
      : {
          ...newGoalDraft(step.draftGoal ?? 'scheduled'),
          title: step.text.trim(),
        };
  const [draft, setDraft] = useState<GoalDraft>(fresh);
  const [projectId, setProjectId] = useState(
    step.projectId ?? projects[0]?.id ?? '',
  );
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setDraft(fresh());
    setProjectId(step.projectId ?? projects[0]?.id ?? '');
    // A different step, or the goal saved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id, step.goalId, existing]);

  const save = async () => {
    if (!draft.title.trim()) return toast.error('Name the goal.');
    if (!projectId) return toast.error('Pick its project.');
    setSaving(true);
    try {
      if (existing) {
        await PortalSdk.patchData(
          `/api/projects/${projectId}/goals/${existing.id}`,
          { goal: goalForSave(draft) },
        );
        toast.success('Goal saved');
      } else {
        const res = await PortalSdk.postData(
          `/api/projects/${projectId}/goals`,
          { goal: { ...goalForSave(draft), planId: plan.id } },
        );
        const goal = res?.data?.goal;
        if (!goal?.id) throw new Error('The goal was not saved.');
        onChange({
          kind: 'goal',
          goalId: goal.id,
          projectId,
          text: goal.title,
          draftGoal: undefined,
        });
        toast.success(
          goal.kind === 'target'
            ? 'Goal set'
            : 'Repeating goal set: it makes its own tasks',
        );
      }
      await onSaved();
    } catch (err) {
      toast.error(errorText(err, 'Could not save the goal.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {step.goal && (
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs text-neutral-300">
          <GoalStar met={step.goal.met} />
          <span className="flex-1">{goalLine(step.goal)}</span>
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.08]">
            <span
              className="block h-full rounded-full bg-amber-300"
              style={{ width: `${step.goal.percent}%` }}
            />
          </span>
        </div>
      )}
      <Field label="Project">
        <NativeSelect
          value={projectId}
          disabled={!canEdit || !!existing}
          onChange={(e) => setProjectId(e.target.value)}
        >
          {!projectId && <option value="">Pick a project</option>}
          <ProjectOptions projects={projects} />
        </NativeSelect>
      </Field>
      {existing === undefined && step.goalId ? (
        <p className="text-xs text-neutral-500">
          This goal is no longer on its project.
        </p>
      ) : (
        <GoalFields
          goal={draft}
          users={people as unknown as User[]}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        />
      )}
      {canEdit && (
        <AdminButton
          tone="primary"
          size="sm"
          icon={existing ? 'save' : 'star'}
          loading={saving}
          onClick={save}
        >
          {existing ? 'Save the goal' : 'Set up the goal'}
        </AdminButton>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                 The panel                                  */
/* -------------------------------------------------------------------------- */

export const StepPanel = ({
  plan,
  step,
  projects,
  stepProjects,
  people,
  canEdit,
  canMakeTask = true,
  makingTask,
  onChange,
  onRemove,
  onMakeTask,
  onAddNote,
  onRefresh,
  onClose,
}: {
  plan: PlanView;
  step: EditorStep | null;
  projects: ProjectChoice[];
  /** The projects the step can name; all of `projects` for a grand plan. */
  stepProjects?: ProjectChoice[];
  people: Person[];
  canEdit: boolean;
  /** Whether they can add tasks in the step's project. */
  canMakeTask?: boolean;
  makingTask: boolean;
  onChange: (fields: Partial<EditorStep>) => void;
  onRemove: () => void;
  onMakeTask: () => void;
  onAddNote: (text: string) => Promise<boolean>;
  /** Loads the plans again, after a task or goal changed. */
  onRefresh: () => Promise<void>;
  onClose: () => void;
}) => {
  const canName = stepProjects ?? projects;
  const [linkQuery, setLinkQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const taken = useMemo(
    () =>
      new Set(
        plan.steps.flatMap((s) => [s.taskId, s.goalId]).filter(Boolean),
      ) as Set<string>,
    [plan.steps],
  );
  const links = useStepLinks({
    enabled: canEdit && linkQuery !== null,
    companyId: plan.companyId,
    rootId: plan.projectId,
    projects: canName,
    query: linkQuery ?? '',
    taken,
  });
  useEffect(() => {
    setLinkQuery(null);
    setActive(0);
  }, [step?.id]);
  const pickLink = (link: StepLink) => {
    onChange(linkFields(link));
    setLinkQuery(null);
  };

  if (!step) return <Glance plan={plan} projects={projects} people={people} />;

  const kind = stepKind(step);
  const linked = !!(step.taskId || step.goalId);
  /** Back to a plain step; the task or goal stays where it is. */
  const unlink = () =>
    onChange({
      kind: kind === 'goal' ? 'task' : kind,
      taskId: null,
      goalId: null,
      task: null,
      goal: null,
      text: step.task?.title ?? step.goal?.title ?? step.text,
    });
  const setKind = (next: PlanStepKind) => {
    if (next === kind) return;
    const fields: Partial<EditorStep> = { kind: next };
    if (linked)
      Object.assign(fields, {
        taskId: null,
        goalId: null,
        task: null,
        goal: null,
        text: step.task?.title ?? step.goal?.title ?? step.text,
      });
    if (next === 'goal') fields.draftGoal = 'scheduled';
    onChange(fields);
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-5">
      <div className="flex items-center gap-2">
        <Segmented<PlanStepKind>
          value={kind}
          onChange={(k) => canEdit && setKind(k)}
          options={(Object.keys(KIND_META) as PlanStepKind[]).map((k) => ({
            value: k,
            label: KIND_META[k].label,
          }))}
          className={cn('flex-1', !canEdit && 'pointer-events-none opacity-70')}
        />
        <IconAction icon="close" label="Close" onClick={onClose} />
      </div>

      {/* The step and its details, just below it */}
      <div className="flex flex-col gap-1.5">
        {linked ? (
          <p className="text-base font-medium text-white">
            {step.task?.title ?? step.goal?.title ?? step.text}
          </p>
        ) : (
          <GrowingText
            value={step.text}
            onChange={(text) => onChange({ text })}
            disabled={!canEdit}
            placeholder={KIND_META[kind].hint}
            className="text-base font-medium text-white placeholder:text-neutral-600"
          />
        )}
        <GrowingText
          value={step.notes ?? ''}
          onChange={(notes) => onChange({ notes })}
          disabled={!canEdit}
          placeholder={canEdit ? 'Add details…' : 'No details'}
          className="min-h-[40px] text-sm leading-relaxed text-neutral-300 placeholder:text-neutral-600"
        />
      </div>

      {/* Task steps: the task itself, editable here */}
      {kind === 'task' && step.task && (
        <TaskBox
          step={step}
          people={people}
          canEdit={canEdit}
          onSaved={onRefresh}
          onAddNote={onAddNote}
        />
      )}

      {/* Goal steps: set up or change the goal */}
      {kind === 'goal' && (
        <GoalBox
          plan={plan}
          step={step}
          projects={canName}
          people={people}
          canEdit={canEdit}
          onChange={onChange}
          onSaved={onRefresh}
        />
      )}

      {/* Text and tasks not made yet: the step's own fields */}
      {!linked && kind !== 'goal' && (
        <>
          {kind !== 'info' && (
            <>
              <Field label="Project">
                <NativeSelect
                  value={step.projectId ?? ''}
                  disabled={!canEdit}
                  onChange={(e) =>
                    onChange({ projectId: e.target.value || null })
                  }
                >
                  <option value="">No project yet</option>
                  {step.projectId &&
                    !canName.some((p) => p.id === step.projectId) && (
                      <option value={step.projectId}>
                        {projects.find((p) => p.id === step.projectId)?.name ??
                          'A project'}
                      </option>
                    )}
                  <ProjectOptions projects={canName} />
                </NativeSelect>
              </Field>
              <Field label="By when">
                <DateInput
                  value={step.dueOn ?? ''}
                  disabled={!canEdit}
                  onChange={(e) => onChange({ dueOn: e.target.value || null })}
                />
              </Field>
              <Field label="Who">
                {canEdit ? (
                  <PeoplePicker
                    users={people as unknown as User[]}
                    value={step.assigneeIds}
                    onChange={(assigneeIds) => onChange({ assigneeIds })}
                  />
                ) : (
                  <AvatarStack
                    users={
                      step.assigneeIds
                        .map((id) => people.find((p) => p.id === id))
                        .filter(Boolean) as unknown as User[]
                    }
                  />
                )}
              </Field>
            </>
          )}
          {kind === 'task' && canEdit && (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="mb-2 text-xs text-neutral-400">
                {!step.projectId
                  ? 'Pick a project, then make it a task there with these people and this date.'
                  : canMakeTask
                    ? 'Make it a task in its project, with these people and this date. Ctrl+Enter in the step does the same.'
                    : 'Someone on that project’s team can make it a task.'}
              </p>
              <AdminButton
                size="sm"
                tone="primary"
                icon="add_task"
                loading={makingTask}
                disabled={!canMakeTask || !step.projectId || !step.text.trim()}
                onClick={onMakeTask}
              >
                Create the task
              </AdminButton>
            </div>
          )}
        </>
      )}

      {/* Link instead: an existing task or goal */}
      {canEdit && !linked && kind !== 'info' && (
        <div className="relative">
          {linkQuery === null ? (
            <button
              type="button"
              onClick={() => setLinkQuery('')}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200"
            >
              <Icon name="link" className="text-[15px]" />
              Link an existing task or goal instead
            </button>
          ) : (
            <>
              <input
                autoFocus
                value={linkQuery}
                onChange={(e) => {
                  setLinkQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) =>
                  menuKeys(e, links.items, active, setActive, pickLink, () =>
                    setLinkQuery(null),
                  )
                }
                onBlur={() => setLinkQuery(null)}
                placeholder="Search tasks and goals…"
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
              />
              <LinkMenu
                items={links.items}
                loading={links.loading}
                active={active}
                projects={canName}
                onPick={pickLink}
                onHover={setActive}
                className="absolute inset-x-0 top-full z-20 mt-1"
              />
            </>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-4 pt-2">
        {canEdit && linked && (
          <button
            type="button"
            onClick={unlink}
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-200"
            title="Make it a plain step again; the task or goal stays"
          >
            <Icon name="link_off" className="text-[15px]" />
            Unlink
          </button>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-rose-300"
          >
            <Icon name="delete" className="text-[15px]" />
            Remove step
            {linked && ' (its task or goal stays)'}
          </button>
        )}
      </div>
    </div>
  );
};
