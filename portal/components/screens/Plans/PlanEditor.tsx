'use client';

import type { User } from '@db/client';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import {
  newStep,
  PLAN_STATUS_META,
  projectFamily,
} from '@/lib/workspace/plans';
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
import {
  linkFields,
  LinkMenu,
  menuKeys,
  type StepLink,
  useStepLinks,
} from './StepLinks';
import type { Person, PlanView, ProjectChoice, StepView } from './types';
import { isPast, shortDay, stepCount, stepKind } from './types';

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

/** Projects as a tree: each under its parent, with its depth. */
const projectTree = (projects: ProjectChoice[]) => {
  const ids = new Set(projects.map((p) => p.id));
  const out: { project: ProjectChoice; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) =>
    projects
      .filter((p) =>
        parentId
          ? p.parentId === parentId
          : !p.parentId || !ids.has(p.parentId),
      )
      .forEach((p) => {
        out.push({ project: p, depth });
        walk(p.id, depth + 1);
      });
  walk(null, 0);
  return out;
};

/** Options for a project select, sub-projects indented under theirs. */
const ProjectOptions = ({
  projects,
  disabled,
}: {
  projects: ProjectChoice[];
  disabled?: (p: ProjectChoice) => boolean;
}) => (
  <>
    {projectTree(projects).map(({ project, depth }) => (
      <option
        key={project.id}
        value={project.id}
        disabled={disabled?.(project)}
      >
        {`${'\u00a0\u00a0'.repeat(depth)}${depth ? '└ ' : ''}${project.name}`}
      </option>
    ))}
  </>
);

const findProject = (projects: ProjectChoice[], id: string) =>
  projects.find((p) => p.id === id);

/** A goal step's star and where the goal stands. */
const GoalStar = ({ met }: { met: boolean }) => (
  <Icon
    name="star"
    filled={met}
    className={cn('text-[18px]', met ? 'text-amber-300' : 'text-neutral-600')}
  />
);

