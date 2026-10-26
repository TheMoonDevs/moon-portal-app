import { db } from '@/lib/mongodb/db-client';
import { hasContent } from '@/lib/progress/server';
import { USERSTATUS } from '@/models/shared/enums';
import type { Task } from '@/models/workspace';
import { TASK_STATUS } from '@/models/workspace';

import { sendPushToUsers } from './server';

/*
 * Daily push reminders, run every 30 minutes by /api/cron/day-reminders.
 * A day is the person's own calendar day (midnight to midnight in their
 * timezone), the same day the worklog page writes to.
 *
 * - Evening (from 22:00): nothing logged today → "mark as rest day or log".
 * - Morning (from 08:00): a summary of what they have planned today.
 *
 * Each is sent at most once per person per day; the day it was last sent is
 * kept on their Subscription document.
 */

const EVENING_FROM = 22 * 60;
const MORNING_FROM = 8 * 60;
const MORNING_UNTIL = 12 * 60;
const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata';
const OPEN_STATUSES = [
  TASK_STATUS.TODO,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.IN_REVIEW,
];

type Reminders = { eveningFor?: string; morningFor?: string };

/** The person's local date (YYYY-MM-DD) and minutes since midnight. */
export function localClock(timezone: string | null | undefined, now: Date) {
  const read = (timeZone: string) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(now)
        .map((p) => [p.type, p.value]),
    );
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      minutes: Number(parts.hour) * 60 + Number(parts.minute),
    };
  };
  try {
    return read(timezone || DEFAULT_TIMEZONE);
  } catch {
    return read(DEFAULT_TIMEZONE);
  }
}

export const worklogUrl = (date: string) =>
  `/user/worklogs/new?logType=dayLog&date=${date}`;

const restDayUrl = (date: string, mark = false) =>
  `/rest-day?date=${date}${mark ? '&mark=1' : ''}`;

/** Open tasks first by due date (overdue and today first), then the rest. */
async function plannedTasks(userId: string, date: string) {
  const tasks = (await db.task.findMany({
    where: { assigneeIds: userId, status: { in: OPEN_STATUSES } },
    select: { title: true, status: true, dueDate: true },
  })) as Pick<Task, 'title' | 'status' | 'dueDate'>[];
  const rank = (t: (typeof tasks)[number]) =>
    t.dueDate && t.dueDate.slice(0, 10) <= date
      ? 0
      : t.status === TASK_STATUS.IN_PROGRESS
        ? 1
        : t.dueDate
          ? 2
          : 3;
  return tasks
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'),
    )
    .map((t) => t.title);
}

/** Lines in the person's "Later" todo list that aren't ticked off yet. */
async function openTodos(userId: string) {
  const doc = await db.docMarkdown.findUnique({
    where: { docId: `${userId}-todoLater` },
  });
  const content: string = doc?.markdown?.content ?? '';
  return content
    .split('\n')
    .filter((l) => !l.includes('✅'))
    .map((l) => l.replace(/^\s*[*\-+]\s*(\[ \]\s*)?/, '').trim())
    .filter((l) => l.replace(/[^\p{L}\p{N}]/gu, '').length >= 3);
}

const listPreview = (items: string[], max = 3) =>
  items.slice(0, max).join(', ') +
  (items.length > max ? ` +${items.length - max} more` : '');

async function eveningReminder(userId: string, date: string) {
  const log = await db.workLogs.findFirst({
    where: { userId, logType: 'dayLog', date },
  });
  if (log && (log.restDay || hasContent(log))) return false;

  await sendPushToUsers([userId], {
    title: 'No work logged today',
    body: 'The day is almost over. Log what you did, or mark today as a rest day.',
    url: restDayUrl(date),
    tag: `evening-${date}`,
    actions: [
      { action: 'rest-day', title: 'Rest day' },
      { action: 'log', title: 'Update worklog' },
    ],
    actionUrls: { 'rest-day': restDayUrl(date, true), log: worklogUrl(date) },
  });
  return true;
}

async function morningSummary(userId: string, date: string) {
  const [tasks, todos] = await Promise.all([
    plannedTasks(userId, date),
    openTodos(userId),
  ]);
  const planned = [...tasks, ...todos];

  await sendPushToUsers([userId], {
    title: planned.length
      ? `Good morning! ${planned.length} planned for today`
      : 'Good morning! Plan your day',
    body: planned.length
      ? listPreview(planned)
      : 'Nothing planned yet. Open your worklog and write down your plan.',
    url: worklogUrl(date),
    tag: `morning-${date}`,
  });
  return true;
}

/** Sends whichever reminders are due right now. */
export async function runDayReminders(now = new Date()) {
  const subscriptions = (await db.subscription.findMany({})) as {
    id: string;
    userId: string;
    subscriptions?: unknown[];
    reminders?: Reminders;
  }[];
  const withDevices = subscriptions.filter((s) => s.subscriptions?.length);
  if (!withDevices.length) return { evening: 0, morning: 0 };

  const users = (await db.user.findMany({
    where: { id: { in: withDevices.map((s) => s.userId) } },
    select: { id: true, timezone: true, status: true },
  })) as { id: string; timezone?: string | null; status?: string }[];
  const byId = new Map(users.map((u) => [u.id, u]));

  let evening = 0;
  let morning = 0;
  for (const sub of withDevices) {
    const user = byId.get(sub.userId);
    if (!user || user.status !== USERSTATUS.ACTIVE) continue;
    const { date, minutes } = localClock(user.timezone, now);
    const reminders = sub.reminders ?? {};

    const dueEvening = minutes >= EVENING_FROM && reminders.eveningFor !== date;
    const dueMorning =
      minutes >= MORNING_FROM &&
      minutes < MORNING_UNTIL &&
      reminders.morningFor !== date;
    if (!dueEvening && !dueMorning) continue;

    // Record first, so an overlapping run can't send the same one twice.
    const next: Reminders = {
      ...reminders,
      ...(dueEvening && { eveningFor: date }),
      ...(dueMorning && { morningFor: date }),
    };
    await db.subscription.update({
      where: { userId: sub.userId },
      data: { reminders: next },
    });

    try {
      if (dueEvening && (await eveningReminder(user.id, date))) evening++;
      if (dueMorning && (await morningSummary(user.id, date))) morning++;
    } catch (error) {
      console.error('Day reminder failed for', user.id, error);
    }
  }
  return { evening, morning };
}
