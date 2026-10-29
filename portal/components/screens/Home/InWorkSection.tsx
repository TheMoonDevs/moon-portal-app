'use client';

import dayjs from 'dayjs';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { PortalSdk } from '@/utils/services/PortalSdk';

import type { TaskRowStatus } from '../Worklogs/DayLog/sheetParts';
import {
  placeOf,
  readablePoints,
  rowStatus,
} from '../Worklogs/DayLog/sheetParts';
import type {
  DayCompany,
  DayPoint,
  DayProject,
  DayTask,
} from '../Worklogs/DayLog/useDay';

/*
 * Today on the home page, read from the same day the worklog page writes:
 * the tasks under way first, then the rest still open, each with where it is
 * and its latest work point. Finished ones are counted, not listed.
 */

type Today = {
  tasks: DayTask[];
  points: DayPoint[];
  projects: DayProject[];
  companies: DayCompany[];
};

const ORDER: Record<string, number> = {
  doing: 0,
  waiting: 1,
  blocked: 2,
  open: 3,
  not_done: 4,
};

const MARK: Record<string, string> = {
  doing: 'bg-amber-400',
  waiting: 'bg-sky-400',
  blocked: 'bg-rose-500',
};

const LABEL: Record<string, string> = {
  waiting: 'Waiting',
  blocked: 'Blocked',
  not_done: 'Not done',
};

const StatusMark = ({ status }: { status: TaskRowStatus }) => (
  <span className="mt-[5px] flex size-3 shrink-0 items-center justify-center rounded-full border border-neutral-300">
    {status && MARK[status] && (
      <span className={cn('size-1.5 rounded-full', MARK[status])} />
    )}
  </span>
);

export const InWorkSection = ({ visible }: { visible?: boolean }) => {
  const [day, setDay] = useState<Today | null>(null);
  const [failed, setFailed] = useState(false);
  const date = dayjs().format('YYYY-MM-DD');

  useEffect(() => {
    PortalSdk.getData(`/api/me/day?date=${date}`, null)
      .then((res) => {
        const data = res?.data ?? {};
        setDay({
          tasks: data.tasks ?? [],
          points: data.points ?? [],
          projects: data.projects ?? [],
          companies: data.companies ?? [],
        });
      })
      .catch(() => setFailed(true));
  }, [date]);

  const { open, done } = useMemo(() => {
    if (!day) return { open: [], done: 0 };
    const rows = day.tasks.map((task) => {
      const status = rowStatus(task, day.points, date);
      const points = readablePoints(
        day.points.filter((p) => p.taskId === task.id),
      );
      return {
        task,
        status,
        place: placeOf(task, day.projects, day.companies),
        last: points.at(-1)?.text.trim() || '',
      };
    });
    return {
      open: rows
        .filter((r) => r.status !== 'done' && r.status !== 'archived')
        .sort((a, b) => ORDER[a.status ?? 'open'] - ORDER[b.status ?? 'open']),
      done: rows.filter((r) => r.status === 'done').length,
    };
  }, [day, date]);

  const doing = open.filter((r) => r.status === 'doing').length;

  return (
    <div>
      <section
        style={{ display: !visible ? 'none' : 'block' }}
        className="relative m-4 mt-6 max-h-[50vh] overflow-y-auto rounded-xl border-neutral-400 bg-white px-0 py-2 shadow-md md:max-h-[unset]"
      >
        {!day && !failed && (
          <div className="flex flex-col gap-3 px-4 py-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-4 animate-pulse rounded bg-neutral-100"
              />
            ))}
          </div>
        )}
        {failed && (
          <p className="px-4 py-3 text-sm text-neutral-500">
            Could not load today&apos;s tasks.
          </p>
        )}
        {day && (
          <>
            <p className="px-4 py-1 text-xs text-neutral-500">
              {doing} in progress · {open.length - doing} to do · {done} done
            </p>
            {open.length === 0 ? (
              <p className="px-4 py-3 text-sm text-neutral-500">
                {done
                  ? 'Everything planned for today is done.'
                  : 'Nothing planned for today yet.'}
              </p>
            ) : (
              <ul>
                {open.map(({ task, status, place, last }) => (
                  <li key={task.id}>
                    <Link
                      href={APP_ROUTES.userWorklogs}
                      className="flex gap-2.5 px-4 py-2 hover:bg-neutral-50"
                    >
                      <StatusMark status={status} />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'text-sm text-neutral-900',
                            status === 'doing' && 'font-semibold',
                          )}
                        >
                          {task.title}
                          {status && LABEL[status] && (
                            <span className="ml-1.5 text-xs font-normal text-neutral-500">
                              {LABEL[status]}
                            </span>
                          )}
                        </p>
                        <p className="flex items-center gap-1.5 truncate text-xs text-neutral-500">
                          {place.kind !== 'none' && (
                            <>
                              <span
                                className="size-1.5 shrink-0 rounded-full"
                                style={{
                                  backgroundColor: place.color || '#a3a3a3',
                                }}
                              />
                              <span className="shrink-0">{place.name}</span>
                            </>
                          )}
                          {last && (
                            <span className="truncate">
                              {place.kind !== 'none' && '· '}
                              {last}
                            </span>
                          )}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
};
