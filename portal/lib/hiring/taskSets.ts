/**
 * The Task stage split by where each candidate's task stands: late, opened,
 * still sitting in their inbox, or the email never arrived. Client-safe.
 */

import type { JobApplication, JobTask } from '@/models/hiring';
import { HIRING_EMAIL_STATUS } from '@/models/hiring';

import { applicationDueAt } from './tasks';

export type TaskSet = 'PAST_DUE' | 'CHECKED' | 'INBOX' | 'FAILED';

/** In the order the board shows them. */
export const TASK_SETS: Array<{
  value: TaskSet;
  label: string;
  icon: string;
  hint: string;
  color: string;
}> = [
  {
    value: 'PAST_DUE',
    label: 'Past due',
    icon: 'alarm',
    hint: 'Their due date passed and nothing came back.',
    color: '#f59e0b',
  },
  {
    value: 'CHECKED',
    label: 'Task checked',
    icon: 'visibility',
    hint: 'They opened their task link.',
    color: '#8b5cf6',
  },
  {
    value: 'INBOX',
    label: 'In inbox',
    icon: 'mark_email_unread',
    hint: 'Emailed, but they haven’t opened their task link yet.',
    color: '#0ea5e9',
  },
  {
    value: 'FAILED',
    label: 'Failed email',
    icon: 'unsubscribe',
    hint: 'The last email to them didn’t arrive.',
    color: '#f43f5e',
  },
];

const UNDELIVERED: HIRING_EMAIL_STATUS[] = [
  HIRING_EMAIL_STATUS.BOUNCED,
  HIRING_EMAIL_STATUS.COMPLAINED,
  HIRING_EMAIL_STATUS.FAILED,
];

/**
 * Which set one candidate in the Task stage belongs to. A failed email comes
 * first, since nothing else can happen until it's fixed; then a passed due
 * date; then whether they opened the link.
 */
export function taskSetOf(
  application: Pick<
    JobApplication,
    | 'lastEmail'
    | 'taskSubmission'
    | 'taskOpens'
    | 'taskSentAt'
    | 'taskDueOverride'
  >,
  task: Pick<JobTask, 'dueDays'> | null | undefined,
  now = new Date(),
): TaskSet {
  if (
    application.lastEmail &&
    UNDELIVERED.includes(application.lastEmail.status)
  )
    return 'FAILED';
  const due = applicationDueAt(task, application);
  if (!application.taskSubmission && due && due < now) return 'PAST_DUE';
  if (application.taskOpens?.count || application.taskSubmission)
    return 'CHECKED';
  return 'INBOX';
}
