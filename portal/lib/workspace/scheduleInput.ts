import type { Project, ScheduleEvery } from '@/models/workspace';
import { TASK_SIZE } from '@/models/workspace';

import { nextRunOnOrAfter, toDay } from './projects';
import { asStringArray, goalLink } from './server';

const EVERY: ScheduleEvery[] = ['day', 'week', 'month'];

/** Reads a schedule from a request body; `error` explains what is missing. */
export function readScheduleBody(
  body: Record<string, any>,
  project: Project,
  existing?: Record<string, any>,
) {
  const merged = { ...(existing ?? {}), ...body };
  const title = typeof merged.title === 'string' ? merged.title.trim() : '';
  if (!title) return { error: 'Give the scheduled task a title.' };

  const every: ScheduleEvery = EVERY.includes(merged.every)
    ? merged.every
    : 'week';
  const weekdays = Array.isArray(merged.weekdays)
    ? Array.from(
        new Set(
          merged.weekdays
            .map(Number)
            .filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6),
        ),
      ).sort()
    : [];
  if (every === 'week' && !weekdays.length)
    return { error: 'Pick at least one day of the week.' };
  const monthDay = Math.min(28, Math.max(1, Number(merged.monthDay) || 1));
  const count = Math.min(
    50,
    Math.max(1, Math.round(Number(merged.count) || 1)),
  );
  const dueInDays =
    merged.dueInDays === null ||
    merged.dueInDays === '' ||
    merged.dueInDays === undefined
      ? null
      : Math.min(365, Math.max(0, Math.round(Number(merged.dueInDays) || 0)));

  const rule = { every, weekdays, monthDay };
  const ruleChanged =
    !existing ||
    ['every', 'weekdays', 'monthDay'].some((k) => k in body) ||
    ('active' in body && body.active && !existing.active);

  return {
    data: {
      title: title.slice(0, 200),
      description:
        typeof merged.description === 'string' && merged.description.trim()
          ? merged.description.trim()
          : null,
      size: merged.size === TASK_SIZE.MAJOR ? TASK_SIZE.MAJOR : TASK_SIZE.MINOR,
      assigneeIds: asStringArray(merged.assigneeIds),
      ...goalLink(project, merged),
      every,
      weekdays: every === 'week' ? weekdays : [],
      monthDay: every === 'month' ? monthDay : null,
      count,
      dueInDays,
      active: merged.active !== false,
      // A new or changed rule starts from today, never in the past.
      ...(ruleChanged && { nextRunOn: nextRunOnOrAfter(rule, toDay()) }),
    },
  };
}
