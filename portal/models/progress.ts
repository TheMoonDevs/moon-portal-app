import {
  type BaseModel,
  createCrudSchemas,
  type DateValue,
  type Loose,
  type Nullable,
} from './shared/base';

/*
 * Progress: points people earn for their work, and badges unlocked by it.
 *
 * Points are an append-only ledger, so totals for any company, project, person
 * or month are a sum over entries. Badges are rules over those numbers and are
 * awarded on the server, never claimed by the browser.
 */

export enum POINT_SOURCE {
  WORKLOG = 'WORKLOG',
  TASK = 'TASK',
  MANUAL = 'MANUAL',
}

export type PointEntry = Loose<
  BaseModel & {
    userId: string;
    companyId?: Nullable<string>;
    projectId?: Nullable<string>;
    taskId?: Nullable<string>;
    worklogId?: Nullable<string>;
    source: POINT_SOURCE;
    points: number;
    note?: Nullable<string>;
    /** Day the work happened, YYYY-MM-DD. */
    date: string;
    createdById?: Nullable<string>;
  }
>;

export enum BADGE_METRIC {
  /** Total points across all companies. */
  POINTS = 'POINTS',
  /** Longest run of consecutive days with a worklog. */
  WORKLOG_STREAK = 'WORKLOG_STREAK',
  /** Days with a worklog, in total. */
  WORKLOG_DAYS = 'WORKLOG_DAYS',
  /** Tasks assigned to the person that are done. */
  TASKS_DONE = 'TASKS_DONE',
  /** Major tasks assigned to the person that are done. */
  MAJOR_TASKS_DONE = 'MAJOR_TASKS_DONE',
  /** Days since the account was created. */
  DAYS_ON_PORTAL = 'DAYS_ON_PORTAL',
}

/** How each metric reads after its number, e.g. "7 day worklog streak". */
export const METRIC_LABELS: Record<BADGE_METRIC, string> = {
  [BADGE_METRIC.POINTS]: 'points',
  [BADGE_METRIC.WORKLOG_STREAK]: 'day worklog streak',
  [BADGE_METRIC.WORKLOG_DAYS]: 'days logged',
  [BADGE_METRIC.TASKS_DONE]: 'tasks done',
  [BADGE_METRIC.MAJOR_TASKS_DONE]: 'major tasks done',
  [BADGE_METRIC.DAYS_ON_PORTAL]: 'days on the portal',
};

export type Badge = Loose<
  BaseModel & {
    name: string;
    description?: Nullable<string>;
    imageUrl?: Nullable<string>;
    metric: BADGE_METRIC;
    threshold: number;
    isActive: boolean;
    createdById?: Nullable<string>;
  }
>;

export type UserBadge = Loose<
  BaseModel & {
    userId: string;
    badgeId: string;
    earnedAt: DateValue;
  }
>;

export const pointEntrySchemas = createCrudSchemas<PointEntry>();
export const badgeSchemas = createCrudSchemas<Badge>();
export const userBadgeSchemas = createCrudSchemas<UserBadge>();
