import { addPoint, moveTask } from '@/lib/daywork/server';
import { db } from '@/lib/mongodb/db-client';
import { localClock } from '@/lib/push/dayReminders';
import { MEET_BOOKING_STATUS, type MeetBooking } from '@/models/meet';
import type { Task } from '@/models/workspace';
import { OPEN_TASK_STATUSES, TASK_SIZE, TASK_STATUS } from '@/models/workspace';

import { hostName } from './server';
import { formatRange } from './time';

/*
 * Meetings on the worklog. A confirmed meeting is a task on the day it
 * happens, for the host and, when the guest has a portal account, for the
 * guest too: "Meeting with Jane" or "Interview with Jane". The person ticks
 * it done once it has happened. Joining through the portal's join link
 * (/meet/join/<id>) logs "Joined the call" under it, so the day sheet shows
 * who turned up. A cancelled meeting takes its open tasks off the day.
 *
 * Each task carries `meetBookingId`, and there is one per person per
 * meeting. Tasks are made when the meeting is confirmed, and again by a
 * catch-up whenever someone's day is loaded, for meetings confirmed before
 * this existed or when a write failed.
 */

/** Meetings this far back are caught up when a day is loaded. */
const CATCH_UP_DAYS = 14;
/** And this far ahead, so the coming week's meetings already show. */
const AHEAD_DAYS = 7;
const DAY_MS = 86400000;

/** A project that hiring work belongs in, by its name. */
const HIRING_PROJECT = /human resources|hiring|recruit|\bhr\b/i;

const nowIso = () => new Date().toISOString();

type Person = {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  timezone?: string | null;
};

const PERSON_FIELDS = {
  id: true,
  name: true,
  username: true,
  email: true,
  timezone: true,
};

const loadPerson = (id: string): Promise<Person | null> =>
  db.user.findFirst({ where: { id }, select: PERSON_FIELDS });

/** The guest's portal account, when they have one (and are not the host). */
async function guestAccount(booking: MeetBooking): Promise<Person | null> {
  const email = booking.guestEmail?.trim().toLowerCase();
  if (!email) return null;
  const user: Person | null = await db.user.findFirst({
    where: { OR: [{ email }, { googleEmail: email }] },
    select: PERSON_FIELDS,
  });
  return user && user.id !== booking.hostId ? user : null;
}

/** The day a meeting falls on for a person, in their own timezone. */
export const meetingDay = (booking: MeetBooking, timezone?: string | null) =>
  localClock(timezone ?? null, new Date(booking.start)).date;

const isInterview = (booking: MeetBooking) => !!booking.applicationId;

/** "Meeting with Jane Doe" or "Interview with Jane Doe". */
export function meetingTaskTitle(booking: MeetBooking, otherName: string) {
  return `${isInterview(booking) ? 'Interview' : 'Meeting'} with ${otherName}`.slice(
    0,
    200,
  );
}

/**
 * Where an interview's task goes: the company's hiring project when it has
 * one, else its CORE project. Other meetings stay unplaced, for the person
 * to put where they belong.
 */
async function placeFor(booking: MeetBooking) {
  if (!booking.companyId) return { companyId: null, projectId: null };
  const projects: { id: string; name: string; isCore?: boolean }[] =
    await db.project.findMany({
      where: { companyId: booking.companyId, status: { notIn: ['ARCHIVED'] } },
      select: { id: true, name: true, isCore: true },
    });
  const project =
    projects.find((p) => HIRING_PROJECT.test(p.name)) ??
    projects.find((p) => p.isCore);
  return {
    companyId: booking.companyId,
    projectId: project?.id ?? null,
  };
}

/** The meeting's task for one person, if it has one. */
export const findMeetingTask = (
  bookingId: string,
  userId: string,
): Promise<Task | null> =>
  db.task.findFirst({ where: { meetBookingId: bookingId, ownerId: userId } });

/**
 * Makes (or moves to the meeting's day) one person's task for a confirmed
 * meeting. `other` is who they meet.
 */
