'use client';

import { cn } from '@/lib/utils';
import {
  type CalendarCompany,
  GOAL_STATUS,
  type GoalDay,
  type WorkTask,
} from '@/lib/workspace/goalCalendar';
import { isTarget, PERIOD_LABELS } from '@/lib/workspace/projects';

import { Icon, UserAvatar } from '../Admin/shared/AdminUI';
import { Tip, TipTitle } from '../Projects/Tip';
import type { Person } from './GoalDayPanel';
import { type DayWork, type GoalRow, type WorkIndex, workOn } from './model';
import {
  card,
  CompanyDivider,
  EffortTag,
  fmtDay,
  fmtNum,
  ProjectLogo,
  rateColor,
  STATE_META,
} from './ui';

type Entry = { row: GoalRow; cell: GoalDay };

/**
 * What a day of a goal asks for: "1 song releases" on its days. A repeating
 * goal's whole number ("3 shorts" a week) is never put on one day, where it
 * would read as 3 that day; a target shows its number.
 */
export const dayText = ({ row, cell }: Entry) =>
  isTarget(row.goal)
    ? row.label
    : cell.due > 0
      ? `${cell.due.toLocaleString('en-US')} ${row.goal.title}`
      : row.goal.title;

/** The goal's whole target: "2 a week", or "target". */
export const wholeText = (row: GoalRow) =>
  isTarget(row.goal)
    ? 'target'
    : `${row.goal.target.toLocaleString('en-US')} ${PERIOD_LABELS[row.goal.period]}`;

/* --------------------------------- pieces --------------------------------- */

/** One goal on a day: what is due and how it went. Clicking edits it. */
const GoalLine = ({
  entry,
  onClick,
}: {
  entry: Entry;
  onClick: (row: GoalRow) => void;
}) => {
  const { row, cell } = entry;
  const meta = STATE_META[cell.state as keyof typeof STATE_META];
  const text = dayText(entry);
  const done = cell.state === 'done' || cell.state === 'reached';
  return (
    <li>
      <button
        type="button"
        onClick={() => onClick(row)}
        title={`${text} (${wholeText(row)}) · ${meta.label}${row.project.canEdit ? ' · click to edit' : ''}`}
        className="-mx-1 flex w-[calc(100%+0.5rem)] gap-2 rounded-md px-1 py-0.5 text-left hover:bg-white/[0.05] auto-light:hover:bg-black/[0.04]"
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
      </button>
    </li>
  );
};

const STATUS_WORD: Record<string, string> = {
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'In review',
};

/** The tasks behind a badge, listed in its hover card. */
const TaskTip = ({
  title,
  tasks,
  people,
  open,
}: {
  title: string;
  tasks: WorkTask[];
  people: Map<string, Person>;
  open?: boolean;
}) => (
  <div className="w-[248px]">
    <TipTitle>{title}</TipTitle>
    <ul className="flex flex-col gap-1.5">
      {tasks.slice(0, 10).map((t) => {
        const who = t.people
          .map((id) => people.get(id))
          .filter((p): p is Person => !!p);
        return (
          <li key={t.id} className="flex items-center gap-2">
            <Icon
              name={open ? 'radio_button_unchecked' : 'check_circle'}
              className={cn(
                'shrink-0 text-[13px]',
                open ? 'text-amber-300' : 'text-emerald-400',
              )}
            />
            <span className="min-w-0 flex-1 truncate text-neutral-200">
              {t.title}
            </span>
            {open && STATUS_WORD[t.status] && (
              <span className="shrink-0 text-[10px] text-neutral-500">
                {STATUS_WORD[t.status]}
              </span>
            )}
            <span className="flex shrink-0 -space-x-1">
              {who.slice(0, 2).map((p) => (
                <UserAvatar
                  key={p.id}
                  src={p.avatar}
                  name={p.name}
                  size={16}
                  className="ring-1 ring-neutral-900"
                />
              ))}
            </span>
          </li>
        );
      })}
      {tasks.length > 10 && (
        <li className="text-neutral-500">+{tasks.length - 10} more</li>
      )}
    </ul>
  </div>
);

/**
 * A project's tasks on a day as two quiet badges: finished (a check, green)
 * and still open (a dot, amber; rose once the day has gone by). Hovering
 * either lists its tasks.
 */
