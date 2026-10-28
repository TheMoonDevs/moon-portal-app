import { db } from '@/lib/mongodb/db-client';
import type { TaskSchedule } from '@/models/workspace';

import { addDays, nextRunOnOrAfter, toDay } from './projects';
import { moveSchedulesIntoGoals } from './scheduleMigration';
import { scheduleTask } from './scheduleRuns';

/** A schedule that was missed for a while creates at most this many runs. */
const MAX_CATCH_UP_RUNS = 7;

/** A run this many days ahead or fewer is made early, to show what is coming. */
const SHOW_AHEAD_DAYS = 2;

/**
 * Creates the tasks of every active schedule that is due, and of its next
 * run when that is a day or two away, so the coming one already shows in
 * Tasks. Safe to call from many places at once: each run is
 * claimed by moving `nextRunOn` forward first, so a run is only ever
 * created once. Called by the daily cron and whenever tasks are loaded, so
 * a missed cron still catches up. `lastRunOn` is the latest run created.
 */
export async function runDueSchedules(
  where: {
    projectId?: { in: string[] };
    companyId?: { in: string[] };
  } = {},
) {
  // Older schedules become goals first (once); goals run them from then.
  await moveSchedulesIntoGoals(where);
  const today = toDay();
  const due: TaskSchedule[] = await db.taskSchedule.findMany({
    where: {
      ...where,
      active: true,
      nextRunOn: { lte: addDays(today, SHOW_AHEAD_DAYS) },
    },
  });

  let created = 0;
  for (const schedule of due) {
    // Run dates from nextRunOn up to today, then the next one if it is in
    // the next few days and no run ahead was made yet.
    const runs: string[] = [];
    let day = schedule.nextRunOn;
    while (day <= today && runs.length < 400) {
      runs.push(day);
      day = nextRunOnOrAfter(schedule, addDays(day, 1));
    }
    if (
      day <= addDays(today, SHOW_AHEAD_DAYS) &&
      !(schedule.lastRunOn && schedule.lastRunOn > today)
    ) {
      runs.push(day);
      day = nextRunOnOrAfter(schedule, addDays(day, 1));
    }
    if (!runs.length) continue;
    const claimed = await db.taskSchedule.updateMany({
      where: { id: schedule.id, nextRunOn: schedule.nextRunOn },
      data: {
        nextRunOn: day,
        lastRunOn: runs[runs.length - 1],
        updatedAt: new Date(),
      },
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
      Array.from({ length: count }, (_, i) =>
        scheduleTask(schedule, runOn, i, now),
      ).slice(early.filter((t) => t.forDate === runOn).length),
    );
    if (tasks.length) {
      await db.task.createMany({ data: tasks });
      created += tasks.length;
    }
  }
  return { schedules: due.length, created };
}
