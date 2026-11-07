'use client';

import { cn } from '@/lib/utils';
import type { CalendarCompany, GoalDay } from '@/lib/workspace/goalCalendar';
import { isTarget, PERIOD_LABELS } from '@/lib/workspace/projects';

import { Icon } from '../Admin/shared/AdminUI';
import { type DoneCounts, doneOn, type GoalRow } from './model';
import {
  card,
  CompanyDivider,
  fmtDay,
  ProjectLogo,
  rateColor,
  STATE_META,
} from './ui';

type Entry = { row: GoalRow; cell: GoalDay };

/** What a day of a goal asks for: "1 song releases", or its whole number. */
export const dayText = ({ row, cell }: Entry) =>
  !isTarget(row.goal) && cell.due > 0
    ? `${cell.due.toLocaleString('en-US')} ${row.goal.title}`
    : row.label;

/** The goal's whole target: "2 a week", or "target". */
export const wholeText = (row: GoalRow) =>
  isTarget(row.goal)
    ? 'target'
    : `${row.goal.target.toLocaleString('en-US')} ${PERIOD_LABELS[row.goal.period]}`;

/** One goal on a day: what is due, the whole target and how it went. */
const GoalLine = (e: Entry) => {
  const { row, cell } = e;
  const meta = STATE_META[cell.state as keyof typeof STATE_META];
  const text = dayText(e);
  const done = cell.state === 'done' || cell.state === 'reached';
  return (
    <li
      title={`${text} (${wholeText(row)}) · ${meta.label}`}
      className="flex gap-2"
    >
      <span
        className={cn(
          'mt-[6px] size-[6px] shrink-0 rounded-full',
          meta.dot,
          cell.state === 'planned' && 'opacity-60',
        )}
      />
      <span className="min-w-0 flex-1 text-[12px] leading-[18px]">
        <span
          className={cn(
            done
              ? 'text-neutral-500 auto-light:text-neutral-400'
              : 'text-neutral-200 auto-light:text-neutral-800',
          )}
        >
          {text}
        </span>
        {cell.due > 1 && (
          <>
            {' '}
            <span className="tabular-nums text-neutral-500">
              {Math.min(cell.done, cell.due)}/{cell.due}
            </span>
          </>
        )}
      </span>
    </li>
  );
};

/** Tasks a project finished on a day. */
const DoneCount = ({ n }: { n: number }) => (
  <span
    title={`${n} task${n === 1 ? '' : 's'} finished that day`}
    className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium tabular-nums text-emerald-400 auto-light:text-emerald-600"
  >
    <Icon name="check" className="text-[13px]" />
    {n}
  </span>
);

type ProjectGroup = {
  project: GoalRow['project'];
  entries: Entry[];
  done: number;
};

/**
 * A day's projects in row order (effort, company, project): those with a
 * goal that day, or with tasks finished on it, split by company.
 */
function groupsOn(
  rows: GoalRow[],
  day: string,
  done: DoneCounts,
): { company: CalendarCompany | undefined; projects: ProjectGroup[] }[] {
  const projects: ProjectGroup[] = [];
  for (const row of rows) {
    let g = projects.find((p) => p.project.id === row.project.id);
    if (!g) {
      g = {
        project: row.project,
        entries: [],
        done: doneOn(done, row.project.id, day),
      };
      projects.push(g);
    }
    const cell = row.days.get(day);
    if (cell && cell.state !== 'none') g.entries.push({ row, cell });
  }
  const shown = projects.filter((p) => p.entries.length || p.done);
  const companies: {
    company: CalendarCompany | undefined;
    projects: ProjectGroup[];
  }[] = [];
  for (const p of shown) {
    const company = rows.find((r) => r.project.id === p.project.id)?.company;
    let c = companies.find((x) => x.company?.id === company?.id);
    if (!c) {
      c = { company, projects: [] };
      companies.push(c);
    }
    c.projects.push(p);
  }
  return companies;
}

/** The day's head: its date, and how much of what was due got done. */
const DayHead = ({
  day,
  today,
  due,
  doneDue,
  selected,
  onClick,
}: {
  day: string;
  today: string;
  due: number;
  doneDue: number;
  selected: boolean;
  onClick: () => void;
}) => {
  const isToday = day === today;
  const over = day <= today;
  const pct = due ? Math.round((doneDue / due) * 100) : null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="group flex shrink-0 flex-col gap-2 px-2.5 py-3 text-left xl:px-3"
    >
      <span className="flex items-end justify-between gap-2">
        <span className="flex flex-col">
          <span
            className={cn(
              'text-[10px] font-medium uppercase tracking-[0.16em]',
              isToday
                ? 'text-emerald-400 auto-light:text-emerald-600'
                : 'text-neutral-500',
            )}
          >
            {isToday
              ? 'Today'
              : fmtDay(day, {
                  weekday: 'short',
                  day: undefined,
                  month: undefined,
                })}
          </span>
          <span
            className={cn(
              'text-xl font-semibold tabular-nums leading-tight group-hover:underline group-hover:decoration-white/30 group-hover:underline-offset-4 auto-light:group-hover:decoration-black/20',
              isToday || selected
                ? 'text-white auto-light:text-neutral-950'
                : over
                  ? 'text-neutral-400 auto-light:text-neutral-500'
                  : 'text-neutral-200 auto-light:text-neutral-800',
            )}
          >
            {Number(day.slice(8, 10))}
          </span>
        </span>
        <span className="pb-0.5 text-[11px] tabular-nums text-neutral-500">
          {!due ? '' : over ? `${doneDue}/${due}` : `${due} due`}
        </span>
      </span>
      {/* How much of the day's due goals were done; empty ahead of time. */}
      <span className="block h-[3px] overflow-hidden rounded-full bg-white/[0.06] auto-light:bg-black/[0.06]">
        {over && pct != null && (
          <span
            className="block h-full rounded-full"
            style={{
              width: `${Math.max(pct, 4)}%`,
              backgroundColor: rateColor(pct),
            }}
          />
        )}
      </span>
    </button>
  );
};