const WorkBadges = ({
  work,
  day,
  today,
  people,
  hover = true,
}: {
  work: DayWork;
  day: string;
  today: string;
  people: Map<string, Person>;
  hover?: boolean;
}) => {
  if (!work.done.length && !work.open.length) return null;
  const late = day < today;
  const done = work.done.length > 0 && (
    <span className="flex cursor-default items-center gap-0.5 rounded-full bg-emerald-400/[0.08] px-1.5 py-px text-[11px] font-medium tabular-nums text-emerald-400 auto-light:bg-emerald-50 auto-light:text-emerald-700">
      <Icon name="check" className="text-[12px]" />
      {work.done.length}
    </span>
  );
  const open = work.open.length > 0 && (
    <span
      className={cn(
        'flex cursor-default items-center gap-1 rounded-full px-1.5 py-px text-[11px] font-medium tabular-nums',
        late
          ? 'bg-rose-400/[0.08] text-rose-300 auto-light:bg-rose-50 auto-light:text-rose-700'
          : 'bg-amber-300/[0.08] text-amber-200 auto-light:bg-amber-50 auto-light:text-amber-800',
      )}
    >
      <span
        className={cn(
          'size-[5px] rounded-full',
          late ? 'bg-rose-400' : 'bg-amber-300',
        )}
      />
      {work.open.length}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-1">
      {done &&
        (hover ? (
          <Tip
            content={
              <TaskTip
                title={`${work.done.length} finished`}
                tasks={work.done}
                people={people}
              />
            }
          >
            {done}
          </Tip>
        ) : (
          done
        ))}
      {open &&
        (hover ? (
          <Tip
            content={
              <TaskTip
                title={`${work.open.length} ${late ? 'still open, past their day' : 'still to do'}`}
                tasks={work.open}
                people={people}
                open
              />
            }
          >
            {open}
          </Tip>
        ) : (
          open
        ))}
    </div>
  );
};

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
      className="group flex w-full flex-col gap-2 p-3 text-left"
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

/* --------------------------------- model ---------------------------------- */

type ProjectWeek = {
  project: GoalRow['project'];
  company: CalendarCompany | undefined;
  goals: GoalRow[];
  /** Per day: its goals then, and its tasks. */
  days: { day: string; entries: Entry[]; work: DayWork }[];
};

/**
 * The week by company, then project, in row order (effort, company,
 * project): projects with a goal on some day of it, or tasks finished or
 * still open on one.
 */
function weekOf(rows: GoalRow[], days: string[], work: WorkIndex) {
  const projects: ProjectWeek[] = [];
  for (const row of rows) {
    let p = projects.find((x) => x.project.id === row.project.id);
    if (!p) {
      p = {
        project: row.project,
        company: row.company,
        goals: [],
        days: days.map((day) => ({
          day,
          entries: [],
          work: workOn(work, row.project.id, day),
        })),
      };
      projects.push(p);
    }
    p.goals.push(row);
    p.days.forEach((d) => {
      const cell = row.days.get(d.day);
      if (cell && cell.state !== 'none') d.entries.push({ row, cell });
    });
  }
  const shown = projects.filter((p) =>
    p.days.some(
      (d) => d.entries.length || d.work.done.length || d.work.open.length,
    ),
  );
  const companies: {
    company: CalendarCompany | undefined;
    projects: ProjectWeek[];
  }[] = [];
  for (const p of shown) {
    let c = companies.find((x) => x.company?.id === p.company?.id);
    if (!c) {
      c = { company: p.company, projects: [] };
      companies.push(c);
    }
    c.projects.push(p);
  }
  return companies;
}

/** Each day's due goals: how many there were, and how many got done. */
const dayTotals = (rows: GoalRow[], day: string) => {
  let due = 0;
  let done = 0;
  for (const r of rows) {
    const c = r.days.get(day);
    if (!c || c.due <= 0) continue;
    due += 1;
    if (c.state === 'done') done += 1;
  }
  return { due, done };
};

/* ------------------------------- the project ------------------------------ */

