import type { PlanStep, PlanStepKind } from '@/models/workspace';
import { PLAN_STATUS } from '@/models/workspace';

/*
 * Plans: ideas in a company that firm up into steps (what, for which
 * project, by whom, by when). A grand plan spans the company's projects; a
 * project plan is linked to one project and stays inside it and its
 * sub-projects. Steps are plain text, tasks or goals. Shared by the API,
 * the Plans page and the MCP tools; nothing here touches the database.
 */

export const PLAN_STATUS_META: Record<
  PLAN_STATUS,
  { label: string; hint: string }
> = {
  [PLAN_STATUS.IDEA]: { label: 'Idea', hint: 'Still thinking it through' },
  [PLAN_STATUS.ACTIVE]: { label: 'Active', hint: 'Decided; work is going' },
  [PLAN_STATUS.DONE]: { label: 'Done', hint: 'Finished' },
  [PLAN_STATUS.DROPPED]: { label: 'Dropped', hint: 'Not doing it' },
};

export const PLAN_STATUSES = Object.values(PLAN_STATUS);

export const STEP_KINDS: PlanStepKind[] = ['info', 'task', 'goal'];

/**
 * A step's kind: as set, else from what it links to. Tasks are the to-dos,
 * so older "todo" steps (and steps with no kind) are tasks.
 */
export const kindOf = (s: {
  kind?: string | null;
  taskId?: string | null;
  goalId?: string | null;
}): PlanStepKind =>
  s.taskId
    ? 'task'
    : s.goalId
      ? 'goal'
      : s.kind === 'info' || s.kind === 'goal'
        ? s.kind
        : 'task';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const shortId = () => Math.random().toString(36).slice(2, 10);

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

/** A YYYY-MM-DD day or null. */
export const planDay = (value: unknown) =>
  typeof value === 'string' && DAY.test(value) ? value : null;

/**
 * The ids of a project and every project under it, at any depth: the
 * projects a plan linked to `rootId` can name.
 */
export function projectFamily(
  projects: { id: string; parentId?: string | null }[],
  rootId: string,
) {
  const family = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of projects)
      if (p.parentId && family.has(p.parentId) && !family.has(p.id)) {
        family.add(p.id);
        grew = true;
      }
  }
  return family;
}

/** What a step's input can point at, checked by the caller. */
export type StepRefs = {
  /** Projects a new pick may name. */
  projectIds: Set<string>;
  /** Every project of the company: a step keeps one it already had. */
  allProjectIds?: Set<string>;
  peopleIds: Set<string>;
  /** Tasks the step may link to, with the project each is in. */
  tasks: Map<string, string>;
  /** Goal ids by project id. */
  goals: Map<string, Set<string>>;
};

/**
 * Keeps well-formed steps. Projects, people, tasks and goals must belong
 * to the plan's company (and, for a project plan, to its project). A step
 * linked to a task takes the task's project; leaving taskId out keeps the
 * stored link, and null drops it (the task stays).
 */
export function sanitizeSteps(
  input: unknown,
  previous: PlanStep[],
  refs: StepRefs,
): PlanStep[] {
  if (!Array.isArray(input)) return previous;
  return input
    .slice(0, 100)
    .map((s): PlanStep | null => {
      // A task or goal step can wait for its words; others need them.
      const stepText =
        text(s?.text, 300) ||
        (s?.kind === 'task' || s?.kind === 'goal' || s?.taskId || s?.goalId
          ? 'Untitled'
          : '');
      if (!stepText) return null;
      const id =
        typeof s.id === 'string' && s.id ? s.id.slice(0, 20) : shortId();
      const before = previous.find((p) => p.id === id);
      let taskId: string | null = before?.taskId ?? null;
      if ('taskId' in s)
        taskId =
          typeof s.taskId === 'string' &&
          (s.taskId === before?.taskId || refs.tasks.has(s.taskId))
            ? s.taskId
            : null;
      let projectId =
        typeof s.projectId === 'string' &&
        (refs.projectIds.has(s.projectId) ||
          (s.projectId === before?.projectId &&
            !!refs.allProjectIds?.has(s.projectId)))
          ? s.projectId
          : null;
      if (taskId && refs.tasks.has(taskId))
        projectId = refs.tasks.get(taskId) ?? projectId;
      const goalId =
        !taskId &&
        projectId &&
        typeof s.goalId === 'string' &&
        refs.goals.get(projectId)?.has(s.goalId)
          ? s.goalId
          : null;
      return {
        id,
        kind: kindOf({ kind: s.kind, taskId, goalId }),
        text: stepText,
        notes: text(s.notes, 4000) || null,
        projectId,
        assigneeIds: Array.isArray(s.assigneeIds)
          ? Array.from(
              new Set(
                s.assigneeIds.filter(
                  (x: unknown) =>
                    typeof x === 'string' && refs.peopleIds.has(x),
                ),
              ),
            )
          : [],
        dueOn: planDay(s.dueOn),
        done: s.done === true,
        taskId,
        goalId,
      };
    })
    .filter((s): s is PlanStep => !!s);
}

/** A new, empty step. */
export const newStep = (fields: Partial<PlanStep> = {}): PlanStep => ({
  id: shortId(),
  kind: 'task',
  text: '',
  notes: null,
  projectId: null,
  assigneeIds: [],
  dueOn: null,
  done: false,
  taskId: null,
  goalId: null,
  ...fields,
});
