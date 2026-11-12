'use client';

import type { User } from '@db/client';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { APP_ROUTES } from '@/utils/constants/appInfo';
import { getDateInFormat, getTimeInFormat } from '@/utils/helpers/prettyprint';
import { PortalSdk } from '@/utils/services/PortalSdk';

import type { DayMeeting, DayTask } from '../Worklogs/DayLog/useDay';

type Meeting = { id: string; meeting: DayMeeting };

/**
 * Today's meetings, read from the same day the worklog page shows: a
 * confirmed meeting is a task on its day with its time, who and join link.
 */
const useTodaysMeetings = () => {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const date = dayjs().format('YYYY-MM-DD');

  useEffect(() => {
    PortalSdk.getData(`/api/me/day?date=${date}`, null)
      .then((res) => {
        const tasks: DayTask[] = res?.data?.tasks ?? [];
        setMeetings(
          tasks
            .filter(
              (t): t is DayTask & { meeting: DayMeeting } =>
                !!t.meeting &&
                t.status !== 'DONE' &&
                dayjs(t.meeting.start).format('YYYY-MM-DD') === date,
            )
            .sort((a, b) => (a.meeting.start < b.meeting.start ? -1 : 1))
            .map((t) => ({ id: t.id, meeting: t.meeting })),
        );
      })
      .catch(() => setMeetings([]));
  }, [date]);

  return meetings;
};

const MeetingRow = ({ meeting }: { meeting: DayMeeting }) => {
  const over = dayjs(meeting.end).isBefore(dayjs());
  return (
    <li className="flex items-center gap-3 px-2 py-1.5 text-sm">
      <span className="material-icons text-base text-neutral-500">
        {meeting.interview ? 'badge' : 'videocam'}
      </span>
      <span className="w-[92px] shrink-0 font-semibold tabular-nums">
        {meeting.time}
      </span>
      <span className="min-w-0 flex-1 truncate text-neutral-700">
        {meeting.with}
        {meeting.status !== 'CONFIRMED' && (
          <span className="ml-1.5 text-xs text-neutral-500">not confirmed</span>
        )}
      </span>
      {meeting.joinUrl && !over && (
        <a
          href={meeting.joinUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-neutral-900 px-3 py-0.5 text-xs font-semibold text-white hover:bg-neutral-700"
        >
          Join
        </a>
      )}
    </li>
  );
};

export const DailySection = ({ user }: { user: User }) => {
  const meetings = useTodaysMeetings();

  return (
    <div className="mx-2 my-1 flex flex-col gap-3 rounded-[1.15em] bg-white p-1">
      <div className="flex w-full flex-row justify-between border-b border-neutral-400 px-2 py-3 text-sm">
        <h4>
          It&apos;s &nbsp;
          <strong>{getTimeInFormat()}</strong> &nbsp; now.
        </h4>
        <Link
          href={APP_ROUTES.userWorklogs}
          className="flex items-center gap-2 border-l border-neutral-400 pl-2 text-xs hover:text-neutral-600"
        >
          <span className="icon_size material-icons text-neutral-800">
            edit_note
          </span>
          My worklogs
        </Link>
      </div>
      <div className="flex w-full flex-row items-center justify-between p-2 text-sm">
        <div className="pl-2">
          <h1 className="text-3xl font-black">{getDateInFormat('mmm')}</h1>
          <p className="text-xs">
            {getDateInFormat('dayname')} | {user?.timezone}
          </p>
        </div>
      </div>
      {meetings && meetings.length > 0 && (
        <div className="border-t border-neutral-200 px-2 pb-2 pt-1">
          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Meetings today
          </p>
          <ul>
            {meetings.map((m) => (
              <MeetingRow key={m.id} meeting={m.meeting} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