/**
 * A week to plan by: a column a day, split by company (a quiet, letter-
 * spaced divider), then project, each with its logo, how many of its
 * tasks were finished that day and its goals for the day: what is due,
 * the whole target and how it went. Projects with finished tasks but no
 * goal that day sit as small chips at the end. Today stands out; clicking
 * a day or a project opens it in the sidebar. On wide screens the week
 * fills the screen and a long day scrolls inside its column; on phones
 * the days stack.
 */
export const GoalsWeek = ({
  days,
  rows,
  done,
  today,
  selectedDay,
  selectedProject,
  onSelectDay,
  onSelectProject,
}: {
  /** Monday to Sunday. */
  days: string[];
  rows: GoalRow[];
  done: DoneCounts;
  today: string;
  selectedDay: string | null;
  selectedProject: string | null;
  onSelectDay: (day: string) => void;
  onSelectProject: (projectId: string) => void;
}) => (
  <div
    className={cn(
      card,
      'grid grid-cols-1 divide-y divide-white/[0.05] overflow-hidden auto-light:divide-black/[0.06] md:h-full md:grid-cols-7 md:divide-x md:divide-y-0 md:[grid-template-rows:minmax(0,1fr)]',
    )}
  >
    {days.map((day) => {
      const companies = groupsOn(rows, day, done);
      const entries = companies.flatMap((c) =>
        c.projects.flatMap((p) => p.entries),
      );
      const due = entries.filter((e) => e.cell.due > 0);
      const doneDue = due.filter((e) => e.cell.state === 'done').length;
      const isToday = day === today;
      const isSelected = day === selectedDay;
      return (
        <section
          key={day}
          className={cn(
            'relative flex min-h-0 min-w-0 flex-col',
            isToday && 'bg-white/[0.03] auto-light:bg-emerald-50/40',
            isSelected && 'bg-white/[0.045] auto-light:bg-black/[0.025]',
          )}
        >
          {isToday && (
            <span className="absolute inset-x-0 top-0 h-[2px] bg-emerald-400" />
          )}
          <DayHead
            day={day}
            today={today}
            due={due.length}
            doneDue={doneDue}
            selected={isSelected}
            onClick={() => onSelectDay(day)}
          />

          <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-5 px-2.5 pb-4 pt-1 md:overflow-y-auto xl:px-3">
            {companies.map(({ company, projects }) => {
              const withGoals = projects.filter((p) => p.entries.length);
              const onlyDone = projects.filter((p) => !p.entries.length);
              return (
                <div
                  key={company?.id ?? 'none'}
                  className="flex flex-col gap-3"
                >
                  {company && <CompanyDivider name={company.name} />}
                  {withGoals.map((p) => (
                    <div
                      key={p.project.id}
                      className={cn(
                        '-mx-1.5 rounded-xl px-1.5 py-1 ring-1 ring-inset ring-transparent',
                        selectedProject === p.project.id &&
                          'bg-white/[0.04] ring-white/15 auto-light:bg-black/[0.03] auto-light:ring-black/10',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectProject(p.project.id)}
                        title={`Open ${p.project.name}`}
                        className="group flex w-full items-center gap-2 text-left"
                      >
                        <ProjectLogo project={p.project} size={20} />
                        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-neutral-100 group-hover:underline group-hover:underline-offset-2 auto-light:text-neutral-900">
                          {p.project.name}
                        </span>
                        {p.done > 0 && <DoneCount n={p.done} />}
                      </button>
                      <ul className="mt-1.5 flex flex-col gap-1 pl-7">
                        {p.entries.map((e) => (
                          <GoalLine key={e.row.key} {...e} />
                        ))}
                      </ul>
                    </div>
                  ))}
                  {/* Finished tasks, but no goal due that day. */}
                  {onlyDone.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {onlyDone.map((p) => (
                        <button
                          key={p.project.id}
                          type="button"
                          onClick={() => onSelectProject(p.project.id)}
                          title={`${p.project.name}: ${p.done} task${p.done === 1 ? '' : 's'} finished, no goal due`}
                          className={cn(
                            'flex min-w-0 max-w-full items-center gap-1.5 rounded-full py-[3px] pl-[3px] pr-2 text-[11px] text-neutral-400 ring-1 ring-inset ring-white/[0.07] hover:bg-white/[0.05] hover:text-neutral-200 auto-light:text-neutral-600 auto-light:ring-black/[0.08] auto-light:hover:bg-black/[0.03]',
                            selectedProject === p.project.id &&
                              'bg-white/[0.06] text-neutral-100 ring-white/20 auto-light:bg-black/[0.04] auto-light:ring-black/20',
                          )}
                        >
                          <ProjectLogo project={p.project} size={16} />
                          <span className="min-w-0 truncate">
                            {p.project.name}
                          </span>
                          <DoneCount n={p.done} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {!companies.length && (
              <p className="pt-2 text-[11px] text-neutral-600 auto-light:text-neutral-400">
                Nothing due.
              </p>
            )}
          </div>
        </section>
      );
    })}
  </div>
);
