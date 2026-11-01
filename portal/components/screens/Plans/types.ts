import { kindOf } from '@/lib/workspace/plans';
import type {
  Plan,
  PlanStep,
  PlanStepKind,
  ProjectGoal,
  TaskSchedule,
} from '@/models/workspace';

export type Person = {
  id: string;
  name: string;
  email: string | null;
  avatar: string | null;
  /** The companies they are in, of the ones loaded. */
  companyIds: string[];
};

export type ProjectChoice = {
  id: string;
  companyId: string;
  name: string;
  color: string | null;
  logo: string | null;
  parentId: string | null;
  goals: ProjectGoal[];
};

export type StepGoal = {
  title: string;
  kind: 'scheduled' | 'target';
  done: number;
  target: number;
  percent: number;
  period: string;
  met: boolean;
};

export type StepTask = {
  id: string;
  status: string;
  title?: string;
  description?: string | null;
  projectId?: string;
  assigneeIds?: string[];
  dueDate?: string | null;
  forDate?: string | null;
  /** When it was finished, for a done task. */
  completedAt?: string | null;
};

export type StepView = PlanStep & {
  task?: StepTask | null;
  goal?: StepGoal | null;
};

/** What a step is: a line of text, a task (the to-dos) or a goal. */
export const stepKind = (s: StepView): PlanStepKind => kindOf(s);

export type PlanView = Omit<Plan, 'steps'> & {
  steps: StepView[];
  /** Scheduled tasks set up in the plan. */
  schedules: TaskSchedule[];
};

export type PlanCan = {
  create: boolean;
  editAll: boolean;
  deleteAll: boolean;
  /** Add tasks in every project of the company. */
  createTasks: boolean;
  /** Projects they lead or are on. */
  teamProjectIds: string[];
};

export type PlansData = {
  /** The companies loaded: one, or every one they can read. */
  companies: { id: string; name: string; color: string | null }[];
  plans: PlanView[];
  /** Projects of every company loaded. */
  projects: ProjectChoice[];
  people: Person[];
  /** What they may do, by company. */
  can: Record<string, PlanCan>;
};

/** Steps done out of the steps there are to do. */
export const stepCount = (plan: PlanView) => {
  // Text steps are notes, not work: they are not counted.
  const work = plan.steps.filter((s) => kindOf(s) !== 'info');
  return { done: work.filter((s) => s.done).length, total: work.length };
};

/** "Nov 3" style day, or the year too when it is not this year. */
export const shortDay = (day?: string | null) => {
  if (!day) return '';
  const d = new Date(`${day}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() !== new Date().getFullYear() && { year: 'numeric' }),
  });
};

/** Whether a day is in the past (before today). */
export const isPast = (day?: string | null) =>
  !!day && day < new Date().toISOString().slice(0, 10);