const goalLine = (goal: NonNullable<StepView['goal']>) =>
  `${goal.done.toLocaleString()}/${goal.target.toLocaleString()}${
    goal.kind === 'scheduled' ? ` this ${goal.period}` : ''
  }`;

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
  extra,
  newStepProjectId,
  stepProjects,
  companyName,
  lockLink,
}: {
  plan: PlanView;
  /** The plan's company's projects. */
  projects: ProjectChoice[];
  /** The projects its steps can name; all of `projects` for a grand plan. */
  stepProjects?: ProjectChoice[];
  /** Shown when plans of several companies are listed together. */
  companyName?: string;
  /** Keep the project link as it is, e.g. on that project's page. */
  lockLink?: boolean;
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
  /** Shown under the steps, e.g. the plan's scheduled tasks. */
  extra?: ReactNode;
  /** The project new steps are for, e.g. on that project's page. */
  newStepProjectId?: string;
}) => {
  const [adding, setAdding] = useState('');
  const [active, setActive] = useState(0);
  const [byProject, setByProject] = useState(false);
  const canName = stepProjects ?? projects;
  // "/" at the start of the step box searches tasks and goals to link.
  const linking = adding.startsWith('/');
  const taken = useMemo(
    () =>
      new Set(
        plan.steps.flatMap((s) => [s.taskId, s.goalId]).filter(Boolean),
      ) as Set<string>,
    [plan.steps],
  );
  const links = useStepLinks({
    enabled: canEdit && linking,
    companyId: plan.companyId,
    rootId: plan.projectId,
    projects: canName,
    query: adding.slice(1),
    taken,
  });
  useEffect(() => setActive(0), [adding]);
  const linkedProject = plan.projectId
    ? findProject(projects, plan.projectId)
    : undefined;
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
    if (!text || linking) return;
    onChange((p) => ({
      ...p,
      steps: [
        ...p.steps,
        newStep({
          text,
          projectId: newStepProjectId ?? p.projectId ?? null,
        }),
      ],
    }));
    setAdding('');
  };

  const addLink = (link: StepLink) => {
    onChange((p) => ({
      ...p,
      steps: [...p.steps, { ...newStep(), ...linkFields(link) }],
    }));
    setAdding('');
  };

  // A project plan's link can move only to a project that holds all its
  // steps' projects.
  const stepProjectIds = Array.from(
    new Set(plan.steps.map((s) => s.projectId).filter(Boolean)),
  ) as string[];
  const cannotLinkTo = (p: ProjectChoice) => {
    const family = projectFamily(projects, p.id);
    return stepProjectIds.some((id) => !family.has(id));
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
          {companyName && (
            <span className="hidden items-center gap-1 truncate text-xs text-neutral-500 sm:flex">
              <Icon name="domain" className="text-[14px]" />
              {companyName}
            </span>
          )}
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
          <label
            className="flex items-center gap-1.5"
            title={
              plan.projectId
                ? 'A project plan: its steps stay in this project and the ones under it.'
                : 'A grand plan: its steps can be for any of the company’s projects.'
            }
          >
            <Icon
              name={plan.projectId ? 'link' : 'hub'}
              className="text-[15px] text-neutral-500"
            />
            <span className="text-neutral-500">
              {plan.projectId ? 'Project plan' : 'Grand plan'}
            </span>
            <select
              value={plan.projectId ?? ''}
              disabled={!canEdit || lockLink}
              onChange={(e) => set('projectId', e.target.value || null)}
              className="max-w-[200px] cursor-pointer truncate bg-transparent font-medium text-neutral-200 focus:outline-none disabled:cursor-default [&>option]:bg-neutral-900"
            >
              <option value="">Any project</option>
              {plan.projectId && !linkedProject && (
                <option value={plan.projectId}>A project</option>
              )}
              <ProjectOptions projects={projects} disabled={cannotLinkTo} />
            </select>
          </label>
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
                  const kind = stepKind(step);
                  return (
                    <div
                      key={step.id}
                      onClick={() => onSelectStep(step.id)}
                      className={cn(
                        'group flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors',
                        selected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]',
                      )}
                    >
                      {kind === 'goal' ? (
                        <span
                          className="mt-0.5"
                          title={
                            step.goal?.met
                              ? 'Goal met'
                              : 'Turns gold when the goal is met'
                          }
                        >
                          <GoalStar met={!!step.goal?.met} />
                        </span>
                      ) : (
                        <button
                          type="button"
                          aria-label={step.done ? 'Mark not done' : 'Mark done'}
                          disabled={!canEdit || kind === 'task'}
                          title={
                            kind === 'task'
                              ? 'Done when its task is done'
                              : undefined
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
                      )}
                      <div className="min-w-0 flex-1">
                        {kind === 'text' ? (
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
                        ) : (
                          <p
                            className={cn(
                              'text-sm leading-6',
                              step.done && kind === 'task'
                                ? 'text-neutral-500 line-through'
                                : 'text-neutral-100',
                            )}
                          >
                            {step.task?.title ?? step.goal?.title ?? step.text}
                          </p>
                        )}
                        {(project || step.dueOn || kind !== 'text') && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
                            {kind === 'task' && (
                              <span className="flex items-center gap-1 text-sky-300/80">
                                <Icon name="link" className="text-[12px]" />
                                {step.task
                                  ? (TASK_STATUS_META[step.task.status]
                                      ?.label ?? 'Task')
                                  : 'Task'}
                              </span>
                            )}
                            {kind === 'goal' && (
                              <span className="flex items-center gap-1.5 text-amber-200/80">
                                Goal
                                {step.goal && (
                                  <>
                                    <span className="text-neutral-400">
                                      {goalLine(step.goal)}
                                    </span>
                                    <span className="h-1 w-12 overflow-hidden rounded-full bg-white/[0.08]">
                                      <span
                                        className="block h-full rounded-full bg-amber-300"
                                        style={{
                                          width: `${step.goal.percent}%`,
                                        }}
                                      />
                                    </span>
                                  </>
                                )}
                              </span>
                            )}
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
          <div className="relative mt-1">
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
              <Icon
                name={linking ? 'link' : 'add'}
                className="text-[18px] text-neutral-600"
              />
              <input
                value={adding}
                onChange={(e) => setAdding(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    linking &&
                    menuKeys(e, links.items, active, setActive, addLink, () =>
                      setAdding(''),
                    )
                  )
                    return;
                  if (e.key === 'Enter') addStep();
                }}
                onBlur={() => (linking ? setAdding('') : addStep())}
                placeholder="Add a step, or type / to link a task or goal"
                className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
              />
            </div>
            {linking && (
              <LinkMenu
                items={links.items}
                loading={links.loading}
                active={active}
                projects={canName}
                onPick={addLink}
                onHover={setActive}
                className="absolute inset-x-0 top-full z-20 mt-1"
              />
            )}
          </div>
        )}
        {extra}
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
  canMakeTask = true,
  makingTask,
  onChange,
  onRemove,
  onMakeTask,
  onClose,
  stepProjects,
}: {
  plan: PlanView;
  step: StepView | null;
  projects: ProjectChoice[];
  /** The projects the step can name; all of `projects` for a grand plan. */
  stepProjects?: ProjectChoice[];
  people: Person[];
  canEdit: boolean;
  /** Whether they can add tasks in the step's project. */
  canMakeTask?: boolean;
  makingTask: boolean;
  onChange: (fields: Partial<StepView>) => void;
  onRemove: () => void;
  onMakeTask: () => void;
  onClose: () => void;
}) => {
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const personById = new Map(people.map((p) => [p.id, p]));
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
    // The step keeps its notes, people and date.
    onChange(linkFields(link));
    setLinkQuery(null);
  };

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
          Pick a step to give it a project, people and a date, or to link it to
          a task or goal.
        </p>
      </div>
    );
  }

  const project = step.projectId ? projectById.get(step.projectId) : undefined;
  const kind = stepKind(step);
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-5">
      <div className="flex items-start gap-2">
        {kind === 'text' ? (
          <GrowingText
            value={step.text}
            onChange={(text) => onChange({ text })}
            disabled={!canEdit}
            className="flex-1 text-base font-medium text-white"
          />
        ) : (
          <p className="flex-1 text-base font-medium text-white">
            {step.task?.title ?? step.goal?.title ?? step.text}
          </p>
        )}
        <IconAction icon="close" label="Close" onClick={onClose} />
      </div>

      {/* What the step is: plain text, a linked task or a goal. */}
      {kind === 'text' ? (
        canEdit && (
          <div className="relative">
            {linkQuery === null ? (
              <button
                type="button"
                onClick={() => setLinkQuery('')}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200"
              >
                <Icon name="link" className="text-[15px]" />
                Link a task or goal
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
        )
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs text-neutral-400">
          {kind === 'goal' ? (
            <>
              <GoalStar met={!!step.goal?.met} />
              <span className="flex-1">
                A goal of {project?.name ?? 'a project'}
                {step.goal && (
                  <span className="text-neutral-300">
                    {' '}
                    · {goalLine(step.goal)}
                  </span>
                )}
              </span>
            </>
          ) : (
            <>
              <Icon name="link" className="text-[16px] text-sky-300/80" />
              <span className="flex-1">
                A task in {project?.name ?? 'a project'}
              </span>
              {step.task && (
                <Pill
                  tone={TASK_STATUS_META[step.task.status]?.tone ?? 'neutral'}
                >
                  {TASK_STATUS_META[step.task.status]?.label ??
                    step.task.status}
                </Pill>
              )}
            </>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  taskId: null,
                  goalId: null,
                  task: null,
                  goal: null,
                  text: step.task?.title ?? step.goal?.title ?? step.text,
                  done: !!step.done,
                })
              }
              className="ml-1 text-neutral-500 hover:text-neutral-200"
              title="Make it plain text again; the task or goal stays"
            >
              Unlink
            </button>
          )}
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-neutral-400">Project</span>
        <NativeSelect
          value={step.projectId ?? ''}
          disabled={!canEdit || kind !== 'text' || !!step.task}
          onChange={(e) => onChange({ projectId: e.target.value || null })}
        >
          <option value="">No project yet</option>
          {step.projectId && !canName.some((p) => p.id === step.projectId) && (
            <option value={step.projectId}>
              {projectById.get(step.projectId)?.name ?? 'A project'}
            </option>
          )}
          <ProjectOptions projects={canName} />
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

      {kind === 'text' && (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
          {step.task ? (
            <div className="flex items-center gap-2 text-sm text-neutral-300">
              <Icon name="task_alt" className="text-[18px] text-emerald-400" />
              <span className="flex-1">It is a task in {project?.name}</span>
              <Pill
                tone={TASK_STATUS_META[step.task.status]?.tone ?? 'neutral'}
              >
                {TASK_STATUS_META[step.task.status]?.label ?? step.task.status}
              </Pill>
            </div>
          ) : project ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-neutral-400">
                {canMakeTask
                  ? `Ready to do it? Make it a task in ${project.name}, with these people and this date.`
                  : `Someone on the ${project.name} team can make it a task.`}
              </p>
              {canMakeTask && (
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
              )}
            </div>
          ) : (
            <p className="text-xs text-neutral-500">
              Pick a project when you are ready, and the step can become a task.
            </p>
          )}
        </div>
      )}

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
