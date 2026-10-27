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

/** When the task is due, counted from when its link was first emailed. */
export function taskDueAt(
  task: Pick<JobTask, 'dueDays'> | null | undefined,
  sentAt: string | null | undefined,
): Date | null {
  if (!task?.dueDays || !sentAt) return null;
  const due = new Date(sentAt);
  if (Number.isNaN(due.getTime())) return null;
  due.setDate(due.getDate() + task.dueDays);
  return due;
}

/**
 * Whether a candidate can send their task now. With a due date they can send
 * again until it passes; without one, or once it has passed, they send once.
 */
export function canSubmitTask(
  task: JobTask | null | undefined,
  application: Pick<JobApplication, 'taskSentAt' | 'taskSubmission'>,
  now = new Date(),
): boolean {
  if (!task) return false;
  if (!application.taskSubmission) return true;
  const due = taskDueAt(task, application.taskSentAt);
  return !!due && now < due;
}
