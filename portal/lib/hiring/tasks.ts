/**
 * Take-home tasks: the shape of an opening's task and when a candidate may
 * still send theirs. Free of server-only imports so the opening editor, the
 * task page and the API share one set of rules.
 */
import type { JobApplication, JobTask, TaskDeliverable } from '@/models/hiring';

import {
  MAX_DESCRIPTION_LENGTH,
  MAX_LABEL_LENGTH,
  sanitizeFields,
} from './forms';
import { TASK_PAGES } from './taskPages';

export const MAX_DELIVERABLES = 12;
export const MAX_DELIVERABLE_BODY = 2000;
export const MAX_DUE_DAYS = 60;
/** Unguessable and URL-safe: 24 random bytes as base64url is 32 characters. */
export const TASK_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,64}$/;

const clip = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

/**
 * Cleans a task from an untrusted body. Returns null for "no task": no brief,
 * no deliverables and no questions.
 */
export function sanitizeTask(input: unknown): JobTask | null {
  if (!input || typeof input !== 'object') return null;
  const r = input as Record<string, unknown>;

  const deliverables: TaskDeliverable[] = (
    Array.isArray(r.deliverables) ? r.deliverables : []
  )
    .slice(0, MAX_DELIVERABLES)
    .map((d) => {
      const item = (d && typeof d === 'object' ? d : {}) as Record<
        string,
        unknown
      >;
      return {
        title: clip(item.title, MAX_LABEL_LENGTH),
        body: clip(item.body, MAX_DELIVERABLE_BODY),
      };
    })
    .filter((d) => d.title || d.body);

  const days = Number(r.dueDays);
  const page = clip(r.page, 40);
  const task: JobTask = {
    page: page && page in TASK_PAGES ? page : null,
    brief: clip(r.brief, MAX_DESCRIPTION_LENGTH),
    effort: clip(r.effort, 120) || null,
    dueDays:
      Number.isFinite(days) && days >= 1
        ? Math.min(Math.round(days), MAX_DUE_DAYS)
        : null,
    deliverables,
    closing: clip(r.closing, MAX_DELIVERABLE_BODY) || null,
    fields: sanitizeFields(r.fields),
  };
  if (!task.brief && !task.deliverables.length && !task.fields.length)
    return null;
  return task;
}

/**
 * The last moment of a date's day in UTC. A task is due "by" a day: emails,
 * the task page and the board show only the date (see formatTaskDue), so it
 * stays open until that day ends rather than at the hour it was sent or
 * extended.
 */
export function endOfUtcDay(date: Date): Date {
  const end = new Date(date.getTime());
  end.setUTCHours(23, 59, 59, 0);
  return end;
}

/** When the task is due, counted from when its link was first emailed. */
export function taskDueAt(
  task: Pick<JobTask, 'dueDays'> | null | undefined,
  sentAt: string | null | undefined,
): Date | null {
  if (!task?.dueDays || !sentAt) return null;
  const due = new Date(sentAt);
  if (Number.isNaN(due.getTime())) return null;
  due.setUTCDate(due.getUTCDate() + task.dueDays);
  return endOfUtcDay(due);
}

/**
 * When one candidate's task is due: their own extended date when the team
 * gave them more time, else counted from when the task link was first emailed.
 */
export function applicationDueAt(
  task: Pick<JobTask, 'dueDays'> | null | undefined,
  application: Pick<JobApplication, 'taskSentAt' | 'taskDueOverride'>,
): Date | null {
  if (application.taskDueOverride) {
    const due = new Date(application.taskDueOverride);
    // Older extensions were saved at the hour they were made; they still
    // count until the end of the day the candidate was told.
    if (!Number.isNaN(due.getTime())) return endOfUtcDay(due);
  }
  return taskDueAt(task, application.taskSentAt);
}

/** Furthest a due date can be pushed, counted from today. */
export const MAX_EXTENSION_DAYS = 90;

/**
 * A new due date from `{ dueAt }` (a date or ISO time) or `{ days }` (added to
 * the current due date, or to now when it has none or has passed). Either way
 * it means the end of that day in UTC, so the candidate gets the whole day.
 */
export function extendedDueAt(
  current: Date | null,
  input: { dueAt?: unknown; days?: unknown },
  now = new Date(),
): { dueAt: Date | null; error: string | null } {
  let due: Date | null = null;
  if (typeof input.dueAt === 'string' && input.dueAt.trim()) {
    const raw = input.dueAt.trim();
    due = new Date(
      /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T23:59:59.000Z` : raw,
    );
    if (!Number.isNaN(due.getTime())) due = endOfUtcDay(due);
    if (Number.isNaN(due.getTime()))
      return { dueAt: null, error: 'The new due date doesn’t look right.' };
  } else if (input.days !== undefined && input.days !== null) {
    const days = Number(input.days);
    if (!Number.isFinite(days) || days < 1)
      return { dueAt: null, error: 'Extend by at least one day.' };
    const from = current && current > now ? current : now;
    due = endOfUtcDay(new Date(from.getTime() + Math.round(days) * 86400000));
  } else {
    return { dueAt: null, error: 'Give a new due date or a number of days.' };
  }
  if (due <= now)
    return { dueAt: null, error: 'The new due date has to be in the future.' };
  if (
    due > endOfUtcDay(new Date(now.getTime() + MAX_EXTENSION_DAYS * 86400000))
  )
    return {
      dueAt: null,
      error: `Keep it within ${MAX_EXTENSION_DAYS} days from today.`,
    };
  return { dueAt: due, error: null };
}

/**
 * Whether a candidate can send their task now. With a due date they can send
 * again until it passes; without one, or once it has passed, they send once.
 */
export function canSubmitTask(
  task: JobTask | null | undefined,
  application: Pick<
    JobApplication,
    'taskSentAt' | 'taskSubmission' | 'taskDueOverride'
  >,
  now = new Date(),
): boolean {
  if (!task) return false;
  if (!application.taskSubmission) return true;
  const due = applicationDueAt(task, application);
  return !!due && now < due;
}
