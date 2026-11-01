import { db } from '@/lib/mongodb/db-client';
import type { Task } from '@/models/workspace';
import { OPEN_TASK_STATUSES, TASK_STATUS } from '@/models/workspace';

import { addDays } from './projects';

/*
 * A goal task whose day went by unfinished. Delayed work is usually just
 * done on the next convenient day, so it can be carried on: moved to
 * another day as a task of its own, or merged into a later task of the same
 * goal (its words and notes go there). Either way the goal missed its day:
 * the old task is set aside (IGNORED) and stays on that day with
 * `goalMissed`, which the worklogs show as a red star.
 */

export type CarryInput =
  | { mode: 'move'; day: string }
  | { mode: 'merge'; intoId: string };

const isOpen = (t: Pick<Task, 'status'>) =>
  (OPEN_TASK_STATUSES as string[]).includes(t.status);

const days = (a: string, b: string) =>
  Math.round((Date.parse(a) - Date.parse(b)) / 86400000);

/** Why a task cannot be carried on, or null when it can. */
export function cannotCarry(task: Task): string | null {
  if (!task.goalId) return 'Only goal tasks can be moved on like this.';
  if (!isOpen(task)) return 'The task is already closed.';
  if (!task.forDate) return 'The task has no day of its own.';
  return null;
}

/** Later open tasks of the same goal, soonest first: where it can merge. */
export async function mergeTargets(task: Task): Promise<Task[]> {
  if (!task.goalId) return [];
  const tasks: Task[] = await db.task.findMany({
    where: {
      projectId: task.projectId,
      goalId: task.goalId,
      status: { in: OPEN_TASK_STATUSES },
    },
  });
  return tasks
    .filter((t) => t.id !== task.id && t.forDate && t.forDate > task.forDate!)
    .sort((a, b) => a.forDate!.localeCompare(b.forDate!));
}

export async function carryGoalTask(
  task: Task,
  userId: string,
  input: CarryInput,
): Promise<{ missed: Task; carried: Task }> {
  const now = new Date().toISOString();
  const day = task.forDate!;
  let carried: Task;

  if (input.mode === 'move') {
    const shift = days(input.day, day);
    carried = await db.task.create({
      data: {
        companyId: task.companyId,
        projectId: task.projectId,
        title: task.title,
        description: task.description ?? null,
        size: task.size,
        status:
          task.status === TASK_STATUS.IN_PROGRESS ||
          task.status === TASK_STATUS.IN_REVIEW
            ? task.status
            : TASK_STATUS.TODO,
        assigneeIds: task.assigneeIds ?? [],
        dueDate: task.dueDate ? addDays(task.dueDate, shift) : null,
        forDate: input.day,
        completedAt: null,
        goalId: task.goalId,
        goalPartId: task.goalPartId ?? null,
        goalChecked: true,
        // Not a run of the schedule: it is extra work on its new day, so the
        // day's own run is still made and still counts.
        scheduleId: null,
        planId: task.planId ?? null,
        followsId: task.id,
        carriedFrom: day,
        ownerId: task.ownerId ?? null,
        madeBy: 'person',
        placedBy: task.placedBy ?? null,
        startedAt: task.startedAt ?? null,
        createdById: userId,
        createdAt: now,
        updatedAt: now,
      },
    });
  } else {
    const into: Task | null = await db.task.findFirst({
      where: { id: input.intoId },
    });
    if (
      !into ||
      into.id === task.id ||
      into.projectId !== task.projectId ||
      into.goalId !== task.goalId ||
      !isOpen(into)
    )
      throw new Error('Pick an open task of the same goal to merge into.');
    const words = [`From ${day}: ${task.title}`, task.description?.trim() || '']
      .filter(Boolean)
      .join('\n');
    carried = await db.task.update({
      where: { id: into.id },
      data: {
        description: [into.description?.trim(), words]
          .filter(Boolean)
          .join('\n\n'),
        carriedFrom: into.carriedFrom ?? day,
        updatedAt: now,
      },
    });
  }

  // The notes written under it carry on with the work.
  await db.workPoint.updateMany({
    where: { taskId: task.id },
    data: { taskId: carried.id },
  });

  const missed: Task = await db.task.update({
    where: { id: task.id },
    data: {
      status: TASK_STATUS.IGNORED,
      flag: null,
      goalMissed: {
        day,
        at: now,
        byId: userId,
        movedTo: input.mode === 'move' ? carried.id : null,
        mergedInto: input.mode === 'merge' ? carried.id : null,
      },
      updatedAt: now,
    },
  });
  return { missed, carried };
}
