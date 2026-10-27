'use client';

import type { User } from '@db/client';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { newStep, PLAN_STATUS_META } from '@/lib/workspace/plans';
import { PLAN_STATUS } from '@/models/workspace';

import {
  AdminButton,
  DateInput,
  Icon,
  IconAction,
  NativeSelect,
  Pill,
  Segmented,
  TextArea,
  UserAvatar,
} from '../Admin/shared/AdminUI';
import {
  AvatarStack,
  PeoplePicker,
  TASK_STATUS_META,
} from '../Admin/Workspace/shared';
import type { Person, PlanView, ProjectChoice, StepView } from './types';
import { isPast, shortDay, stepCount } from './types';

const ProjectDot = ({ project }: { project?: ProjectChoice }) => (
  <span
    className="size-2 shrink-0 rounded-full"
    style={{ backgroundColor: project?.color || '#525252' }}
  />
);

/** A textarea that grows with its text. */
const GrowingText = ({
  value,
  onChange,
  className,
  selectOnMount,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Focus and select the text when it first shows. */
  selectOnMount?: boolean;
  onFocus?: () => void;
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (selectOnMount) ref.current?.select();
    // Only when it first shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'w-full resize-none bg-transparent focus:outline-none disabled:cursor-default',
        className,
      )}
      {...props}
    />
  );
};

/* -------------------------------------------------------------------------- */
/*                                  The plan                                  */
/* -------------------------------------------------------------------------- */

