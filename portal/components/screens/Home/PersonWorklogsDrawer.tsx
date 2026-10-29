'use client';

import { Drawer, useMediaQuery } from '@mui/material';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { WorkData, WorkPoint } from '@/lib/people/types';
import { cn } from '@/lib/utils';
import { MOVED_EMOJI, POINT_STATUSES } from '@/lib/worklogs/timeline';
import media from '@/styles/media';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { UserAvatar } from '../Admin/shared/AdminUI';

export interface LeaderboardPerson {
  rank: number;
  user: {
    id: string;
    name?: string | null;
    username?: string | null;
    avatar?: string | null;
    positionTitle?: string | null;
  };
  points: number;
  tasksDone: number;
  worklogDays: number;
  buff: { title: string; src: string } | null;
}

const MEDALS = ['🥇', '🥈', '🥉'];
const STRIP_DAYS = 28;
const PAGE = 7;

/** One line of a day: a task the person had on it. */
type DayLine = {
  key: string;
  text: string;
  /** Its status that day: moved on to a later day, or the task's own. */
  mark: string;
  done: boolean;
  isPrivate: boolean;
  byClaude: boolean;
};

/** A day's lines, in sections by project as the worklog had them. */
type Day = {
  date: string;
  sections: { title: string; lines: DayLine[] }[];
  done: number;
  total: number;
};

const dayLabel = (date: string) => {
  const d = dayjs(date);
  if (d.isSame(dayjs(), 'day')) return 'Today';
  if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Yesterday';
  return d.format('ddd, D MMM');
};

/** The person's tasks as days of lines, newest day first. */
function workDays(data: WorkData): Day[] {
  const projects = new Map(data.projects.map((p) => [p.id, p.name]));
  const companies = new Map(data.companies.map((c) => [c.id, c]));
  const sectionOf = (p: WorkPoint) => {
    if (p.projectId && projects.has(p.projectId))
      return projects.get(p.projectId)!;
    const company = p.companyId ? companies.get(p.companyId) : null;
    if (company && !company.isPersonal) return company.name;
    return p.isPrivate ? 'Personal' : 'General';
  };
  const byDate = new Map<string, Map<string, DayLine[]>>();
  for (const p of data.points) {
    const last = p.dates[p.dates.length - 1];
    for (const date of p.dates) {
      const moved = date !== last;
      const line: DayLine = {
        key: `${p.key}-${date}`,
        text: p.text,
        mark: moved
          ? MOVED_EMOJI
          : p.status
            ? POINT_STATUSES[p.status].emoji
            : '',
        done: !moved && p.status === 'done',
        isPrivate: p.isPrivate,
        byClaude: p.byClaude,
      };
      const sections = byDate.get(date) ?? new Map<string, DayLine[]>();
      const title = sectionOf(p);
      sections.set(title, [...(sections.get(title) ?? []), line]);
      byDate.set(date, sections);
    }
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, sections]) => {
      const lines = Array.from(sections.values()).flat();
      return {
        date,
        sections: Array.from(sections.entries())
          // General first, Personal last, projects by name between.
          .sort(([a], [b]) => {
            const rank = (t: string) =>
              t === 'General' ? 0 : t === 'Personal' ? 2 : 1;
            return rank(a) - rank(b) || a.localeCompare(b);
          })
          .map(([title, lines]) => ({ title, lines })),
        done: lines.filter((l) => l.done).length,
        total: lines.length,
      };
    });
}

/** Their tasks from the start of last month to today, as days. */
const useRecentDays = (userId: string | undefined) => {
  const [days, setDays] = useState<Day[] | null>(null);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    setDays(null);
    const from = dayjs().subtract(1, 'month').startOf('month');
    PortalSdk.getData(
      `/api/people/${userId}/work?from=${from.format('YYYY-MM-DD')}&to=${dayjs().format('YYYY-MM-DD')}`,
      null,
    )
      .then((res) => (res?.data ?? null) as WorkData | null)
      .catch(() => null)
      .then((data) => {
        if (live) setDays(data ? workDays(data) : []);
      });
    return () => {
      live = false;
    };
  }, [userId]);

  return days;
};

