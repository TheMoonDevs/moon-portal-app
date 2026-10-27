import dayjs from 'dayjs';

import type {
  AgendaData,
  PageMeeting,
  PageSchedule,
  PageStep,
  PageTask,
} from '@/lib/people/types';
import { addDays, runsOn } from '@/lib/workspace/projects';

/*
 * Everything ahead of a person as one list of dated items, for the calendar
 * and the "Up next" list. Days are local YYYY-MM-DD.
 */

export type AgendaItem =
  | { kind: 'task'; id: string; day: string | null; task: PageTask }
  | { kind: 'step'; id: string; day: string | null; step: PageStep }
  | { kind: 'repeat'; id: string; day: string; schedule: PageSchedule }
  | { kind: 'meeting'; id: string; day: string; meeting: PageMeeting };

export type AgendaKind = AgendaItem['kind'];

export const KIND_META: Record<
  AgendaKind,
  { label: string; dot: string; icon: string }
> = {
  task: { label: 'Task', dot: 'bg-sky-400', icon: 'task_alt' },
  step: { label: 'Plan step', dot: 'bg-violet-400', icon: 'map' },
  repeat: { label: 'Repeats', dot: 'bg-amber-400', icon: 'repeat' },
  meeting: { label: 'Meeting', dot: 'bg-emerald-400', icon: 'videocam' },
};

export const today = () => dayjs().format('YYYY-MM-DD');

export const taskDay = (t: PageTask) => t.dueDate || t.forDate || null;

const meetingDay = (m: PageMeeting) => dayjs(m.start).format('YYYY-MM-DD');

/** Each run of the repeating tasks from `from` to `to`. */
function repeats(schedules: PageSchedule[], from: string, to: string) {
  const out: AgendaItem[] = [];
  for (const s of schedules) {
    // Runs up to today have already made their tasks.
    let day = s.nextRunOn > from ? s.nextRunOn : from;
    for (let i = 0; day <= to && i < 400; i++, day = addDays(day, 1))
      if (runsOn(s, day))
        out.push({ kind: 'repeat', id: `${s.id}:${day}`, day, schedule: s });
  }
  return out;
}

/** Tasks, steps and meetings, plus repeating runs from `from` to `to`. */
export function agendaItems(
  agenda: AgendaData,
  from: string,
  to: string,
): AgendaItem[] {
  return [
    ...agenda.tasks.map(
      (task): AgendaItem => ({
        kind: 'task',
        id: task.id,
        day: taskDay(task),
        task,
      }),
    ),
    ...agenda.steps.map(
      (step): AgendaItem => ({
        kind: 'step',
        id: `${step.planId}:${step.stepId}`,
        day: step.dueOn ?? null,
        step,
      }),
    ),
    ...(agenda.meetings ?? []).map(
      (meeting): AgendaItem => ({
        kind: 'meeting',
        id: meeting.id,
        day: meetingDay(meeting),
        meeting,
      }),
    ),
    ...repeats(agenda.schedules, from, to),
  ];
}

const KIND_ORDER: AgendaKind[] = ['meeting', 'task', 'step', 'repeat'];

/** Meetings by time first, then tasks, steps and repeats. */
export const byTime = (a: AgendaItem, b: AgendaItem) => {
  if (a.kind === 'meeting' && b.kind === 'meeting')
    return a.meeting.start.localeCompare(b.meeting.start);
  return KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
};

export type Bucket = { key: string; label: string; items: AgendaItem[] };

/**
 * The "Up next" list: overdue, today, tomorrow, the rest of this week, later
 * and undated. Repeating runs only show for the next week.
 */
export function upNext(agenda: AgendaData): Bucket[] {
  const t = today();
  const tomorrow = addDays(t, 1);
  // Weeks end on Sunday.
  const weekEnd = addDays(t, (7 - dayjs().day()) % 7);
  const items = agendaItems(agenda, t, addDays(t, 6));
  const buckets: Bucket[] = [
    { key: 'overdue', label: 'Overdue', items: [] },
    { key: 'today', label: 'Today', items: [] },
    { key: 'tomorrow', label: 'Tomorrow', items: [] },
    { key: 'week', label: 'This week', items: [] },
    { key: 'later', label: 'Later', items: [] },
    { key: 'anytime', label: 'No date', items: [] },
  ];
  const put = (key: string, item: AgendaItem) =>
    buckets.find((b) => b.key === key)!.items.push(item);
  for (const item of items) {
    const day = item.day;
    if (!day) put('anytime', item);
    else if (day < t) put('overdue', item);
    else if (day === t) put('today', item);
    else if (day === tomorrow) put('tomorrow', item);
    else if (day <= weekEnd) put('week', item);
    else if (item.kind !== 'repeat') put('later', item);
  }
  for (const b of buckets)
    b.items.sort((x, y) =>
      x.day && y.day && x.day !== y.day
        ? x.day.localeCompare(y.day)
        : byTime(x, y),
    );
  return buckets.filter((b) => b.items.length);
}

export const itemTitle = (item: AgendaItem) =>
  item.kind === 'task'
    ? item.task.title
    : item.kind === 'step'
      ? item.step.text
      : item.kind === 'repeat'
        ? item.schedule.count > 1
          ? `${item.schedule.title} ×${item.schedule.count}`
          : item.schedule.title
        : `Meeting with ${item.meeting.guestName}`;

export const itemProjectId = (item: AgendaItem) =>
  item.kind === 'task'
    ? item.task.projectId
    : item.kind === 'step'
      ? (item.step.projectId ?? null)
      : item.kind === 'repeat'
        ? item.schedule.projectId
        : null;
