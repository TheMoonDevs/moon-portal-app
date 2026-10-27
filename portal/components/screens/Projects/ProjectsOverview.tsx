'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  EmptyState,
  Icon,
  Pill,
  type PillTone,
  UserAvatar,
} from '../Admin/shared/AdminUI';
import type { ProjectRow } from '../Admin/Workspace/AdminProjects';
import {
  AvatarStack,
  CompanyMark,
  ProgressBar,
  PROJECT_STATUS_META,
} from '../Admin/Workspace/shared';
import type { Person } from '../Project/types';

type Company = {
  id: string;
  name: string;
  color: string | null;
  logo: string | null;
};

type OverviewProject = ProjectRow & {
  activity: {
    from: string;
    /** Lines written on each of the last 7 days, oldest first. */
    days: number[];
    lines: number;
    done: number;
    /** People who wrote lines this week, most recent first. */
    people: string[];
    lastDate: string | null;
    latest: { text: string; userId: string; date: string; done: boolean }[];
  };
  tasks: { open: number; overdue: number };
  today: { total: number; done: number };
};

type Overview = {
  companies: Company[];
  projects: OverviewProject[];
  users: Person[];
};

/* --------------------------------- helpers -------------------------------- */

const todayIso = () => new Date().toISOString().slice(0, 10);

/** "Today", "Yesterday", "Mon", or "12 Oct" for a YYYY-MM-DD day. */
const dayLabel = (day?: string | null) => {
  if (!day) return '';
  const days = Math.round(
    (Date.parse(todayIso()) - Date.parse(day)) / 86_400_000,
  );
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const date = new Date(`${day}T00:00:00Z`);
  return days < 7
    ? date.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })
    : date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      });
};

const firstName = (name?: string | null) => (name || 'Someone').split(' ')[0];

/** One word on how the project is doing, from what happened this week. */
const pulseOf = (p: OverviewProject): { label: string; tone: PillTone } => {
  if (p.status !== 'ACTIVE')
    return (
      PROJECT_STATUS_META[p.status] ?? { label: p.status, tone: 'neutral' }
    );
  if (p.tasks.overdue)
    return { label: `${p.tasks.overdue} overdue`, tone: 'danger' };
  if (!p.activity.lines) return { label: 'Quiet', tone: 'neutral' };
  return { label: 'Moving', tone: 'positive' };
};

/* ------------------------------- small parts ------------------------------ */

/** Seven bars, one per day, the last one today. */
const WeekBars = ({ days, color }: { days: number[]; color: string }) => {
  const max = Math.max(1, ...days);
  return (
    <div className="flex h-6 items-end gap-[3px]" aria-hidden>
      {days.map((n, i) => (
        <span
          key={i}
          className="w-1.5 rounded-sm"
          style={{
            height: `${n ? Math.max(18, (n / max) * 100) : 12}%`,
            backgroundColor: n ? color : 'rgba(255,255,255,0.08)',
            opacity: n ? 0.45 + (0.55 * (i + 1)) / days.length : 1,
          }}
        />
      ))}
    </div>
  );
};

const Stat = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'danger';
}) => (
  <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
    <p className="truncate text-[11px] font-medium uppercase tracking-wider text-neutral-500">
      {label}
    </p>
    <p
      className={cn(
        'mt-0.5 text-2xl font-semibold',
        tone === 'danger' && value ? 'text-rose-300' : 'text-white',
      )}
    >
      {value}
    </p>
  </div>
);

/* ---------------------------------- card ---------------------------------- */

