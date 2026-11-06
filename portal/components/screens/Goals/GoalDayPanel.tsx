'use client';

import Link from 'next/link';

import { cn } from '@/lib/utils';
import type { CalendarTask } from '@/lib/workspace/goalCalendar';
import { isTarget, PERIOD_NOUN } from '@/lib/workspace/projects';
import { APP_ROUTES } from '@/utils/constants/appInfo';

import { Icon, UserAvatar } from '../Admin/shared/AdminUI';
import { CompanyMark } from '../Admin/Workspace/shared';
import { entriesOn } from './GoalsMonth';
import { byProject, type GoalRow } from './model';
import { Bar, card, EffortTag, fmtDay, fmtNum, STATE_META } from './ui';

type Person = { id: string; name?: string | null; avatar?: string | null };

const TASK_ICON: Record<string, { icon: string; className: string }> = {
  DONE: { icon: 'check_circle', className: 'text-emerald-400' },
  IN_PROGRESS: { icon: 'progress_activity', className: 'text-sky-400' },
  IN_REVIEW: { icon: 'rate_review', className: 'text-violet-400' },
  TODO: { icon: 'radio_button_unchecked', className: 'text-neutral-500' },
  IGNORED: { icon: 'redo', className: 'text-rose-400' },
};

const TaskLine = ({
  task,
  people,
}: {
  task: CalendarTask;
  people: Map<string, Person>;
}) => {
  const meta = TASK_ICON[task.status] ?? TASK_ICON.TODO;
  const who = (
    task.completedByIds?.length ? task.completedByIds : (task.assigneeIds ?? [])
  )
    .map((id) => people.get(id))
    .filter((p): p is Person => !!p);
  return (
    <li className="flex items-center gap-2 py-1 text-xs">
      <Icon
        name={task.goalMissed ? 'redo' : meta.icon}
        className={cn('shrink-0 text-[14px]', meta.className)}
      />
      <span
        className={cn(
          'min-w-0 flex-1 truncate',
          task.status === 'DONE'
            ? 'text-neutral-400 auto-light:text-neutral-500'
            : 'text-neutral-200 auto-light:text-neutral-800',
        )}
      >
        {task.title}
        {task.goalMissed && (
          <span className="text-rose-300/80 auto-light:text-rose-600">
            {' '}
            · moved on
          </span>
        )}
      </span>
      <span className="flex shrink-0 -space-x-1.5">
        {who.slice(0, 3).map((p) => (
          <UserAvatar
            key={p.id}
            src={p.avatar}
            name={p.name}
            size={18}
            className="ring-2 ring-neutral-950 auto-light:ring-white"
          />
        ))}
      </span>
    </li>
  );
};

/**
 * One day of the goals calendar: every goal due or worked on that day,
 * grouped by project, with how it went, its tasks and who did them, and
 * how the goal's period around that day stands.
 */
export const GoalDayPanel = ({
  day,
  rows,
  today,
  people,
  onClose,
}: {
  day: string;
  rows: GoalRow[];
  today: string;
  people: Map<string, Person>;
  onClose?: () => void;
}) => {
  const entries = entriesOn(rows, day);
  const groups = byProject(entries.map((e) => e.row));
  const cellOf = (r: GoalRow) => entries.find((e) => e.row.key === r.key)!.cell;
  const due = entries.filter((e) => e.cell.due > 0);
  const done = due.filter((e) => e.cell.state === 'done').length;
  const relative =
    day === today ? 'Today' : day < today ? 'Past day' : 'Coming up';

  return (
    <section className={cn(card, 'flex flex-col')}>
      <header className="flex items-start gap-3 border-b border-white/[0.06] p-4 auto-light:border-black/[0.06]">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            {relative}
          </p>
          <h2 className="text-lg font-semibold text-white auto-light:text-neutral-950">
            {fmtDay(day, { weekday: 'long', month: 'long' })}
          </h2>
          <p className="mt-0.5 text-xs text-neutral-400 auto-light:text-neutral-500">
            {entries.length
              ? `${entries.length} goal${entries.length === 1 ? '' : 's'}${
                  due.length && day <= today
                    ? ` · ${done} of ${due.length} due done`
                    : due.length
                      ? ` · ${due.length} due`
                      : ''
                }`
              : 'No goal is due or was worked on.'}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="Close day"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white auto-light:text-neutral-500 auto-light:hover:bg-black/[0.05]"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        )}
      </header>

      <div className="flex flex-col divide-y divide-white/[0.05] auto-light:divide-black/[0.05]">
        {groups.map(({ project, rows: list }) => (
          <div key={project.id} className="px-4 py-3">
            <Link
              href={`${APP_ROUTES.projects}/${project.id}?view=goals`}
              className="mb-2 flex items-center gap-2"
            >
              <CompanyMark
                name={project.name}
                color={project.color}
                logo={project.logo}
                size={20}
              />
              <span className="truncate text-sm font-semibold text-neutral-100 hover:underline auto-light:text-neutral-900">
                {project.name}
              </span>
              <EffortTag effort={list[0].effort} className="ml-auto" />
            </Link>
            <ul className="flex flex-col gap-2.5">
              {list.map((row) => {
                const cell = cellOf(row);
                const meta = STATE_META[cell.state as keyof typeof STATE_META];
                const target = isTarget(row.goal);
                const period = row.periods.find(
                  (p) => p.from <= day && p.to >= day,
                );
                return (
                  <li
                    key={row.key}
                    className="rounded-xl bg-white/[0.025] p-2.5 auto-light:bg-black/[0.025]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                          meta.pill,
                        )}
                      >
                        <Icon name={meta.icon} className="text-[11px]" />
                        {meta.label}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-neutral-100 auto-light:text-neutral-900">
                        {row.label}
                      </span>
                      {cell.due > 0 && (
                        <span className="shrink-0 text-[11px] tabular-nums text-neutral-500">
                          {Math.min(cell.done, cell.due)}/{cell.due} due
                        </span>
                      )}
                      {cell.added > 0 && (
                        <span className="shrink-0 text-[11px] tabular-nums text-violet-300 auto-light:text-violet-700">
                          +{fmtNum(cell.added)} by hand
                        </span>
                      )}
                    </div>
                    {cell.tasks.length > 0 && (
                      <ul className="mt-1.5">
                        {cell.tasks.map((t) => (
                          <TaskLine key={t.id} task={t} people={people} />
                        ))}
                      </ul>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {target ? (
                        <>
                          <Bar
                            percent={row.goal.progress.percent}
                            color={row.color}
                            className="flex-1"
                          />
                          <span className="shrink-0 text-[11px] tabular-nums text-neutral-500">
                            {fmtNum(row.goal.progress.done)}/
                            {fmtNum(row.goal.progress.target)} in total
                          </span>
                        </>
                      ) : period ? (
                        <>
                          <Bar
                            percent={(period.done / period.target) * 100}
                            color={
                              period.met
                                ? '#34d399'
                                : period.met === false
                                  ? '#fb7185'
                                  : row.color
                            }
                            className="flex-1"
                          />
                          <span className="shrink-0 text-[11px] tabular-nums text-neutral-500">
                            {period.done}/{period.target} that{' '}
                            {PERIOD_NOUN[row.goal.period]}
                            {period.met === true
                              ? ' · met'
                              : period.met === false
                                ? ' · missed'
                                : ''}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};
