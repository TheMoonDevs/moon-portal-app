/*
 * The user page: one person's work, plans, tasks, calendar and meetings.
 * Shapes shared by its API routes and screens; nothing here touches the
 * database.
 */

import type { PointOrigin } from '@/lib/worklogs/origin';
import type { PointEvent, PointStatus } from '@/lib/worklogs/timeline';
import type { PLAN_STATUS, ScheduleEvery } from '@/models/workspace';

export type PagePerson = {
  id: string;
  name?: string | null;
  username?: string | null;
  avatar?: string | null;
  positionTitle?: string | null;
};

export type PageCompany = {
  id: string;
  name: string;
  color?: string | null;
  logo?: string | null;
  isPersonal?: boolean;
};

export type PageProject = {
  id: string;
  name: string;
  companyId: string;
  color?: string | null;
  logo?: string | null;
};

export type PageTask = {
  id: string;
  title: string;
  status: string;
  size: string;
  projectId: string;
  companyId: string;
  dueDate?: string | null;
  forDate?: string | null;
  completedAt?: string | null;
  planId?: string | null;
};

/**
 * One work point (a worklog line) in the period. A point carried over to
 * later days shows up once, with every day it was on.
 */
export type WorkPoint = {
  key: string;
  text: string;
  status: PointStatus | null;
  isPrivate: boolean;
  byClaude: boolean;
  companyId: string | null;
  projectId: string | null;
  taskId: string | null;
  /** Days it was on, oldest first. */
  dates: string[];
  /** When it started and, if it has, finished (ISO times). */
  startedAt?: string | null;
  finishedAt?: string | null;
  /** What happened to it and when, oldest first. */
  events: PointEvent[];
  /**
   * The assistant's lines only: the person's point it is a sub-log of, on
   * the same day.
   */
  parentKey?: string | null;
  /**
   * Planned before its first day began, unexpected, or delayed from an
   * earlier day; null for older lines with nothing to tell by.
   */
  origin?: PointOrigin | null;
};

export type WorkData = {
  person: PagePerson;
  isSelf: boolean;
  from: string;
  to: string;
  points: WorkPoint[];
  /** Tasks of theirs finished in the period. */
  doneTasks: PageTask[];
  /** Tasks the points are linked to. */
  tasks: PageTask[];
  projects: PageProject[];
  companies: PageCompany[];
  /** Points in companies the viewer is not part of: counted, not shown. */
  hiddenCount: number;
};

/** Points logged per day, for the activity grid. */
export type ActivityData = {
  from: string;
  to: string;
  days: Record<string, number>;
};

export type PageStep = {
  planId: string;
  stepId: string;
  text: string;
  dueOn?: string | null;
  projectId?: string | null;
  companyId: string;
};

export type PagePlan = {
  id: string;
  title: string;
  status: PLAN_STATUS;
  companyId: string;
  startOn?: string | null;
  endOn?: string | null;
  total: number;
  done: number;
  /** Their own steps still open. */
  mine: number;
  role: 'owner' | 'member' | 'steps';
};

export type PageSchedule = {
  id: string;
  title: string;
  projectId: string;
  companyId: string;
  every: ScheduleEvery;
  weekdays?: number[];
  monthDay?: number | null;
  count: number;
  nextRunOn: string;
};

export type PageMeeting = {
  id: string;
  guestName: string;
  guestNote?: string | null;
  start: string;
  end: string;
  status: string;
  meetingUrl?: string | null;
};

export type AgendaData = {
  isSelf: boolean;
  tasks: PageTask[];
  steps: PageStep[];
  plans: PagePlan[];
  schedules: PageSchedule[];
  /** Only on their own page; null for anyone else. */
  meetings: PageMeeting[] | null;
  projects: PageProject[];
  companies: PageCompany[];
};