const ProjectCard = ({
  project,
  company,
  people,
  isMine,
}: {
  project: OverviewProject;
  company?: Company;
  people: Map<string, Person>;
  isMine: boolean;
}) => {
  const color = project.color || '#10b981';
  const pulse = pulseOf(project);
  const { activity, tasks, today } = project;
  const latest = activity.latest[0];
  const writer = latest ? people.get(latest.userId) : null;

  const goal = project.goals?.[0];
  const goalProgress = goal
    ? project.goalProgress?.find((g) => g.goalId === goal.id)
    : null;

  // People who worked on it this week first, then the rest of the team.
  const team = Array.from(
    new Set([
      ...activity.people,
      ...(project.leadIds ?? []),
      ...(project.memberIds ?? []),
    ]),
  )
    .map((id) => people.get(id))
    .filter((p): p is Person => !!p);

  return (
    <Link
      href={`${APP_ROUTES.projects}/${project.id}`}
      className="group flex h-full flex-col gap-4 rounded-2xl border border-white/[0.07] bg-neutral-900/40 p-4 transition-colors hover:border-white/15 hover:bg-neutral-900/80"
    >
      {/* Who and how */}
      <div className="flex items-start gap-3">
        <CompanyMark
          name={project.name}
          color={project.color}
          logo={project.logo}
          size={40}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white">{project.name}</p>
          <p className="flex items-center gap-1.5 text-xs text-neutral-500">
            <span className="truncate">
              {project.description || company?.name}
            </span>
            {isMine && (
              <span className="shrink-0 rounded bg-amber-400/15 px-1 text-[10px] font-semibold text-amber-300">
                You
              </span>
            )}
          </p>
        </div>
        <Pill tone={pulse.tone}>{pulse.label}</Pill>
      </div>

      {/* What happened last */}
      <div className="min-h-[40px] text-sm">
        {latest ? (
          <div className="flex gap-2">
            <UserAvatar
              src={writer?.avatar}
              name={writer?.name}
              size={20}
              className="mt-0.5"
            />
            <p className="line-clamp-2 min-w-0 text-neutral-300">
              <span className="font-medium text-neutral-100">
                {firstName(writer?.name)}
              </span>{' '}
              {latest.text}
              <span className="text-neutral-500">
                {' '}
                · {dayLabel(latest.date)}
              </span>
            </p>
          </div>
        ) : (
          <p className="text-neutral-500">No worklogs this week.</p>
        )}
      </div>

      {/* This week, and the goal */}
      <div className="flex items-end gap-4">
        <div className="flex shrink-0 items-end gap-2.5">
          <WeekBars days={activity.days} color={color} />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">
              {activity.lines}
              <span className="text-xs font-normal text-neutral-500">
                {' '}
                {activity.lines === 1 ? 'line' : 'lines'}
              </span>
            </p>
            <p className="text-[11px] text-neutral-500">this week</p>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          {goal && goalProgress ? (
            <>
              <p className="mb-1 flex justify-between gap-2 text-[11px] text-neutral-400">
                <span className="truncate">{goal.title}</span>
                <span className="shrink-0 text-neutral-300">
                  {goalProgress.done}/{goal.target}
                </span>
              </p>
              <ProgressBar percent={goalProgress.percent} color={color} />
            </>
          ) : (
            <>
              <p className="mb-1 flex justify-between gap-2 text-[11px] text-neutral-400">
                <span>Tasks done</span>
                <span className="text-neutral-300">
                  {project.progress?.percent ?? 0}%
                </span>
              </p>
              <ProgressBar
                percent={project.progress?.percent ?? 0}
                color={color}
              />
            </>
          )}
        </div>
      </div>

      {/* Team and what's left */}
      <div className="mt-auto flex items-center gap-3 border-t border-white/[0.06] pt-3 text-xs text-neutral-400">
        {team.length > 0 ? (
          <AvatarStack users={team} max={4} />
        ) : (
          <span className="text-neutral-600">No team yet</span>
        )}
        <span className="ml-auto flex items-center gap-3">
          {today.total > 0 && (
            <span
              title="Scheduled tasks for today"
              className={cn(
                'flex items-center gap-1',
                today.done === today.total && 'text-emerald-300',
              )}
            >
              <Icon name="event_repeat" className="text-[15px]" />
              {today.done}/{today.total} today
            </span>
          )}
          <span className="flex items-center gap-1">
            <Icon name="radio_button_unchecked" className="text-[14px]" />
            {tasks.open} open
          </span>
        </span>
        <Icon
          name="arrow_forward"
          className="text-[16px] text-neutral-600 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-300"
        />
      </div>
    </Link>
  );
};

/* ---------------------------------- page ---------------------------------- */

/**
 * Every project the user can see, across their companies, each with what is
 * going on in it this week. A card opens the project page.
 */