/** What a project's logo shows on hover: its goals and its week. */
const ProjectCard = ({ week }: { week: ProjectWeek }) => {
  const done = week.days.reduce((n, d) => n + d.work.done.length, 0);
  const open = week.days.reduce((n, d) => n + d.work.open.length, 0);
  return (
    <div className="w-[256px]">
      <div className="flex items-center gap-2">
        <ProjectLogo project={week.project} size={22} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white">
            {week.project.name}
          </p>
          {week.company && (
            <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              {week.company.name}
            </p>
          )}
        </div>
        <EffortTag effort={week.goals[0].effort} />
      </div>
      <ul className="mt-2.5 flex flex-col gap-1.5 border-t border-white/[0.08] pt-2.5">
        {week.goals.map((r) => {
          const p = r.goal.progress;
          return (
            <li key={r.key} className="flex items-center gap-2">
              <span
                className={cn(
                  'size-1.5 shrink-0 rounded-full',
                  GOAL_STATUS[r.status].dot,
                )}
              />
              <span className="min-w-0 flex-1 truncate text-neutral-200">
                {r.label}
              </span>
              <span className="shrink-0 tabular-nums text-neutral-500">
                {fmtNum(p.done)}/{fmtNum(p.target)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2.5 flex items-center gap-3 border-t border-white/[0.08] pt-2 text-[11px] text-neutral-400">
        <span className="flex items-center gap-1">
          <Icon name="check" className="text-[12px] text-emerald-400" />
          {done} done this week
        </span>
        {open > 0 && (
          <span className="flex items-center gap-1">
            <span className="size-[5px] rounded-full bg-amber-300" />
            {open} open
          </span>
        )}
      </p>
      <p className="mt-1 text-[10px] text-neutral-500">Click to open it.</p>
    </div>
  );
};

/* ---------------------------------- week ---------------------------------- */

const COLS = 'grid grid-cols-[60px_repeat(7,minmax(0,1fr))]';

/**
 * A week to plan by, as a grid: a column a day and a row a project, split
 * by company (a quiet, letter-spaced divider). A row starts with the
 * project's logo, which shows its goals and week on hover. Each day of a
 * row lists the project's goals for that day (what is due and how it
 * went; clicking one edits it) and its tasks, finished and still open,
 * each listed on hover. Rows have no borders; the space between them
 * keeps them apart. Today stands out; clicking a day or a logo opens it in
 * the sidebar. On wide screens the week fills the screen and scrolls
 * inside itself; on phones each day is a list of its own.
 */
export const GoalsWeek = ({
  days,
  rows,
  work,
  today,
  people,
  selectedDay,
  selectedProject,
  onSelectDay,
  onSelectProject,
  onGoal,
}: {
  /** Monday to Sunday. */
  days: string[];
  rows: GoalRow[];
  work: WorkIndex;
  today: string;
  people: Map<string, Person>;
  selectedDay: string | null;
  selectedProject: string | null;
  onSelectDay: (day: string) => void;
  onSelectProject: (projectId: string) => void;
  /** A goal was clicked: to edit it. */
  onGoal: (row: GoalRow) => void;
}) => {
  const companies = weekOf(rows, days, work);
  const totals = days.map((d) => dayTotals(rows, d));
  const tint = (day: string) =>
    day === selectedDay
      ? 'bg-white/[0.045] auto-light:bg-black/[0.03]'
      : day === today
        ? 'bg-white/[0.025] auto-light:bg-emerald-50/50'
        : '';

  return (
    <>
      {/* Wide screens: the grid. */}
      <div
        className={cn(
          card,
          'hidden flex-col overflow-hidden md:flex md:h-full',
        )}
      >
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
          <div
            className={cn(
              COLS,
              'sticky top-0 z-10 border-b border-white/[0.06] bg-neutral-950/95 backdrop-blur auto-light:border-black/[0.06] auto-light:bg-white/95',
            )}
          >
            <div />
            {days.map((day, i) => (
              <div
                key={day}
                className={cn(
                  'relative border-l border-white/[0.05] auto-light:border-black/[0.06]',
                  tint(day),
                )}
              >
                {day === today && (
                  <span className="absolute inset-x-0 top-0 h-[2px] bg-emerald-400" />
                )}
                <DayHead
                  day={day}
                  today={today}
                  due={totals[i].due}
                  doneDue={totals[i].done}
                  selected={day === selectedDay}
                  onClick={() => onSelectDay(day)}
                />
              </div>
            ))}
          </div>

          {companies.map(({ company, projects }) => (
            <section key={company?.id ?? 'none'}>
              {company && (
                <CompanyDivider
                  name={company.name}
                  className="px-4 pb-1 pt-5"
                />
              )}
              {projects.map((week) => {
                const selected = week.project.id === selectedProject;
                return (
                  <div key={week.project.id} className={cn(COLS, 'group/row')}>
                    <div className="flex justify-center pb-3 pt-3.5">
                      <Tip side="right" content={<ProjectCard week={week} />}>
                        <button
                          type="button"
                          onClick={() => onSelectProject(week.project.id)}
                          aria-label={week.project.name}
                          aria-pressed={selected}
                          className={cn(
                            'h-fit rounded-[10px] ring-2 ring-transparent ring-offset-2 ring-offset-neutral-950 transition-shadow hover:ring-white/30 auto-light:ring-offset-white auto-light:hover:ring-black/20',
                            selected &&
                              'ring-white/60 auto-light:ring-black/40',
                          )}
                        >
                          <ProjectLogo project={week.project} size={30} />
                        </button>
                      </Tip>
                    </div>
                    {week.days.map(({ day, entries, work: w }) => (
                      <div
                        key={day}
                        className={cn(
                          'flex min-w-0 flex-col gap-1.5 border-l border-white/[0.05] px-2.5 py-3 transition-colors auto-light:border-black/[0.06]',
                          tint(day),
                          selected
                            ? 'bg-white/[0.035] auto-light:bg-black/[0.025]'
                            : 'group-hover/row:bg-white/[0.015] auto-light:group-hover/row:bg-black/[0.012]',
                        )}
                      >
                        {entries.length > 0 && (
                          <ul className="flex flex-col gap-0.5">
                            {entries.map((e) => (
                              <GoalLine
                                key={e.row.key}
                                entry={e}
                                onClick={onGoal}
                              />
                            ))}
                          </ul>
                        )}
                        <WorkBadges
                          work={w}
                          day={day}
                          today={today}
                          people={people}
                        />
                      </div>
                    ))}
                  </div>
                );
              })}
            </section>
          ))}
          {!companies.length && (
            <p className="p-6 text-sm text-neutral-500">
              Nothing due and no tasks this week.
            </p>
          )}
        </div>
      </div>

      {/* Phones: a list a day. */}
      <div
        className={cn(
          card,
          'divide-y divide-white/[0.05] overflow-hidden auto-light:divide-black/[0.06] md:hidden',
        )}
      >
        {days.map((day, i) => {
          const list = companies
            .map((c) => ({
              company: c.company,
              projects: c.projects
                .map((p) => ({ p, d: p.days[i] }))
                .filter(
                  ({ d }) =>
                    d.entries.length ||
                    d.work.done.length ||
                    d.work.open.length,
                ),
            }))
            .filter((c) => c.projects.length);
          return (
            <section key={day} className={cn('relative', tint(day))}>
              {day === today && (
                <span className="absolute inset-x-0 top-0 h-[2px] bg-emerald-400" />
              )}
              <DayHead
                day={day}
                today={today}
                due={totals[i].due}
                doneDue={totals[i].done}
                selected={day === selectedDay}
                onClick={() => onSelectDay(day)}
              />
              <div className="flex flex-col gap-5 px-3 pb-4 pt-1">
                {list.map(({ company, projects }) => (
                  <div
                    key={company?.id ?? 'none'}
                    className="flex flex-col gap-3"
                  >
                    {company && <CompanyDivider name={company.name} />}
                    {projects.map(({ p, d }) => (
                      <div key={p.project.id}>
                        <button
                          type="button"
                          onClick={() => onSelectProject(p.project.id)}
                          className="flex w-full items-center gap-2 text-left"
                        >
                          <ProjectLogo project={p.project} size={20} />
                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-neutral-100 auto-light:text-neutral-900">
                            {p.project.name}
                          </span>
                          <WorkBadges
                            work={d.work}
                            day={day}
                            today={today}
                            people={people}
                            hover={false}
                          />
                        </button>
                        {d.entries.length > 0 && (
                          <ul className="mt-1.5 flex flex-col gap-0.5 pl-7">
                            {d.entries.map((e) => (
                              <GoalLine
                                key={e.row.key}
                                entry={e}
                                onClick={onGoal}
                              />
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                {!list.length && (
                  <p className="text-[11px] text-neutral-600 auto-light:text-neutral-400">
                    Nothing due.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
};