const ActivityStrip = ({
  days: logged,
  onPick,
}: {
  days: Day[];
  onPick: (date: string) => void;
}) => {
  const byDate = useMemo(
    () => new Map(logged.map((d) => [d.date, d])),
    [logged],
  );
  const days = Array.from({ length: STRIP_DAYS }, (_, i) =>
    dayjs()
      .subtract(STRIP_DAYS - 1 - i, 'day')
      .format('YYYY-MM-DD'),
  );

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-[11px] text-neutral-500">
        <span>Last 4 weeks</span>
        <span>
          {days.filter((d) => byDate.has(d)).length} of {STRIP_DAYS} days logged
        </span>
      </div>
      <div className="grid grid-cols-[repeat(28,minmax(0,1fr))] gap-[3px]">
        {days.map((date) => {
          const stats = byDate.get(date);
          const ratio = stats?.total ? stats.done / stats.total : 0;
          const weekend = [0, 6].includes(dayjs(date).day());
          return (
            <button
              key={date}
              type="button"
              disabled={!stats}
              onClick={() => stats && onPick(date)}
              title={
                stats
                  ? `${dayjs(date).format('ddd D MMM')}: ${stats.done}/${stats.total} done`
                  : `${dayjs(date).format('ddd D MMM')}: no log`
              }
              className={cn(
                'aspect-square rounded-[3px] transition-transform',
                stats
                  ? 'cursor-pointer hover:scale-125'
                  : weekend
                    ? 'bg-neutral-100'
                    : 'bg-neutral-200',
                stats && ratio >= 0.75 && 'bg-emerald-500',
                stats && ratio >= 0.4 && ratio < 0.75 && 'bg-emerald-400',
                stats && ratio > 0 && ratio < 0.4 && 'bg-emerald-300',
                stats && ratio === 0 && 'bg-amber-300',
              )}
            />
          );
        })}
      </div>
    </div>
  );
};

