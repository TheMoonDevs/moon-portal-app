import type { Task } from './types';

/*
 * The statuses a person sets on a task, in the order they are shown, each
 * with its colour: an open ring for to do, a coloured dot for the rest.
 */

export type StatusPick = 'todo' | 'doing' | 'paused' | 'waiting' | 'blocked' | 'done';

export const STATUS_PICKS: {
  value: StatusPick;
  label: string;
  /** Null for to do: an open ring. */
  color: string | null;
  hint: string;
}[] = [
  { value: 'todo', label: 'To do', color: null, hint: 'Not started yet' },
  { value: 'doing', label: 'Doing', color: '#f59e0b', hint: 'Under way' },
  { value: 'paused', label: 'Pause', color: '#94a3b8', hint: 'Started, put down for now' },
  { value: 'waiting', label: 'Wait', color: '#38bdf8', hint: 'Waiting on you' },
  { value: 'blocked', label: 'Blocked', color: '#f43f5e', hint: 'Stopped by something else' },
  { value: 'done', label: 'Done', color: '#22c55e', hint: 'Finished' },
];

export const pickOf = (value: StatusPick) => STATUS_PICKS.find((p) => p.value === value)!;

/** Where a task stands now, as one of the picks (archived apart). */
export function currentPick(task: Pick<Task, 'status' | 'flag'>): StatusPick | 'archived' {
  if (task.status === 'DONE') return 'done';
  if (task.status === 'ARCHIVED' || task.status === 'IGNORED') return 'archived';
  if (task.flag) return task.flag;
  if (task.status === 'IN_PROGRESS' || task.status === 'IN_REVIEW') return 'doing';
  return 'todo';
}

/** Open tasks that need the person now: waiting on them, or blocked. */
export const needsYou = (task: Pick<Task, 'status' | 'flag'>) =>
  task.status !== 'DONE' &&
  task.status !== 'ARCHIVED' &&
  task.status !== 'IGNORED' &&
  (task.flag === 'waiting' || task.flag === 'blocked');