export const PlanEditor = ({
  plan,
  projects,
  people,
  canEdit,
  canDelete,
  selectedStepId,
  onSelectStep,
  onChange,
  onDelete,
  onBack,
  fresh,
}: {
  plan: PlanView;
  projects: ProjectChoice[];
  people: Person[];
  canEdit: boolean;
  canDelete: boolean;
  selectedStepId: string | null;
  onSelectStep: (id: string | null) => void;
  onChange: (change: (plan: PlanView) => PlanView) => void;
  onDelete: () => void;
  onBack?: () => void;
  /** Just created: put the cursor in the title. */
  fresh?: boolean;
}) => {
  const [adding, setAdding] = useState('');
  const [byProject, setByProject] = useState(false);
  const [pickingPeople, setPickingPeople] = useState(false);
  const projectById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );
  const personById = useMemo(
    () => new Map(people.map((p) => [p.id, p])),
    [people],
  );
  const count = stepCount(plan);
  const owner = personById.get(plan.ownerId);
  const members = (plan.memberIds ?? [])
    .map((id) => personById.get(id))
    .filter(Boolean) as Person[];

  const set = <K extends keyof PlanView>(key: K, value: PlanView[K]) =>
    onChange((p) => ({ ...p, [key]: value }));
  const setStep = (id: string, fields: Partial<StepView>) =>
    onChange((p) => ({
      ...p,
      steps: p.steps.map((s) => (s.id === id ? { ...s, ...fields } : s)),
    }));

  const addStep = () => {
    const text = adding.trim();
    if (!text) return;
    onChange((p) => ({ ...p, steps: [...p.steps, newStep({ text })] }));
    setAdding('');
  };

  // Steps in plan order, or grouped under their project.
  const groups = useMemo(() => {
    if (!byProject) return [{ key: 'all', project: null, steps: plan.steps }];
    const keys = Array.from(
      new Set(plan.steps.map((s) => s.projectId ?? '')),
    ).sort((a, b) =>
      !a
        ? 1
        : !b
          ? -1
          : (projectById.get(a)?.name ?? '').localeCompare(
              projectById.get(b)?.name ?? '',
            ),
    );
    return keys.map((key) => ({
      key: key || 'none',
      project: key ? (projectById.get(key) ?? null) : null,
      steps: plan.steps.filter((s) => (s.projectId ?? '') === key),
    }));
  }, [byProject, plan.steps, projectById]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-5 pb-10 pt-4 sm:px-8">
        <div className="mb-3 flex items-center gap-2">
          {onBack && (
            <IconAction icon="arrow_back" label="All plans" onClick={onBack} />
          )}
          <Segmented
            value={plan.status}
            onChange={(status) => canEdit && set('status', status)}
            options={Object.values(PLAN_STATUS).map((s) => ({
              value: s,
              label: PLAN_STATUS_META[s].label,
            }))}
            className={cn(!canEdit && 'pointer-events-none opacity-70')}
          />
          <div className="flex-1" />
          {canDelete && (
            <IconAction
              icon="delete"
              label="Delete plan"
              tone="danger"
              onClick={onDelete}
            />
          )}
        </div>

        <GrowingText
          value={plan.title}
          selectOnMount={fresh}
          onChange={(title) => set('title', title)}
          placeholder="Name the plan"
          disabled={!canEdit}
          className="text-2xl font-semibold leading-tight text-white placeholder:text-neutral-600"
        />

        {/* Who and by when. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-neutral-400">
          <label className="flex items-center gap-1.5">
            <Icon name="person" className="text-[15px] text-neutral-500" />
            <span className="text-neutral-500">Owner</span>
            <select
              value={plan.ownerId}
              disabled={!canEdit}
              onChange={(e) => set('ownerId', e.target.value)}
              className="cursor-pointer bg-transparent font-medium text-neutral-200 focus:outline-none [&>option]:bg-neutral-900"
            >
              {!owner && <option value={plan.ownerId}>Someone</option>}
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <Icon name="flag" className="text-[15px] text-neutral-500" />
            <span className="text-neutral-500">By</span>
            <input
              type="date"
              value={plan.endOn ?? ''}
              disabled={!canEdit}
              onChange={(e) => set('endOn', e.target.value || null)}
              className={cn(
                'bg-transparent font-medium [color-scheme:dark] focus:outline-none',
                plan.endOn ? 'text-neutral-200' : 'text-neutral-500',
                plan.status !== PLAN_STATUS.DONE &&
                  isPast(plan.endOn) &&
                  'text-rose-300',
              )}
            />
          </label>
          <div className="relative flex items-center gap-1.5">
            <Icon name="group" className="text-[15px] text-neutral-500" />
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => setPickingPeople((v) => !v)}
              className="flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-white/[0.05]"
            >
              {members.length ? (
                <AvatarStack users={members as unknown as User[]} max={5} />
              ) : (
                <span className="text-neutral-500">Add people</span>
              )}
            </button>
            {pickingPeople && (
              <div className="absolute left-0 top-8 z-20 w-72 rounded-xl border border-white/10 bg-neutral-900 p-3 shadow-2xl">
                <PeoplePicker
                  users={people as unknown as User[]}
                  value={plan.memberIds ?? []}
                  onChange={(ids) => set('memberIds', ids)}
                />
                <AdminButton
                  size="sm"
                  tone="ghost"
                  className="mt-2 w-full"
                  onClick={() => setPickingPeople(false)}
                >
                  Done
                </AdminButton>
              </div>
            )}
          </div>
          {count.total > 0 && (
            <span className="flex items-center gap-1.5">
              <Icon name="checklist" className="text-[15px] text-neutral-500" />
              {count.done}/{count.total} steps done
            </span>
          )}
        </div>

        <GrowingText
          value={plan.notes ?? ''}
          onChange={(notes) => set('notes', notes)}
          placeholder="Ideas, thoughts, links… a plan can be just this."
          disabled={!canEdit}
          className="mt-5 min-h-[60px] text-sm leading-relaxed text-neutral-300 placeholder:text-neutral-600"
        />

        {/* Steps */}
        <div className="mt-6 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Steps
          </h3>
          {plan.steps.length > 1 && (
            <button
              type="button"
              onClick={() => setByProject((v) => !v)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200"
            >
              <Icon
                name={byProject ? 'view_list' : 'folder_open'}
                className="text-[15px]"
              />
              {byProject ? 'In order' : 'By project'}
            </button>
          )}
        </div>

        <div className="mt-2 flex flex-col gap-3">
          {groups.map((group) => (
            <div key={group.key}>
              {byProject && (
                <p className="mb-1 flex items-center gap-2 px-2 text-xs font-medium text-neutral-400">
                  <ProjectDot project={group.project ?? undefined} />
                  {group.project?.name ?? 'No project yet'}
                </p>
              )}
              <div className="flex flex-col">
                {group.steps.map((step) => {
                  const project = step.projectId
                    ? projectById.get(step.projectId)
                    : undefined;
                  const stepPeople = step.assigneeIds
                    .map((id) => personById.get(id))
                    .filter(Boolean) as Person[];
                  const selected = step.id === selectedStepId;
                  return (
                    <div
                      key={step.id}
                      onClick={() => onSelectStep(step.id)}
                      className={cn(
                        'group flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors',
                        selected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]',
                      )}
                    >
                      <button
                        type="button"
                        aria-label={step.done ? 'Mark not done' : 'Mark done'}
                        disabled={!canEdit || !!step.task}
                        title={
                          step.task ? 'Done when its task is done' : undefined
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          setStep(step.id, { done: !step.done });
                        }}
                        className={cn(
                          'mt-0.5 text-[18px]',
                          step.done
                            ? 'text-emerald-400'
                            : 'text-neutral-600 hover:text-neutral-400',
                        )}
                      >
                        <Icon
                          name={
                            step.done
                              ? 'check_circle'
                              : 'radio_button_unchecked'
                          }
                          filled={step.done}
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <GrowingText
                          value={step.text}
                          onChange={(text) => setStep(step.id, { text })}
                          onFocus={() => onSelectStep(step.id)}
                          disabled={!canEdit}
                          className={cn(
                            'text-sm leading-6',
                            step.done
                              ? 'text-neutral-500 line-through'
                              : 'text-neutral-100',
                          )}
                        />
                        {(project || step.dueOn || step.task) && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
                            {project && !byProject && (
                              <span className="flex items-center gap-1.5">
                                <ProjectDot project={project} />
                                {project.name}
                              </span>
                            )}
                            {step.dueOn && (
                              <span
                                className={cn(
                                  'flex items-center gap-1',
                                  !step.done &&
                                    isPast(step.dueOn) &&
                                    'text-rose-300',
                                )}
                              >
                                <Icon name="event" className="text-[12px]" />
                                {shortDay(step.dueOn)}
                              </span>
                            )}
                            {step.task && (
                              <span className="flex items-center gap-1">
                                <Icon name="task_alt" className="text-[12px]" />
                                {TASK_STATUS_META[step.task.status]?.label ??
                                  'Task'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {stepPeople.length > 0 && (
                        <div className="mt-0.5">
                          <AvatarStack
                            users={stepPeople as unknown as User[]}
                            max={3}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {canEdit && (
          <div className="mt-1 flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <Icon name="add" className="text-[18px] text-neutral-600" />
            <input
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addStep()}
              onBlur={addStep}
              placeholder="Add a step: what needs doing?"
              className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                        One step, or the plan at a glance                   */
/* -------------------------------------------------------------------------- */

export const StepPanel = ({
  plan,
  step,
  projects,
  people,
  canEdit,
  makingTask,
  onChange,
  onRemove,
  onMakeTask,
  onClose,
}: {
  plan: PlanView;
  step: StepView | null;
  projects: ProjectChoice[];
  people: Person[];
  canEdit: boolean;
  makingTask: boolean;
  onChange: (fields: Partial<StepView>) => void;
  onRemove: () => void;
  onMakeTask: () => void;
  onClose: () => void;
}) => {
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const personById = new Map(people.map((p) => [p.id, p]));

  if (!step) {
    // The plan at a glance: which projects and people it involves.
    const byProject = new Map<string, number>();
    const byPerson = new Map<string, number>();
    for (const s of plan.steps) {
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
              : 'No steps yet. Add what needs doing, then who and by when.'}
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
              {Array.from(byProject.entries()).map(([id, n]) => (
                <div
                  key={id || 'none'}
                  className="flex items-center gap-2 text-sm text-neutral-300"
                >
                  <ProjectDot project={projectById.get(id)} />
                  <span className="flex-1 truncate">
                    {projectById.get(id)?.name ?? 'No project yet'}
                  </span>
                  <span className="text-xs text-neutral-500">{n}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {byPerson.size > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              People
            </p>
            <div className="flex flex-col gap-1.5">
              {Array.from(byPerson.entries()).map(([id, n]) => (
                <div
                  key={id}
                  className="flex items-center gap-2 text-sm text-neutral-300"
                >
                  <UserAvatar
                    src={personById.get(id)?.avatar}
                    name={personById.get(id)?.name}
                    size={22}
                  />
                  <span className="flex-1 truncate">
                    {personById.get(id)?.name ?? 'Someone'}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {n} {n === 1 ? 'step' : 'steps'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-xs text-neutral-600">
          Pick a step to give it a project, people and a date.
        </p>
      </div>
    );
  }

  const project = step.projectId ? projectById.get(step.projectId) : undefined;
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-5">
      <div className="flex items-start gap-2">
        <GrowingText
          value={step.text}
          onChange={(text) => onChange({ text })}
          disabled={!canEdit}
          className="flex-1 text-base font-medium text-white"
        />
        <IconAction icon="close" label="Close" onClick={onClose} />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-neutral-400">Project</span>
        <NativeSelect
          value={step.projectId ?? ''}
          disabled={!canEdit || !!step.task}
          onChange={(e) => onChange({ projectId: e.target.value || null })}
        >
          <option value="">No project yet</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-neutral-400">By when</span>
        <DateInput
          value={step.dueOn ?? ''}
          disabled={!canEdit}
          onChange={(e) => onChange({ dueOn: e.target.value || null })}
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-neutral-400">
          Who{' '}
          <span className="font-normal text-neutral-600">
            (several people can share it)
          </span>
        </span>
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
                .map((id) => personById.get(id))
                .filter(Boolean) as unknown as User[]
            }
          />
        )}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-neutral-400">Notes</span>
        <TextArea
          value={step.notes ?? ''}
          disabled={!canEdit}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Anything that helps"
        />
      </label>

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
        {step.task ? (
          <div className="flex items-center gap-2 text-sm text-neutral-300">
            <Icon name="task_alt" className="text-[18px] text-emerald-400" />
            <span className="flex-1">It is a task in {project?.name}</span>
            <Pill tone={TASK_STATUS_META[step.task.status]?.tone ?? 'neutral'}>
              {TASK_STATUS_META[step.task.status]?.label ?? step.task.status}
            </Pill>
          </div>
        ) : project ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-neutral-400">
              Ready to do it? Make it a task in {project.name}, with these
              people and this date.
            </p>
            <AdminButton
              size="sm"
              tone="primary"
              icon="add_task"
              loading={makingTask}
              disabled={!canEdit || !step.text.trim()}
              onClick={onMakeTask}
            >
              Make it a task
            </AdminButton>
          </div>
        ) : (
          <p className="text-xs text-neutral-500">
            Pick a project when you are ready, and the step can become a task.
          </p>
        )}
      </div>

      {canEdit && (
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1.5 self-start text-xs text-neutral-500 hover:text-rose-300"
        >
          <Icon name="delete" className="text-[15px]" />
          Remove step
          {step.task && ' (its task stays)'}
        </button>
      )}
    </div>
  );
};