export const ProjectsOverview = () => {
  const { user } = useUser();
  const [data, setData] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);

  useEffect(() => {
    PortalSdk.getData('/api/projects/overview', null)
      .then((res) => setData(res?.data ?? null))
      .catch(() => setFailed(true));
  }, []);

  const people = useMemo(
    () => new Map((data?.users ?? []).map((u) => [u.id, u])),
    [data],
  );
  const isMine = (p: OverviewProject) =>
    !!user && (p.leadIds?.includes(user.id) || p.memberIds?.includes(user.id));

  const projects = useMemo(() => {
    const rows = (data?.projects ?? []).filter(
      (p) =>
        (!companyId || p.companyId === companyId) && (!onlyMine || isMine(p)),
    );
    // Yours first, then the ones with the latest work.
    return rows.sort(
      (a, b) =>
        Number(isMine(b)) - Number(isMine(a)) ||
        (b.activity.lastDate ?? '').localeCompare(a.activity.lastDate ?? ''),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, companyId, onlyMine, user?.id]);

  // Companies with at least one project, in the order the API gave them.
  const companies = useMemo(
    () =>
      (data?.companies ?? []).filter((c) =>
        data?.projects.some((p) => p.companyId === c.id),
      ),
    [data],
  );
  const companyById = useMemo(
    () => new Map(companies.map((c) => [c.id, c])),
    [companies],
  );
  const groups = companies
    .map((company) => ({
      company,
      projects: projects.filter((p) => p.companyId === company.id),
    }))
    .filter((g) => g.projects.length);

  const totals = useMemo(() => {
    const active = new Set<string>();
    let lines = 0;
    let overdue = 0;
    for (const p of projects) {
      p.activity.people.forEach((id) => active.add(id));
      lines += p.activity.lines;
      overdue += p.tasks.overdue;
    }
    return { active: active.size, lines, overdue };
  }, [projects]);

  return (
    <div className="fixed inset-0 overflow-y-auto bg-neutral-950 pb-[88px] text-neutral-100 md:left-16 md:pb-10">
      <div className="mx-auto max-w-6xl px-4 pt-8 md:px-8 md:pt-12">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Projects
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              What&apos;s happening in every project you&apos;re part of, this
              week.
            </p>
          </div>
        </header>

        {/* Totals */}
        <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          {data ? (
            <>
              <Stat label="Projects" value={projects.length} />
              <Stat label="People working" value={totals.active} />
              <Stat label="Lines this week" value={totals.lines} />
              <Stat
                label="Overdue tasks"
                value={totals.overdue}
                tone="danger"
              />
            </>
          ) : (
            [0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[74px] animate-pulse rounded-2xl bg-white/[0.03]"
              />
            ))
          )}
        </div>

        {/* Filters */}
        {companies.length > 0 && (
          <div className="no-scrollbar -mx-4 mt-6 flex items-center gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
            {[{ id: null, name: 'All' } as const, ...companies].map((c) => (
              <button
                key={c.id ?? 'all'}
                type="button"
                onClick={() => setCompanyId(c.id)}
                className={cn(
                  'flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                  companyId === c.id
                    ? 'border-white bg-white text-neutral-950'
                    : 'border-white/10 text-neutral-300 hover:border-white/25',
                )}
              >
                {'color' in c && (
                  <CompanyMark
                    name={c.name}
                    color={c.color}
                    logo={c.logo}
                    size={16}
                  />
                )}
                {c.name}
              </button>
            ))}
            <span className="mx-1 h-5 w-px shrink-0 bg-white/10" />
            <button
              type="button"
              onClick={() => setOnlyMine((v) => !v)}
              aria-pressed={onlyMine}
              className={cn(
                'flex h-8 shrink-0 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors',
                onlyMine
                  ? 'border-amber-300/40 bg-amber-400/15 text-amber-200'
                  : 'border-white/10 text-neutral-300 hover:border-white/25',
              )}
            >
              <Icon name="person" className="text-[15px]" />
              Mine
            </button>
          </div>
        )}

        {/* Projects by company */}
        {!data && !failed ? (
          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[248px] animate-pulse rounded-2xl bg-white/[0.03]"
              />
            ))}
          </div>
        ) : failed ? (
          <EmptyState
            icon="error"
            title="Couldn't load projects"
            description="Refresh the page to try again."
          />
        ) : !groups.length ? (
          <EmptyState
            icon="folder_open"
            title={
              onlyMine ? "You're not on a project here" : 'No projects yet'
            }
            description={
              onlyMine
                ? 'Turn off "Mine" to see every project.'
                : 'Projects your companies create show up here.'
            }
          />
        ) : (
          groups.map(({ company, projects: rows }) => (
            <section key={company.id} className="mt-8">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-300">
                <CompanyMark
                  name={company.name}
                  color={company.color}
                  logo={company.logo}
                  size={20}
                />
                {company.name}
                <span className="font-normal text-neutral-600">
                  {rows.length}
                </span>
              </h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {rows.map((project, i) => (
                  <motion.div
                    key={project.id}
                    className="min-w-0"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.03 }}
                  >
                    <ProjectCard
                      project={project}
                      company={companyById.get(project.companyId)}
                      people={people}
                      isMine={isMine(project)}
                    />
                  </motion.div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};
