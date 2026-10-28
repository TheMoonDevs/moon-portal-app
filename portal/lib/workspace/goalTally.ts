import { db } from '@/lib/mongodb/db-client';
import type { GoalTally, Project, ProjectGoal, Task } from '@/models/workspace';
import { TASK_STATUS } from '@/models/workspace';

import type { DoneTask } from './projects';
import { goalProgress, goalWindow, tallyRows, toDay } from './projects';

/*
 * Progress added by hand, for goals tasks cannot track (followers gained,
 * a reel posted from a phone). It sits on top of what done tasks count, one
 * number per goal (or part) and period, and never goes below nothing.
 */

/** The hand-added progress of these projects, ready to count with tasks. */
export async function tallyRowsFor(projectIds: string[]): Promise<DoneTask[]> {
  if (!projectIds.length) return [];
  const tallies: GoalTally[] = await db.goalTally.findMany({
    where: { projectId: { in: projectIds } },
  });
  return tallyRows(tallies);
}

/**
 * Changes a goal's progress for the period that holds `day`: `add` adds to
 * it (or takes back, when negative), `done` sets the period's total, with
 * done tasks counting first. Returns the goal's progress after.
 */
export async function updateGoalProgress(
  project: Project,
  userId: string,
  input: {
    goal: ProjectGoal;
    partId: string | null;
    add?: number;
    done?: number;
    day?: string;
  },
) {
  const { goal, partId } = input;
  const day = input.day ?? toDay();
  // A target goal keeps one running total, from the day it was set.
  const { from } = goalWindow(goal, day);
  const where = {
    projectId: project.id,
    goalId: goal.id,
    goalPartId: partId,
    from,
  };
  const [existing, tasks]: [GoalTally | null, Task[]] = await Promise.all([
    db.goalTally.findFirst({ where }),
    db.task.findMany({
      where: {
        projectId: project.id,
        goalId: goal.id,
        status: TASK_STATUS.DONE,
      },
      select: {
        status: true,
        goalId: true,
        goalPartId: true,
        forDate: true,
        completedAt: true,
        completedByIds: true,
        assigneeIds: true,
      },
    }),
  ]);

  let amount = existing?.amount ?? 0;
  if (input.done !== undefined) {
    // What tasks already count is kept; the rest is by hand.
    const [byTasks] = goalProgress([goal], tasks, day);
    const counted = partId
      ? (byTasks.parts?.find((p) => p.id === partId)?.done ?? 0)
      : byTasks.done;
    amount = input.done - counted;
  } else {
    amount += input.add ?? 0;
  }
  amount = Math.max(0, Math.min(100000, Math.round(amount)));

  const now = new Date().toISOString();
  if (existing && !amount)
    await db.goalTally.delete({ where: { id: existing.id } });
  else if (existing)
    await db.goalTally.update({
      where: { id: existing.id },
      data: { amount, updatedById: userId, updatedAt: now },
    });
  else if (amount)
    await db.goalTally.create({
      data: {
        ...where,
        companyId: project.companyId,
        amount,
        updatedById: userId,
        createdAt: now,
        updatedAt: now,
      },
    });

  const tallies: GoalTally[] = await db.goalTally.findMany({
    where: { projectId: project.id, goalId: goal.id },
  });
  return goalProgress([goal], [...tasks, ...tallyRows(tallies)], day)[0];
}