const DayCard = ({ day }: { day: Day }) => (
  <article
    data-date={day.date}
    className="scroll-mt-4 rounded-xl border border-neutral-200 bg-white p-3"
  >
    <header className="mb-1 flex items-center justify-between">
      <h5 className="text-sm font-semibold text-neutral-900">
        {dayLabel(day.date)}
      </h5>
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
          day.done === day.total
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-neutral-100 text-neutral-600',
        )}
      >
        {day.done}/{day.total} done
      </span>
    </header>
    {day.sections.map((section) => (
      <section key={section.title} className="mt-2 first:mt-1">
        {day.sections.length > 1 && (
          <h6 className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            {section.title}
          </h6>
        )}
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-neutral-800 marker:text-neutral-400">
          {section.lines.map((line) => (
            <li key={line.key} className="leading-6">
              {line.isPrivate && (
                <span
                  title="Only they see this"
                  className="material-symbols-outlined mr-1 align-[-3px] !text-[14px] text-neutral-400"
                >
                  lock
                </span>
              )}
              {line.mark && <span className="mr-1">{line.mark}</span>}
              {line.text}
              {line.byClaude && (
                <span className="ml-1.5 rounded bg-neutral-100 px-1 text-[10px] text-neutral-500">
                  bot
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    ))}
  </article>
);

/**
 * A teammate's recent worklogs, opened from the leaderboard. Arrows (or the
 * ← → keys) step through the leaderboard without closing the drawer.
 */
export const PersonWorklogsDrawer = ({
  people,
  index,
  onIndexChange,
  onClose,
  isMe,
}: {
  people: LeaderboardPerson[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  isMe: (userId: string) => boolean;
}) => {
  const isMobile = useMediaQuery(media.largeMobile);
  const person = index === null ? null : people[index];
  const logs = useRecentDays(person?.user.id);
  const [shown, setShown] = useState(PAGE);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setShown(PAGE), [person?.user.id]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.isContentEditable) return;
      if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
      if (e.key === 'ArrowRight' && index < people.length - 1)
        onIndexChange(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, people.length, onIndexChange]);

  const jumpTo = (date: string) => {
    const at = logs?.findIndex((l) => l.date === date) ?? -1;
    if (at >= shown) setShown(at + 1);
    requestAnimationFrame(() =>
      listRef.current
        ?.querySelector(`[data-date="${date}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };

  const name = person?.user.name || 'Teammate';
  const firstName = name.split(' ')[0];

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={!!person}
      onClose={onClose}
      PaperProps={{
        className: cn(
          'flex flex-col bg-neutral-50',
          isMobile ? 'h-[88vh] rounded-t-2xl' : 'w-[440px]',
        ),
      }}
    >
      {person && (
        <>
          <header className="border-b border-neutral-200 bg-white px-4 pb-3 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous person"
                  disabled={index === 0}
                  onClick={() => onIndexChange((index ?? 0) - 1)}
                  className="material-symbols-outlined rounded-full p-1 !text-xl text-neutral-600 hover:bg-neutral-100 disabled:opacity-30"
                >
                  chevron_left
                </button>
                <span className="text-xs tabular-nums text-neutral-500">
                  {(index ?? 0) + 1} of {people.length}
                </span>
                <button
                  type="button"
                  aria-label="Next person"
                  disabled={index === people.length - 1}
                  onClick={() => onIndexChange((index ?? 0) + 1)}
                  className="material-symbols-outlined rounded-full p-1 !text-xl text-neutral-600 hover:bg-neutral-100 disabled:opacity-30"
                >
                  chevron_right
                </button>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="material-symbols-outlined rounded-full p-1 !text-xl text-neutral-600 hover:bg-neutral-100"
              >
                close
              </button>
            </div>

            <div className="flex items-center gap-3">
              <UserAvatar src={person.user.avatar} name={name} size={52} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-bold text-neutral-900">
                  {name}
                  {isMe(person.user.id) && (
                    <span className="ml-1.5 text-xs font-normal text-neutral-500">
                      (you)
                    </span>
                  )}
                </h3>
                {(person.user.username || person.user.positionTitle) && (
                  <p className="truncate text-xs text-neutral-500">
                    {[
                      person.user.username && `@${person.user.username}`,
                      person.user.positionTitle,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </div>
              <span className="text-2xl">
                {MEDALS[person.rank - 1] ?? (
                  <span className="text-sm font-semibold text-neutral-500">
                    #{person.rank}
                  </span>
                )}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'points', value: person.points },
                { label: 'days logged', value: person.worklogDays },
                { label: 'tasks done', value: person.tasksDone },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-neutral-50 py-1.5">
                  <dd className="text-base font-bold text-neutral-900">
                    {s.value}
                  </dd>
                  <dt className="text-[10px] uppercase tracking-wider text-neutral-400">
                    {s.label}
                  </dt>
                </div>
              ))}
            </dl>
            {person.buff && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-600">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={person.buff.src} alt="" className="size-5" />
                {person.buff.title} this month
              </p>
            )}

            <div className="mt-3">
              {logs ? (
                <ActivityStrip days={logs} onPick={jumpTo} />
              ) : (
                <div className="h-8 animate-pulse rounded bg-neutral-100" />
              )}
            </div>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {!logs ? (
              [0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl bg-white"
                />
              ))
            ) : logs.length === 0 ? (
              <p className="py-10 text-center text-sm text-neutral-500">
                {firstName} hasn&apos;t written a worklog since{' '}
                {dayjs().subtract(1, 'month').format('MMMM')} began.
              </p>
            ) : (
              <>
                {logs.slice(0, shown).map((log) => (
                  <DayCard key={log.date} day={log} />
                ))}
                {shown < logs.length && (
                  <button
                    type="button"
                    onClick={() => setShown((n) => n + PAGE)}
                    className="w-full rounded-lg border border-neutral-200 bg-white py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                  >
                    Show {Math.min(PAGE, logs.length - shown)} more days
                  </button>
                )}
              </>
            )}
          </div>

          <footer className="border-t border-neutral-200 bg-white p-3">
            <Link
              href={`${APP_ROUTES.user}/${person.user.id}`}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700"
            >
              Open their page
              <span className="material-symbols-outlined !text-base">
                arrow_forward
              </span>
            </Link>
          </footer>
        </>
      )}
    </Drawer>
  );
};
