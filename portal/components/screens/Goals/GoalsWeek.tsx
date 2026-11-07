'use client';

import { cn } from '@/lib/utils';
import type { CalendarCompany, GoalDay } from '@/lib/workspace/goalCalendar';
import { isTarget, PERIOD_LABELS } from '@/lib/workspace/projects';

import { Icon } from '../Admin/shared/AdminUI';
import { CompanyMark } from '../Admin/Workspace/shared';
import { type DoneCounts, doneOn, type GoalRow } from './model';
import { card, fmtDay, STATE_META } from './ui';

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
  return (
    <li
      title={`${text} (${wholeText(row)}) · ${meta.label}`}
      className="flex gap-1.5 py-[3px] pl-1"
    >
      <span
        className={cn(
          'mt-[5px] size-[7px] shrink-0 rounded-full',
          meta.dot,
          cell.state === 'planned' && 'opacity-60',
        )}
      />
      <span
        className={cn(
          'min-w-0 flex-1 break-words text-[12px] leading-snug',
          cell.state === 'done'
            ? 'text-neutral-400 auto-light:text-neutral-500'
            : 'text-neutral-100 auto-light:text-neutral-900',
        )}
      >
        {text}
        {cell.due > 1 && (
          <>
            {' '}
            <span className="tabular-nums text-neutral-500">
              {Math.min(cell.done, cell.due)}/{cell.due}
            </span>
          </>
        )}{' '}
        <span className="whitespace-nowrap text-[10px] text-neutral-600 auto-light:text-neutral-400">
          {wholeText(row)}
        </span>
      </span>
    </li>
  );
};

