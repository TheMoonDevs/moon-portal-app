import { db } from '@/lib/mongodb/db-client';
import type { TaskSchedule } from '@/models/workspace';
import { TASK_STATUS } from '@/models/workspace';

import { addDays, nextRunOnOrAfter, toDay } from './projects';

/** A schedule that was missed for a while creates at most this many runs. */
const MAX_CATCH_UP_RUNS = 7;

/**
 * Creates the tasks of every active schedule that is due. Safe to call from
 * many places at once: each run is claimed by moving `nextRunOn` forward
 * first, so a run is only ever created once. Called by the daily cron and
 * whenever tasks are loaded, so a missed cron still catches up.
 */
export async function runDueSchedules(
  where: {
    projectId?: { in: string[] };
    companyId?: { in: string[] };
  } = {},
) {
  const today = toDay();
  const due: TaskSchedule[] = await db.taskSchedule.findMany({
    where: { ...where, active: true, nextRunOn: { lte: today } },
  });

  let created = 0;
  for (const schedule of due) {
    // Run dates from nextRunOn up to today.
    const runs: string[] = [];
    let day = schedule.nextRunOn;
    while (day <= today && runs.length < 400) {
      runs.push(day);
      day = nextRunOnOrAfter(schedule, addDays(day, 1));
    }
    const claimed = await db.taskSchedule.updateMany({
      where: { id: schedule.id, nextRunOn: schedule.nextRunOn },
      data: { nextRunOn: day, lastRunOn: today, updatedAt: new Date() },
    });
    if (!claimed.count) continue;

    const now = new Date().toISOString();
    const count = Math.max(1, schedule.count || 1);
    const kept = runs.slice(-MAX_CATCH_UP_RUNS);
    // Tasks already made for a run, e.g. done early, are not made again.
    const early: { forDate?: string | null }[] = await db.task.findMany({
      where: { scheduleId: schedule.id, forDate: { in: kept } },
      select: { forDate: true },
    });
    const tasks = kept.flatMap((runOn) =>
      Array.from({ length: count }, (_, i) => ({
        companyId: schedule.companyId,
        projectId: schedule.projectId,
        title:
          count > 1 ? `${schedule.title} (${i + 1}/${count})` : schedule.title,
        description: schedule.description ?? null,
        size: schedule.size,
        status: TASK_STATUS.TODO,
        assigneeIds: schedule.assigneeIds ?? [],
        dueDate:
          schedule.dueInDays != null
            ? addDays(runOn, schedule.dueInDays)
            : null,
        completedAt: null,
        goalId: schedule.goalId ?? null,
        goalPartId: schedule.goalPartId ?? null,
        scheduleId: schedule.id,
        planId: schedule.planId ?? null,
        forDate: runOn,
        createdById: schedule.createdById,
        createdAt: now,
        updatedAt: now,
      })).slice(early.filter((t) => t.forDate === runOn).length),
    );
    if (tasks.length) {
      await db.task.createMany({ data: tasks });
      created += tasks.length;
    }
  }
  return { schedules: due.length, created };
}
