'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import type { CalendarTask } from '@/lib/workspace/goalCalendar';
import { isTarget, PERIOD_NOUN } from '@/lib/workspace/projects';

import { Icon, UserAvatar } from '../Admin/shared/AdminUI';
import { entriesOn } from './GoalsMonth';
import { doneOn, type GoalRow, type WorkIndex } from './model';
import {
  Bar,
  CompanyDivider,
  EffortTag,
  fmtDay,
  fmtNum,
  ProjectLogo,
  STATE_META,
} from './ui';

export type Person = {
  id: string;
  name?: string | null;
  avatar?: string | null;
};

const TASK_ICON: Record<string, { icon: string; className: string }> = {
  DONE: { icon: 'check_circle', className: 'text-emerald-400' },
  IN_PROGRESS: { icon: 'progress_activity', className: 'text-sky-400' },
  IN_REVIEW: { icon: 'rate_review', className: 'text-violet-400' },
  TODO: { icon: 'radio_button_unchecked', className: 'text-neutral-500' },
  IGNORED: { icon: 'redo', className: 'text-rose-400' },
};

export const TaskLine = ({
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

/** The sidebar's head: a kicker, a title, a line under it and a close. */
export const PanelHead = ({
  kicker,
  title,
  sub,
  lead,
  onClose,
  children,
}: {
  kicker: string;
  title: ReactNode;
  sub?: ReactNode;
  /** Shown before the title, e.g. a project's logo. */
  lead?: ReactNode;
  onClose: () => void;
  children?: ReactNode;
}) => (
  <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-white/[0.06] bg-neutral-950/90 px-5 pb-4 pt-5 backdrop-blur auto-light:border-black/[0.06] auto-light:bg-white/90">
    {lead}
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
        {kicker}
      </p>
      <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-white auto-light:text-neutral-950">
        {title}
      </h2>
      {sub && (
        <p className="mt-1 text-xs text-neutral-400 auto-light:text-neutral-500">
          {sub}
        </p>
      )}
      {children}
    </div>
    <button
      type="button"
      aria-label="Close"
      onClick={onClose}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white auto-light:text-neutral-500 auto-light:hover:bg-black/[0.05] auto-light:hover:text-neutral-950"
    >
      <Icon name="close" className="text-[18px]" />
    </button>
  </header>
);

/** One goal on the day: how it went, its tasks and its period. */
const DayGoal = ({
  row,
  day,
  people,
  onEdit,
}: {
  row: GoalRow;
  day: string;
  people: Map<string, Person>;
  onEdit: (row: GoalRow) => void;
}) => {
  const cell = row.days.get(day)!;
  const meta = STATE_META[cell.state as keyof typeof STATE_META];
  const target = isTarget(row.goal);
  const period = row.periods.find((p) => p.from <= day && p.to >= day);
  return (
    <li className="ml-[34px] rounded-xl bg-white/[0.03] px-3 py-2.5 auto-light:bg-black/[0.025]">
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
        {row.project.canEdit && (
          <button
            type="button"
            onClick={() => onEdit(row)}
            aria-label={`Edit ${row.label}`}
            title="Edit goal"
            className="-my-1 -mr-1.5 flex size-6 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-white/[0.08] hover:text-white auto-light:hover:bg-black/[0.05] auto-light:hover:text-neutral-950"
          >
            <Icon name="edit" className="text-[15px]" />
          </button>
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
              {period.done}/{period.target} that {PERIOD_NOUN[row.goal.period]}
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
};

/**
 * One day of the goals calendar, for the sidebar: split by company, then
 * project, each project with the tasks it finished that day and its goals
 * due or worked on, with how they went, their tasks and who did them, and
 * how the period around the day stands. A project's name opens it.
 */
export const GoalDayPanel = ({
  day,
  rows,
  done,
  today,
  people,
  onClose,
  onOpenProject,
  onEditGoal,
}: {
  day: string;
  rows: GoalRow[];
  done: WorkIndex;
  today: string;
  people: Map<string, Person>;
  onClose: () => void;
  onOpenProject: (projectId: string) => void;
  onEditGoal: (row: GoalRow) => void;
}) => {
  const entries = entriesOn(rows, day);
  const due = entries.filter((e) => e.cell.due > 0);
  const doneDue = due.filter((e) => e.cell.state === 'done').length;
  const relative =
    day === today ? 'Today' : day < today ? 'Past day' : 'Coming up';

  // Projects in row order with a goal that day or tasks finished on it.
  const projects: {
    row: GoalRow;
    goals: GoalRow[];
    done: number;
  }[] = [];
  for (const row of rows) {
    let p = projects.find((x) => x.row.project.id === row.project.id);
    if (!p) {
      p = { row, goals: [], done: doneOn(done, row.project.id, day) };
      projects.push(p);
    }
    if (entries.some((e) => e.row.key === row.key)) p.goals.push(row);
  }
  const shown = projects.filter((p) => p.goals.length || p.done);
  const companies = Array.from(
    new Set(shown.map((p) => p.row.company?.id ?? '')),
  ).map((id) => ({
    company: shown.find((p) => (p.row.company?.id ?? '') === id)!.row.company,
    projects: shown.filter((p) => (p.row.company?.id ?? '') === id),
  }));
  const finished = shown.reduce((n, p) => n + p.done, 0);

  return (
    <div className="flex flex-col">
      <PanelHead
        kicker={relative}
        title={fmtDay(day, { weekday: 'long', month: 'long' })}
        onClose={onClose}
        sub={
          [
            entries.length &&
              `${entries.length} goal${entries.length === 1 ? '' : 's'}`,
            due.length &&
              (day <= today
                ? `${doneDue} of ${due.length} due done`
                : `${due.length} due`),
            finished && `${finished} task${finished === 1 ? '' : 's'} finished`,
          ]
            .filter(Boolean)
            .join(' · ') || 'No goal is due or was worked on.'
        }
      />
      <div className="flex flex-col gap-7 px-5 pb-6 pt-5">
        {companies.map(({ company, projects: list }) => (
          <section key={company?.id ?? 'none'} className="flex flex-col gap-4">
            {company && <CompanyDivider name={company.name} />}
            {list.map(({ row, goals, done: n }) => (
              <div key={row.project.id} className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onOpenProject(row.project.id)}
                  className="group flex w-full items-center gap-2.5 text-left"
                >
                  <ProjectLogo project={row.project} size={24} />
                  <span className="min-w-0 truncate text-sm font-medium text-neutral-100 group-hover:underline group-hover:underline-offset-2 auto-light:text-neutral-900">
                    {row.project.name}
                  </span>
                  {n > 0 && (
                    <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium tabular-nums text-emerald-400 auto-light:text-emerald-600">
                      <Icon name="check" className="text-[13px]" />
                      {n} done
                    </span>
                  )}
                  <EffortTag effort={row.effort} className="ml-auto" />
                </button>
                {goals.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {goals.map((g) => (
                      <DayGoal
                        key={g.key}
                        row={g}
                        day={day}
                        people={people}
                        onEdit={onEditGoal}
                      />
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
};