/** Tasks a project finished on a day. */
const DoneBadge = ({ n }: { n: number }) => (
  <span
    title={`${n} task${n === 1 ? '' : 's'} finished that day`}
    className="flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-400/10 px-1.5 text-[10px] font-medium tabular-nums leading-4 text-emerald-300 auto-light:bg-emerald-50 auto-light:text-emerald-700"
  >
    <Icon name="check" className="text-[11px]" />
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
 * goal that day, or with tasks finished on it.
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

/**
 * A week to plan by: a column a day, split by company, then project. Each
 * project says how many of its tasks were finished that day and lists its
 * goals for the day: what is due, the whole target and how it went.
 * Clicking a day or a project opens it in the sidebar. On wide screens the
 * week fills the screen and a long day scrolls inside its column; on
 * phones the days stack.
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
      'grid grid-cols-1 divide-y divide-white/[0.06] overflow-hidden auto-light:divide-black/[0.06] md:h-full md:grid-cols-7 md:divide-x md:divide-y-0 md:[grid-template-rows:minmax(0,1fr)]',
    )}
  >
    {days.map((day) => {
      const companies = groupsOn(rows, day, done);
      const entries = companies.flatMap((c) =>
        c.projects.flatMap((p) => p.entries),
      );
      const finished = companies.reduce(
        (n, c) => n + c.projects.reduce((m, p) => m + p.done, 0),
        0,
      );
      const due = entries.filter((e) => e.cell.due > 0);
      const doneDue = due.filter((e) => e.cell.state === 'done').length;
      const isToday = day === today;
      const isSelected = day === selectedDay;
      const past = day < today;
      return (
        <section
          key={day}
          className={cn(
            'flex min-h-0 min-w-0 flex-col',
            isSelected && 'bg-white/[0.04] auto-light:bg-black/[0.03]',
          )}
        >
          <button
            type="button"
            onClick={() => onSelectDay(day)}
            aria-pressed={isSelected}
            className="flex shrink-0 items-center gap-1.5 border-b border-white/[0.06] px-2.5 py-2 text-left hover:bg-white/[0.03] auto-light:border-black/[0.06] auto-light:hover:bg-black/[0.02]"
          >
            <span
              className={cn(
                'text-[10px] font-semibold uppercase tracking-wider',
                isToday
                  ? 'text-white auto-light:text-neutral-950'
                  : 'text-neutral-500',
              )}
            >
              {fmtDay(day, {
                weekday: 'short',
                day: undefined,
                month: undefined,
              })}
            </span>
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums',
                isToday
                  ? 'bg-white text-neutral-950 auto-light:bg-neutral-900 auto-light:text-white'
                  : 'text-neutral-200 auto-light:text-neutral-800',
              )}
            >
              {Number(day.slice(8, 10))}
            </span>
            <span className="ml-auto flex flex-col items-end text-[10px] tabular-nums leading-tight text-neutral-500">
              <span>
                {!due.length
                  ? ''
                  : past || isToday
                    ? `${doneDue}/${due.length} due`
                    : `${due.length} due`}
              </span>
              {finished > 0 && (
                <span className="text-emerald-300/80 auto-light:text-emerald-700">
                  {finished} done
                </span>
              )}
            </span>
          </button>

          <div
            className={cn(
              'custom-scrollbar flex min-h-0 flex-1 flex-col gap-2 p-1.5 md:overflow-y-auto',
              past && 'opacity-85',
            )}
          >
            {companies.map(({ company, projects }) => (
              <div key={company?.id ?? 'none'} className="flex flex-col">
                {company && (
                  <p className="flex items-center gap-1.5 px-1 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    <CompanyMark
                      name={company.name}
                      color={company.color}
                      logo={company.logo}
                      size={14}
                    />
                    <span className="truncate">{company.name}</span>
                  </p>
                )}
                <div className="flex flex-col gap-1">
                  {projects
                    .filter((p) => p.entries.length)
                    .map((p) => (
                      <div
                        key={p.project.id}
                        className={cn(
                          'rounded-lg border border-transparent bg-white/[0.025] px-1 pb-1 auto-light:bg-black/[0.025]',
                          selectedProject === p.project.id &&
                            'border-white/25 auto-light:border-black/20',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectProject(p.project.id)}
                          title={`Open ${p.project.name}`}
                          className="flex w-full items-center gap-1.5 rounded-md px-1 pb-0.5 pt-1 text-left hover:bg-white/[0.04] auto-light:hover:bg-black/[0.03]"
                        >
                          <span
                            className="h-3 w-[3px] shrink-0 rounded-full"
                            style={{
                              backgroundColor: p.project.color || '#10b981',
                            }}
                          />
                          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-tight text-neutral-300 auto-light:text-neutral-700">
                            {p.project.name}
                          </span>
                          {p.done > 0 && <DoneBadge n={p.done} />}
                        </button>
                        <ul>
                          {p.entries.map((e) => (
                            <GoalLine key={e.row.key} {...e} />
                          ))}
                        </ul>
                      </div>
                    ))}
                  {/* Projects with no goal that day, only finished tasks. */}
                  {projects.some((p) => !p.entries.length) && (
                    <div className="flex flex-wrap gap-1 px-0.5 pt-0.5">
                      {projects
                        .filter((p) => !p.entries.length)
                        .map((p) => (
                          <button
                            key={p.project.id}
                            type="button"
                            onClick={() => onSelectProject(p.project.id)}
                            title={`${p.project.name}: ${p.done} task${p.done === 1 ? '' : 's'} finished, no goal due`}
                            className={cn(
                              'flex min-w-0 max-w-full items-center gap-1 rounded-full border border-transparent bg-white/[0.035] py-0.5 pl-1.5 pr-1 text-[10px] text-neutral-400 hover:bg-white/[0.07] auto-light:bg-black/[0.035] auto-light:text-neutral-600 auto-light:hover:bg-black/[0.06]',
                              selectedProject === p.project.id &&
                                'border-white/25 auto-light:border-black/20',
                            )}
                          >
                            <span
                              className="size-1.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: p.project.color || '#10b981',
                              }}
                            />
                            <span className="min-w-0 truncate">
                              {p.project.name}
                            </span>
                            <DoneBadge n={p.done} />
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {!companies.length && (
              <p className="p-1.5 text-[11px] text-neutral-600 auto-light:text-neutral-400">
                No goals due.
              </p>
            )}
          </div>
        </section>
      );
    })}
  </div>
);