async function ensureTaskFor(
  booking: MeetBooking,
  person: Person,
  otherName: string,
): Promise<Task> {
  const forDate = meetingDay(booking, person.timezone);
  const description = [
    formatRange(booking.start, booking.end, person.timezone || 'UTC'),
    booking.meetingUrl ? `Join: ${booking.meetingUrl}` : null,
    booking.guestNote ? `Note: ${booking.guestNote}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  const existing = await findMeetingTask(booking.id, person.id);
  if (existing) {
    // Still open and the meeting moved: it follows the meeting.
    if (
      OPEN_TASK_STATUSES.includes(existing.status) &&
      existing.forDate !== forDate
    )
      return db.task.update({
        where: { id: existing.id },
        data: { forDate, description, updatedAt: nowIso() },
      });
    return existing;
  }
  const at = nowIso();
  const place = await placeFor(booking);
  const created: Task = await db.task.create({
    data: {
      companyId: place.companyId,
      projectId: place.projectId,
      placedBy: place.projectId ? 'auto' : null,
      title: meetingTaskTitle(booking, otherName),
      description,
      size: TASK_SIZE.MINOR,
      status: TASK_STATUS.TODO,
      assigneeIds: [person.id],
      ownerId: person.id,
      createdById: person.id,
      madeBy: 'meet',
      forDate,
      // Meetings sit on the day in the order they happen.
      order: new Date(booking.start).getTime(),
      meetBookingId: booking.id,
      createdAt: at,
      updatedAt: at,
    },
  });
  // Two loads at once can both make it; the first one made stays.
  const copies: Task[] = await db.task.findMany({
    where: { meetBookingId: booking.id, ownerId: person.id },
    orderBy: { id: 'asc' },
  });
  const keep = copies[0] ?? created;
  for (const copy of copies.slice(1))
    if (copy.id === created.id)
      await db.task.delete({ where: { id: copy.id } }).catch(() => null);
  return keep;
}

/**
 * Puts a booking's tasks in step with it: confirmed meetings get a task for
 * the host and a guest with an account; anything else takes their open
 * tasks off the day (finished ones are kept). Never throws: the meeting
 * itself matters more than its task.
 */
export async function syncMeetingTask(booking: MeetBooking) {
  try {
    if (booking.status === MEET_BOOKING_STATUS.CONFIRMED) {
      const [host, guest] = await Promise.all([
        loadPerson(booking.hostId),
        guestAccount(booking),
      ]);
      if (host) await ensureTaskFor(booking, host, booking.guestName);
      if (guest && host) await ensureTaskFor(booking, guest, hostName(host));
      return;
    }
    const open: Task[] = await db.task.findMany({
      where: {
        meetBookingId: booking.id,
        status: { in: OPEN_TASK_STATUSES },
      },
    });
    for (const task of open)
      await moveTask(task, 'archived', {
        userId: task.ownerId || task.createdById,
        by: 'meet',
        note:
          booking.status === MEET_BOOKING_STATUS.CANCELLED
            ? 'Meeting cancelled'
            : 'Meeting no longer on',
      });
  } catch (err) {
    console.error('[meet] meeting task sync failed', booking.id, err);
  }
}

/**
 * Catches up one person's meetings around today: every confirmed meeting
 * they host or are the guest of gets its task, and cancelled ones lose
 * theirs. Cheap when nothing is missing.
 */
export async function syncMeetingTasks(user: {
  id: string;
  email?: string | null;
  googleEmail?: string | null;
}) {
  try {
    const now = Date.now();
    const emails = Array.from(
      new Set(
        [user.email, user.googleEmail]
          .filter((e): e is string => !!e)
          .map((e) => e.trim().toLowerCase()),
      ),
    );
    const bookings: MeetBooking[] = await db.meetBooking.findMany({
      where: {
        OR: [
          { hostId: user.id },
          ...(emails.length ? [{ guestEmail: { in: emails } }] : []),
        ],
        status: {
          in: [
            MEET_BOOKING_STATUS.CONFIRMED,
            MEET_BOOKING_STATUS.CANCELLED,
            MEET_BOOKING_STATUS.DECLINED,
          ],
        },
        start: {
          gt: new Date(now - CATCH_UP_DAYS * DAY_MS).toISOString(),
          lt: new Date(now + AHEAD_DAYS * DAY_MS).toISOString(),
        },
      },
      take: 200,
    });
    if (!bookings.length) return;
    const tasks: Pick<Task, 'meetBookingId' | 'status' | 'forDate'>[] =
      await db.task.findMany({
        where: {
          ownerId: user.id,
          meetBookingId: { in: bookings.map((b) => b.id) },
        },
        select: { meetBookingId: true, status: true, forDate: true },
      });
    const mine = new Map(tasks.map((t) => [t.meetBookingId, t]));
    for (const booking of bookings) {
      const task = mine.get(booking.id);
      const confirmed = booking.status === MEET_BOOKING_STATUS.CONFIRMED;
      if (confirmed ? !task : task && OPEN_TASK_STATUSES.includes(task.status))
        await syncMeetingTask(booking);
    }
  } catch (err) {
    console.error('[meet] meeting tasks catch-up failed', user.id, err);
  }
}

/**
 * Someone opened the meeting through its join link: logs it under their
 * task ("Joined the call at 10:02"), once. The task stays theirs to tick.
 */
export async function noteJoined(booking: MeetBooking, userId: string) {
  try {
    if (booking.status !== MEET_BOOKING_STATUS.CONFIRMED) return;
    let task = await findMeetingTask(booking.id, userId);
    if (!task) {
      await syncMeetingTask(booking);
      task = await findMeetingTask(booking.id, userId);
    }
    if (!task) return;
    const already = await db.workPoint.findFirst({
      where: { taskId: task.id, by: 'meet', text: { startsWith: 'Joined' } },
    });
    if (already) return;
    const person = await loadPerson(userId);
    const now = new Date();
    const clock = localClock(person?.timezone ?? null, now);
    const time = now.toLocaleTimeString('en-GB', {
      timeZone: person?.timezone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
    });
    const text = `Joined the call at ${time}`;
    if (task.status === TASK_STATUS.TODO)
      await moveTask(task, 'doing', {
        userId,
        by: 'meet',
        note: text,
        date: clock.date,
      });
    else await addPoint({ task, userId, date: clock.date, text, by: 'meet' });
  } catch (err) {
    console.error('[meet] join note failed', booking.id, err);
  }
}
