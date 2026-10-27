import type {
  Plan,
  PlanStep,
  ProjectGoal,
  TaskSchedule,
} from '@/models/workspace';

export type Person = {
  id: string;
  name: string;
  email: string | null;
  avatar: string | null;
};

export type ProjectChoice = {
  id: string;
  name: string;
  color: string | null;
  logo: string | null;
  parentId: string | null;
  goals: ProjectGoal[];
};

export type StepView = PlanStep & {
  task?: { id: string; status: string } | null;
};

export type PlanView = Omit<Plan, 'steps'> & {
  steps: StepView[];
  /** Scheduled tasks set up in the plan. */
  schedules: TaskSchedule[];
};

export type PlansData = {
  plans: PlanView[];
  projects: ProjectChoice[];
  people: Person[];
  can: {
    create: boolean;
    editAll: boolean;
    deleteAll: boolean;
    /** Add tasks in every project of the company. */
    createTasks: boolean;
    /** Projects they lead or are on. */
    teamProjectIds: string[];
  };
};

/** Steps done out of all steps. */
export const stepCount = (plan: PlanView) => ({
  done: plan.steps.filter((s) => s.done).length,
  total: plan.steps.length,
});

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
