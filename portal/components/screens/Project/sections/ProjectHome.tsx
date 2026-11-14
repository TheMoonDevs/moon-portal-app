'use client';

import type { ProjectPage, Task } from '@db/client';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { APP_ROUTES } from '@/utils/constants/appInfo';

import { Icon, UserAvatar } from '../../Admin/shared/AdminUI';
import type { ProjectRow } from '../../Admin/Workspace/AdminProjects';
import { docText, type Person, type ProjectData, type ViewKey } from '../types';
import {
  ProjectTasks,
  type TaskPointsData,
  useTaskLayout,
} from './ProjectTasks';

const OPEN = ['TODO', 'IN_PROGRESS', 'IN_REVIEW'];

const PERIOD_NOW: Record<string, string> = {
  day: 'today',
  week: 'this week',
  fortnight: 'these 2 weeks',
  month: 'this month',
  quarter: 'this quarter',
};

const fmt = (n: number) => n.toLocaleString('en-US');

/** Each goal with this period's progress. */
export const goalBars = (project: ProjectRow) =>
  (project.goals ?? []).map((goal) => {
    const progress = project.goalProgress?.find((g) => g.goalId === goal.id);
    const done = progress?.done ?? 0;
    const target = progress?.target ?? goal.target ?? 0;
    const isTarget = goal.kind === 'target';
    return {
      id: goal.id,
      title: goal.title,
      done,
      target,
      when: isTarget ? 'in total' : (PERIOD_NOW[goal.period] ?? ''),
      percent: target ? Math.min(100, Math.round((done / target) * 100)) : 0,
      met:
        (target > 0 && done >= target) ||
        (isTarget && !!(goal as { achievedAt?: unknown }).achievedAt),
    };
  });

/* --------------------------------- pieces --------------------------------- */

const Tile = ({
  label,
  value,
  hint,
  tone,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: string;
  onClick?: () => void;
}) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={hint}
      className={cn(
        'min-w-0 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-left',
        onClick && 'transition-colors hover:border-white/[0.14]',
      )}
    >
      <p className="truncate text-[11px] font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-2xl font-semibold tabular-nums text-white',
          tone,
        )}
      >
        {value}
      </p>
    </Tag>
  );
};

const Card = ({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <section
    className={cn(
      'flex min-w-0 flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4',
      className,
    )}
  >
    <header className="mb-3 flex items-center gap-2">
      <h3 className="flex-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {title}
      </h3>
      {action}
    </header>
    {children}
  </section>
);

const CardLink = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-0.5 text-xs text-neutral-400 hover:text-white"
  >
    {children}
    <Icon name="chevron_right" className="text-[15px]" />
  </button>
);

const dayLabel = (date: string) => {
  const d = dayjs(date);
  if (d.isSame(dayjs(), 'day')) return 'Today';
  if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Yesterday';
  return d.format('D MMM');
};

/* ---------------------------------- home ---------------------------------- */

/**
 * A project's Home: a quick read of how it is going. Four numbers, then its
 * goals, team and what it is for, then its tasks in the view the person
 * likes (board, list, timeline or people), then the latest work logged.
 */
