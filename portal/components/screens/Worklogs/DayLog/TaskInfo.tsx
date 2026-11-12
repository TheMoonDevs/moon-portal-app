'use client';

import * as Popover from '@radix-ui/react-popover';
import dayjs from 'dayjs';
import { Fragment } from 'react';

import { cn } from '@/lib/utils';

import { Icon } from '../../Admin/shared/AdminUI';
import type { DayMeeting, DayTask } from './useDay';

/*
 * A task's details on the day sheet: what it is and how it is to be done.
 * A meeting's task shows when it is (24-hour clock), who with and how to
 * join; any other task shows the words whoever set it wrote. Tasks with
 * details get an "i" after their words that opens them; on a goal's task
 * the goal's star opens them instead (see GoalLink). Tasks with none show
 * nothing.
 */

/** The words written on how the task is to be done, if any. */
const writtenDetails = (task: DayTask) =>
  // A meeting's own words repeat its time and link, shown better above.
  task.meeting ? null : task.description?.trim() || null;

/** Whether a task has details worth a popup. */
export const hasDetails = (task: DayTask) =>
  !!task.meeting || !!writtenDetails(task);

const URL_RE = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

/** Text with its links made clickable, its lines kept. */
const Linked = ({ text }: { text: string }) => (
  <>
    {text.split(URL_RE).map((part, i) =>
      i % 2 ? (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="break-all text-sky-300 underline decoration-sky-300/40 underline-offset-2 hover:decoration-sky-300 auto-light:text-sky-700"
        >
          {part}
        </a>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      ),
    )}
  </>
);

/** The meeting's time on a task's line: "14:30–15:00". */
export const MeetingTime = ({
  meeting,
  quiet,
}: {
  meeting: DayMeeting;
  quiet?: boolean;
}) => (
  <span
    title={`${dayjs(meeting.start).format('ddd D MMM')}, ${meeting.time} (${meeting.timezone.replace(/_/g, ' ')})`}
    className={cn(
      'ml-1.5 inline-flex items-center gap-0.5 rounded px-1 align-[1px] text-[11px] font-medium tabular-nums leading-4',
      quiet
        ? 'bg-white/[0.04] text-neutral-500 auto-light:bg-black/[0.04] auto-light:text-neutral-400'
        : 'bg-sky-400/10 text-sky-300 auto-light:bg-sky-500/10 auto-light:text-sky-700',
    )}
  >
    <Icon name="schedule" className="text-[12px]" />
    {meeting.time}
  </span>
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
    {children}
  </p>
);

/** The details themselves, for the "i" popup and the goal star's. */
export const TaskDetails = ({
  task,
  className,
}: {
  task: DayTask;
  className?: string;
}) => {
  const meeting = task.meeting;
  const words = writtenDetails(task);
  return (
    <div className={cn('flex flex-col gap-3 px-2.5 py-2', className)}>
      {meeting && (
        <div className="flex items-start gap-2.5">
          <Icon
            name={meeting.interview ? 'badge' : 'videocam'}
            className="mt-0.5 text-[18px] text-sky-300 auto-light:text-sky-600"
          />
          <div className="min-w-0 flex-1">
            <Label>{meeting.interview ? 'Interview' : 'Meeting'}</Label>
            <p className="text-lg font-semibold tabular-nums text-white auto-light:text-neutral-950">
              {meeting.time}
            </p>
            <p className="text-xs text-neutral-400 auto-light:text-neutral-500">
              {dayjs(meeting.start).format('dddd D MMM')} · with {meeting.with}
            </p>
            <p className="text-[11px] text-neutral-500">
              {meeting.timezone.replace(/_/g, ' ')} time
            </p>
            {meeting.note && (
              <p className="mt-1.5 whitespace-pre-wrap break-words text-xs text-neutral-300 auto-light:text-neutral-700">
                <span className="text-neutral-500">Note: </span>
                <Linked text={meeting.note} />
              </p>
            )}
            {meeting.joinUrl && (
              <a
                href={meeting.joinUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-200 hover:bg-sky-500/25 auto-light:text-sky-700"
              >
                <Icon name="call" className="text-[14px]" />
                Join the call
              </a>
            )}
          </div>
        </div>
      )}
      {words && (
        <div className="flex items-start gap-2.5">
          <Icon
            name="description"
            className="mt-0.5 text-[18px] text-neutral-400 auto-light:text-neutral-500"
          />
          <div className="min-w-0 flex-1">
            <Label>How to do it</Label>
            <p className="mt-0.5 max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words text-[13px] leading-5 text-neutral-200 auto-light:text-neutral-800">
              <Linked text={words} />
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/** The "i" after a task's words, opening its details. */
export const TaskInfo = ({ task }: { task: DayTask }) => {
  if (!hasDetails(task)) return null;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Task details"
          title="Details"
          className="pointer-events-auto ml-1 inline-flex align-[-2px] text-neutral-500 transition-transform hover:scale-110 hover:text-neutral-200 auto-light:text-neutral-400 auto-light:hover:text-neutral-700"
        >
          <Icon name="info" className="text-[14px]" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="auto-theme z-[1300] w-[min(340px,calc(100vw-24px))] overflow-hidden rounded-xl border border-white/10 bg-neutral-900 p-1 text-sm text-neutral-200 shadow-2xl shadow-black/50 auto-light:border-black/10 auto-light:bg-white auto-light:text-neutral-800 auto-light:shadow-black/10"
        >
          <TaskDetails task={task} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
