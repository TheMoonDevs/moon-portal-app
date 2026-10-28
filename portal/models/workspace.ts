import type { BrandKit } from '../lib/brandKit';
import {
  type BaseModel,
  createCrudSchemas,
  type DateValue,
  type JsonObject,
  type Loose,
  type Nullable,
} from './shared/base';

/*
 * Multi-company workspace: Company → Projects → Tasks.
 *
 * References between these collections (companyId, userId, …) are stored as
 * plain strings, so none of them are registered as ObjectId fields.
 */

export enum COMPANY_STATUS {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum MEMBER_STATUS {
  ACTIVE = 'ACTIVE',
  REMOVED = 'REMOVED',
}

export enum PROJECT_STATUS {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

/** How much work a project takes to keep going. */
export enum PROJECT_EFFORT {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum TASK_STATUS {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
  /** Decided not to do it. */
  IGNORED = 'IGNORED',
  /** Put away; no longer counts anywhere. */
  ARCHIVED = 'ARCHIVED',
}

/** Statuses that still need someone to act. */
export const OPEN_TASK_STATUSES = [
  TASK_STATUS.TODO,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.IN_REVIEW,
];

export type GoalPeriod = 'day' | 'week' | 'month';

/**
 * - `scheduled`: a target every day, week or month ("2 releases a week").
 *   It makes its own dated tasks, and each period is met or missed.
 * - `target`: one number to reach ("100 subscribers"). Progress adds up
 *   from when it was set; reaching it makes it an achievement.
 */
export type GoalKind = 'scheduled' | 'target';

/**
 * A goal of a project. Progress is the done tasks linked to it (plus any
 * added by hand): in the current period for a scheduled goal, or all
 * together since it was set for a target goal.
 * `parts` splits a scheduled target, e.g. 9 shorts as 3 + 3 + 3 across
 * channels.
 */
export type ProjectGoal = {
  id: string;
  title: string;
  /** Scheduled when left out (goals from before there were kinds). */
  kind?: GoalKind;
  /** Per period for a scheduled goal; the number to reach for a target. */
  target: number;
  period: GoalPeriod;
  /** The day the goal was set, YYYY-MM-DD; earlier work does not count. */
  since?: string;
  parts?: { id: string; label: string; target: number }[];
  /**
   * Scheduled goals: the weekdays (0 Sunday to 6) its tasks are for, in a
   * weekly goal, e.g. [5] for "for Fri". Empty: one batch on Monday.
   */
  days?: number[];
  /** Scheduled monthly goals: the day of the month, 1 to 28. */
  monthDay?: number | null;
  /** Scheduled goals make their tasks unless this is false. */
  makeTasks?: boolean;
  /** Who it is for; empty for the whole project team. */
  assigneeIds?: string[];
  /** Target goals: when the target was first reached. */
  achievedAt?: string | null;
  /** Target goals: the one it raised the bar on, e.g. 100 before 1000. */
  previousId?: string | null;
  /** The plan it was set up in, if any; its tasks link to that plan. */
  planId?: string | null;
};

export enum TASK_SIZE {
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
}

export type Company = Loose<
  BaseModel & {
    name: string;
    slug: string;
    description?: Nullable<string>;
    logo?: Nullable<string>;
    color?: Nullable<string>;
    /** Logos, colors, fonts, guide and other brand files. */
    brandKit?: Nullable<BrandKit>;
    status: COMPANY_STATUS;
    createdById: string;
  }
>;

/** A named set of permissions inside one company (Owner, Manager, …). */
export type CompanyRole = Loose<
  BaseModel & {
    companyId: string;
    key: string;
    name: string;
    description?: Nullable<string>;
    permissions: string[];
    /** Seeded with the company; can be edited but not deleted. */
    isSystem?: boolean;
  }
>;

export type CompanyMember = Loose<
  BaseModel & {
    companyId: string;
    userId: string;
    roleKeys: string[];
    title?: Nullable<string>;
    status: MEMBER_STATUS;
    joinedAt?: DateValue;
  }
>;

export type Project = Loose<
  BaseModel & {
    companyId: string;
    name: string;
    slug: string;
    description?: Nullable<string>;
    status: PROJECT_STATUS;
    color?: Nullable<string>;
    icon?: Nullable<string>;
    logo?: Nullable<string>;
    brandKit?: Nullable<BrandKit>;
    goals?: ProjectGoal[];
    effort?: Nullable<PROJECT_EFFORT>;
    /** The project this one belongs under, in the same company. */
    parentId?: Nullable<string>;
    /** The company's CORE project, made with the company. One per company. */
    isCore?: boolean;
    leadIds: string[];
    memberIds: string[];
    createdById: string;
  }
>;

export enum PROJECT_REQUEST_STATUS {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  /** The person who asked took it back. */
  WITHDRAWN = 'WITHDRAWN',
}

/**
 * A project someone asked for but may not create themselves. Approving it
 * creates the project, with the person who asked as its lead.
 */
export type ProjectRequest = Loose<
  BaseModel & {
    companyId: string;
    name: string;
    description?: Nullable<string>;
    color?: Nullable<string>;
    effort?: Nullable<PROJECT_EFFORT>;
    /** The project it would sit under. */
    parentId?: Nullable<string>;
    /** Why it is needed, for whoever approves it. */
    note?: Nullable<string>;
    status: PROJECT_REQUEST_STATUS;
    requestedById: string;
    reviewedById?: Nullable<string>;
    reviewedAt?: Nullable<DateValue>;
    /** Shown to the person who asked, e.g. why it was declined. */
    reviewNote?: Nullable<string>;
    /** The project made when it was approved. */
    projectId?: Nullable<string>;
  }
>;

export type Task = Loose<
  BaseModel & {
    companyId: string;
    projectId: string;
    title: string;
    description?: Nullable<string>;
    size: TASK_SIZE;
    status: TASK_STATUS;
    /** Everyone on the task; each gets its points when it is done. */
    assigneeIds: string[];
    dueDate?: Nullable<string>;
    /**
     * The day the task is scheduled for, YYYY-MM-DD. Goals count it in that
     * day's period even when it is done early; its points still go to the
     * day it was done.
     */
    forDate?: Nullable<string>;
    completedAt?: Nullable<DateValue>;
    /**
     * Who finished it; their work moves its goal. Older tasks have none,
     * and their assignees count instead.
     */
    completedByIds?: string[];
    /** The project goal this task counts towards. */
    goalId?: Nullable<string>;
    goalPartId?: Nullable<string>;
    /** Set when a schedule created the task. */
    scheduleId?: Nullable<string>;
    /** Set when the task was made from a step of a plan. */
    planId?: Nullable<string>;
    /** The worklog line this task was made from; it follows that line. */
    fromLine?: Nullable<string>;
    /** Its goal was set by hand or already looked for; not picked again. */
    goalChecked?: boolean;
    createdById: string;
  }
>;

export type ScheduleEvery = 'day' | 'week' | 'month';

/** Creates the same task(s) on a repeating schedule. */
export type TaskSchedule = Loose<
  BaseModel & {
    companyId: string;
    projectId: string;
    title: string;
    description?: Nullable<string>;
    size: TASK_SIZE;
    assigneeIds: string[];
    goalId?: Nullable<string>;
    goalPartId?: Nullable<string>;
    every: ScheduleEvery;
    /** For weekly schedules: 0 (Sunday) to 6. */
    weekdays?: number[];
    /** For monthly schedules: 1 to 28. */
    monthDay?: Nullable<number>;
    /** How many tasks each run creates (e.g. 3 shorts). */
    count: number;
    /** Days after the run date that each task is due; empty for none. */
    dueInDays?: Nullable<number>;
    active: boolean;
    /** Next run date, YYYY-MM-DD. */
    nextRunOn: string;
    lastRunOn?: Nullable<string>;
    /** The plan it was set up in; its tasks are linked to that plan. */
    planId?: Nullable<string>;
    /**
     * Run by its goal: the goal sets its days, count and people. Every
     * schedule is one now; older ones were moved into goals.
     */
    fromGoal?: boolean;
    /** When an older schedule was moved into a goal. */
    migratedAt?: Nullable<string>;
    createdById: string;
  }
>;

/** One reading of a project's results, e.g. subscribers on a date. */
export type ProjectResult = Loose<
  BaseModel & {
    companyId: string;
    projectId: string;
    /** earnings, subscribers, views, followers, streams or a custom name. */
    metric: string;
    value: number;
    /** YYYY-MM-DD */
    date: string;
    note?: Nullable<string>;
    createdById: string;
  }
>;

export enum PLAN_STATUS {
  /** Just an idea, nothing decided yet. */
  IDEA = 'IDEA',
  /** Decided; the steps are being done. */
  ACTIVE = 'ACTIVE',
  DONE = 'DONE',
  DROPPED = 'DROPPED',
}

/**
 * One step of a plan: what, for which project (optional), by whom and by
 * when. A step with a project can be made into a task; it then follows the
 * task's status.
 */
export type PlanStep = {
  id: string;
  text: string;
  notes?: Nullable<string>;
  projectId?: Nullable<string>;
  assigneeIds: string[];
  /** YYYY-MM-DD */
  dueOn?: Nullable<string>;
  done?: boolean;
  taskId?: Nullable<string>;
};

/**
 * A plan in a company: mostly ideas at first. It needs no project; steps
 * can name projects across the company as the plan firms up.
 */
export type Plan = Loose<
  BaseModel & {
    companyId: string;
    title: string;
    notes?: Nullable<string>;
    status: PLAN_STATUS;
    /** YYYY-MM-DD */
    startOn?: Nullable<string>;
    /** YYYY-MM-DD: when it should be done by. */
    endOn?: Nullable<string>;
    ownerId: string;
    memberIds: string[];
    steps: PlanStep[];
    createdById: string;
  }
>;

export enum PROJECT_PAGE_KIND {
  /** The project's one objective: why it exists and what done looks like. */
  OBJECTIVE = 'OBJECTIVE',
  /**
   * One of the project's pages. Stored as IDEA from when pages were called
   * ideas.
   */
  IDEA = 'IDEA',
}

/**
 * A rich-text page of a project (its objective or one of its pages). `content`
 * is the editor's document (Tiptap JSON). Pages nest: `parentId` is the page
 * it sits inside, or empty at the top.
 */
export type ProjectPage = Loose<
  BaseModel & {
    companyId: string;
    projectId: string;
    kind: PROJECT_PAGE_KIND;
    title: string;
    emoji?: Nullable<string>;
    content?: Nullable<JsonObject>;
    parentId?: Nullable<string>;
    createdById: string;
    updatedById?: Nullable<string>;
  }
>;

/**
 * Goal progress added by hand, for work no task tracks (followers gained,
 * reels posted elsewhere): one row per goal (or part) and period.
 */
export type GoalTally = Loose<
  BaseModel & {
    companyId: string;
    projectId: string;
    goalId: string;
    goalPartId?: Nullable<string>;
    /** First day of the period it counts in, YYYY-MM-DD. */
    from: string;
    amount: number;
    updatedById: string;
  }
>;

export const companySchemas = createCrudSchemas<Company>();
export const companyRoleSchemas = createCrudSchemas<CompanyRole>();
export const companyMemberSchemas = createCrudSchemas<CompanyMember>();
export const projectSchemas = createCrudSchemas<Project>();
export const projectRequestSchemas = createCrudSchemas<ProjectRequest>();
export const taskSchemas = createCrudSchemas<Task>();
export const taskScheduleSchemas = createCrudSchemas<TaskSchedule>();
export const projectResultSchemas = createCrudSchemas<ProjectResult>();
export const planSchemas = createCrudSchemas<Plan>();
export const projectPageSchemas = createCrudSchemas<ProjectPage>();
export const goalTallySchemas = createCrudSchemas<GoalTally>();
