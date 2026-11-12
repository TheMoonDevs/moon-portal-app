import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { type LogPointInput, MUTATIONS, queryClient, type TaskChangeInput } from './query';
import type { Day, MyTasks, PointStatus, Task, TaskMove, TaskStatus } from './types';

/** How a task stands, in words. */
export function statusLabel(task: Pick<Task, 'status' | 'flag'>) {
  if (task.flag === 'blocked') return 'Blocked';
  if (task.flag === 'waiting') return 'Waiting';
  if (task.flag === 'paused') return 'Paused';
  return STATUS_LABEL[task.status] ?? task.status;
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'Doing',
  IN_REVIEW: 'In review',
  DONE: 'Done',
  IGNORED: 'Let go',
  ARCHIVED: 'Archived',
};

/** The statuses a work point can set, in the order the log sheet shows. */
export const POINT_STATUSES: { value: PointStatus; label: string }[] = [
  { value: 'doing', label: 'Doing' },
  { value: 'paused', label: 'Pause' },
  { value: 'waiting', label: 'Wait' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
  { value: 'not_done', label: 'Not done' },
];

export const POINT_LABEL: Record<string, string> = {
  doing: 'Doing',
  paused: 'Paused',
  done: 'Done',
  not_done: 'Not done',
  blocked: 'Blocked',
  waiting: 'Waiting',
  archived: 'Archived',
};

export const isOpen = (t: Pick<Task, 'status'>) =>
  t.status === 'TODO' || t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW';

/** The status a move gives a task, for showing it at once. */
function statusAfter(task: Task, move: TaskMove): Partial<Task> {
  switch (move) {
    case 'done':
      return { status: 'DONE', flag: null };
    case 'todo':
      return { status: 'TODO', flag: null };
    case 'paused':
      return { status: 'TODO', flag: 'paused' };
    case 'archived':
      return { status: 'ARCHIVED', flag: null };
    case 'not_done':
      return { flag: null };
    case 'blocked':
    case 'waiting':
      return { status: task.status === 'IN_REVIEW' ? 'IN_REVIEW' : 'IN_PROGRESS', flag: move };
    default:
      return { status: task.status === 'IN_REVIEW' ? 'IN_REVIEW' : 'IN_PROGRESS', flag: null };
  }
}

/** Shows a task's new status in every cached list before the portal answers. */
function patchCachedTask(taskId: string, patch: (t: Task) => Partial<Task>) {
  const apply = (t: Task) => (t.id === taskId ? { ...t, ...patch(t) } : t);
  queryClient.setQueriesData<Day>({ queryKey: ['day'] }, (d) =>
    d ? { ...d, tasks: d.tasks.map(apply) } : d,
  );
  queryClient.setQueriesData<MyTasks>({ queryKey: ['tasks'] }, (d) =>
    d ? { ...d, tasks: d.tasks.map(apply) } : d,
  );
  queryClient.setQueriesData<{ task: Task }>({ queryKey: ['task', taskId] }, (d) =>
    d?.task ? { ...d, task: apply(d.task) } : d,
  );
}

/**
 * Logs work on a task. Offline, it waits on the phone and is sent when the
 * network is back (lib/query.ts).
 */
export function useLogPoint() {
  return useMutation<unknown, Error, LogPointInput>({
    mutationKey: MUTATIONS.logPoint,
    onMutate: (input) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
      const move = input.status;
      if (move) patchCachedTask(input.taskId, (t) => statusAfter(t, move));
    },
  });
}

/** Changes a task: its title, day or status. Waits offline like logging. */
export function useChangeTask() {
  return useMutation<unknown, Error, TaskChangeInput>({
    mutationKey: MUTATIONS.changeTask,
    onMutate: (input) => {
      const { status, title, forDate, place } = input;
      patchCachedTask(input.taskId, (t) => ({
        ...(status && statusAfter(t, status)),
        ...(title !== undefined && { title }),
        ...(forDate !== undefined && { forDate }),
        ...(place && 'projectId' in place && { projectId: place.projectId }),
      }));
    },
  });
}
