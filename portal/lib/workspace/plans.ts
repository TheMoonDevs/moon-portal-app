import type { PlanStep } from '@/models/workspace';
import { PLAN_STATUS } from '@/models/workspace';

/*
 * Plans: ideas in a company that firm up into steps (what, for which
 * project, by whom, by when). Shared by the API, the Plans page and the
 * MCP tools; nothing here touches the database.
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

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const shortId = () => Math.random().toString(36).slice(2, 10);

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

/** A YYYY-MM-DD day or null. */
export const planDay = (value: unknown) =>
  typeof value === 'string' && DAY.test(value) ? value : null;

/**
 * Keeps well-formed steps. Projects and people must belong to the plan's
 * company; a step keeps the task it was made into, which the input cannot
 * set or change.
 */
export function sanitizeSteps(
  input: unknown,
  previous: PlanStep[],
  projectIds: Set<string>,
  peopleIds: Set<string>,
): PlanStep[] {
  if (!Array.isArray(input)) return previous;
  return input
    .slice(0, 100)
    .map((s): PlanStep | null => {
      const stepText = text(s?.text, 300);
      if (!stepText) return null;
      const id =
        typeof s.id === 'string' && s.id ? s.id.slice(0, 20) : shortId();
      const before = previous.find((p) => p.id === id);
      return {
        id,
        text: stepText,
        notes: text(s.notes, 4000) || null,
        projectId:
          typeof s.projectId === 'string' && projectIds.has(s.projectId)
            ? s.projectId
            : null,
        assigneeIds: Array.isArray(s.assigneeIds)
          ? Array.from(
              new Set(
                s.assigneeIds.filter(
                  (x: unknown) => typeof x === 'string' && peopleIds.has(x),
                ),
              ),
            )
          : [],
        dueOn: planDay(s.dueOn),
        done: s.done === true,
        taskId: before?.taskId ?? null,
      };
    })
    .filter((s): s is PlanStep => !!s);
}

/** A new, empty step. */
export const newStep = (fields: Partial<PlanStep> = {}): PlanStep => ({
  id: shortId(),
  text: '',
  notes: null,
  projectId: null,
  assigneeIds: [],
  dueOn: null,
  done: false,
  taskId: null,
  ...fields,
});