export const ProjectHome = ({
  data,
  objective,
  companyUsers,
  canEdit,
  canAdd,
  canTick,
  canDelete,
  onSaved,
  onOpen,
}: {
  data: ProjectData;
  objective: ProjectPage | null;
  companyUsers: Person[];
  canEdit: boolean;
  canAdd: boolean;
  canTick: boolean;
  canDelete: boolean;
  onSaved: () => void;
  onOpen: (view: ViewKey) => void;
}) => {
  const { project, tasks, people } = data;
  const [layout, setLayout] = useTaskLayout();
  const [points, setPoints] = useState<TaskPointsData | null>(null);

  const live = useMemo(
    () => tasks.filter((t) => t.status !== 'ARCHIVED' && !t.mergedInto),
    [tasks],
  );
  const today = dayjs().format('YYYY-MM-DD');
  const dayOf = (t: Task) =>
    t.forDate ?? (t.dueDate ? String(t.dueDate).slice(0, 10) : null);
  const open = live.filter((t) => OPEN.includes(t.status));
  const overdue = open.filter((t) => (dayOf(t) ?? '9999') < today);
  const weekAgo = dayjs().subtract(7, 'day');
  const doneWeek = live.filter(
    (t) =>
      t.status === 'DONE' &&
      t.completedAt &&
      dayjs(t.completedAt as unknown as string).isAfter(weekAgo),
  );
  const goals = goalBars(project);
  const met = goals.filter((g) => g.met).length;

  const leads = new Set(project.leadIds ?? []);
  const team = [...people].sort(
    (a, b) => Number(leads.has(b.id)) - Number(leads.has(a.id)),
  );
  const subs = (data.tree ?? []).filter((p) => p.parentId === project.id);
  const about =
    (objective?.content ? docText(objective.content, 220) : '') ||
    project.description ||
    '';

  const recent = useMemo(() => {
    if (!points) return null;
    const users = new Map(points.users.map((u) => [u.id, u]));
    const titles = new Map(tasks.map((t) => [t.id, t.title]));
    return [...points.points]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 5)
      .map((p) => ({
        ...p,
        who: users.get(p.userId) ?? people.find((x) => x.id === p.userId),
        task: titles.get(p.taskId),
      }));
  }, [points, tasks, people]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-24 pt-5 md:px-8"
    >
      {/* The pulse: four numbers */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Open" value={open.length} hint="Tasks still to finish" />
        <Tile
          label="Done this week"
          value={doneWeek.length}
          tone={doneWeek.length ? 'text-emerald-300' : undefined}
          hint="Tasks finished in the last 7 days"
        />
        <Tile
          label="Overdue"
          value={overdue.length}
          tone={overdue.length ? 'text-rose-300' : undefined}
          hint="Open tasks whose day has passed"
          onClick={overdue.length ? () => setLayout('list') : undefined}
        />
        <Tile
          label="Goals met"
          value={
            goals.length ? (
              <>
                {met}
                <span className="text-base font-medium text-neutral-500">
                  {' '}
                  of {goals.length}
                </span>
              </>
            ) : (
              <span className="text-neutral-600">–</span>
            )
          }
          hint="Goals that reached their target this period"
          onClick={() => onOpen('goals')}
        />
      </div>

      {/* Goals, team, about */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card
          title="Goals"
          action={
            <CardLink onClick={() => onOpen('goals')}>
              {goals.length ? 'All' : 'Set one'}
            </CardLink>
          }
        >
          {goals.length ? (
            <ul className="flex flex-col gap-2.5">
              {goals.slice(0, 4).map((g) => (
                <li key={g.id} className="min-w-0">
                  <p className="flex items-baseline gap-2 text-xs">
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate',
                        g.met ? 'text-emerald-300' : 'text-neutral-200',
                      )}
                    >
                      {g.met && (
                        <Icon
                          name="check"
                          className="mr-1 align-[-2px] text-[13px]"
                        />
                      )}
                      {g.title}
                    </span>
                    <span className="shrink-0 tabular-nums text-neutral-500">
                      {fmt(g.done)}/{fmt(g.target)} {g.when}
                    </span>
                  </p>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      className={cn(
                        'h-full rounded-full',
                        g.met ? 'bg-emerald-400' : '',
                      )}
                      style={
                        g.met
                          ? undefined
                          : { backgroundColor: project.color || '#38bdf8' }
                      }
                      initial={{ width: 0 }}
                      animate={{ width: `${g.percent}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </li>
              ))}
              {goals.length > 4 && (
                <li className="text-[11px] text-neutral-500">
                  +{goals.length - 4} more
                </li>
              )}
            </ul>
          ) : (
            <p className="text-xs text-neutral-500">
              No goals yet. A goal says what this project should get done each
              week, or a number to reach.
            </p>
          )}
        </Card>

        <Card
          title={`Team · ${team.length}`}
          action={
            <CardLink onClick={() => onOpen('members')}>
              {canEdit ? 'Manage' : 'See all'}
            </CardLink>
          }
        >
          {team.length ? (
            <ul className="flex flex-col gap-2">
              {team.slice(0, 5).map((p) => {
                const mine = open.filter((t) =>
                  (t.assigneeIds ?? []).includes(p.id),
                ).length;
                return (
                  <li key={p.id} className="flex items-center gap-2.5">
                    <UserAvatar src={p.avatar} name={p.name} size={26} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-neutral-100">
                        {p.name}
                      </p>
                      <p className="truncate text-[11px] text-neutral-500">
                        {leads.has(p.id) ? 'Lead' : p.positionTitle || 'Member'}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-neutral-500">
                      {mine} open
                    </span>
                  </li>
                );
              })}
              {team.length > 5 && (
                <li className="text-[11px] text-neutral-500">
                  +{team.length - 5} more
                </li>
              )}
            </ul>
          ) : (
            <p className="text-xs text-neutral-500">Nobody on the team yet.</p>
          )}
        </Card>

        <Card
          title="About"
          action={
            <CardLink onClick={() => onOpen('objective')}>Objective</CardLink>
          }
        >
          {about ? (
            <p className="line-clamp-5 text-sm leading-relaxed text-neutral-300">
              {about}
            </p>
          ) : (
            <p className="text-xs text-neutral-500">
              {canEdit
                ? 'Write why this project exists and what done looks like.'
                : 'No objective written yet.'}
            </p>
          )}
          {subs.length > 0 && (
            <div className="mt-auto pt-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                Sub-projects
              </p>
              <div className="flex flex-wrap gap-1.5">
                {subs.map((s) => (
                  <Link
                    key={s.id}
                    href={`${APP_ROUTES.projects}/${s.id}`}
                    className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-xs text-neutral-300 transition-colors hover:bg-white/[0.1] hover:text-white"
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: s.color || '#737373' }}
                    />
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Tasks, in the view the person picks */}
      <section className="min-w-0">
        <h2 className="mb-3 text-lg font-semibold text-white">Tasks</h2>
        <ProjectTasks
          projectId={project.id}
          tasks={tasks}
          people={people}
          companyUsers={companyUsers}
          canAdd={canAdd}
          canTick={canTick}
          canDelete={canDelete}
          onSaved={onSaved}
          layout={layout}
          onLayout={setLayout}
          onPoints={setPoints}
        />
      </section>

      {/* The latest work */}
      <Card
        title="Recent activity"
        action={<CardLink onClick={() => onOpen('logs')}>All logs</CardLink>}
      >
        {!recent ? (
          <p className="text-xs text-neutral-600">Loading…</p>
        ) : recent.length ? (
          <ul className="flex flex-col gap-2.5">
            {recent.map((p) => (
              <li key={p.id} className="flex items-start gap-2.5">
                <UserAvatar src={p.who?.avatar} name={p.who?.name} size={22} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-neutral-200">
                    <span className="font-medium text-white">
                      {p.who?.name?.split(' ')[0] ?? 'Someone'}
                    </span>{' '}
                    {p.text || (p.status === 'done' ? 'finished' : 'worked on')}
                    {p.task && (
                      <span className="text-neutral-500"> · {p.task}</span>
                    )}
                  </p>
                  <p className="text-[11px] text-neutral-600">
                    {dayLabel(p.date)} {dayjs(p.at).format('h:mm A')}
                    {p.by !== 'person' && ` · via ${p.by}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-neutral-500">Nothing logged yet.</p>
        )}
      </Card>
    </motion.div>
  );
};
