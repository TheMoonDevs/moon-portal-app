'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { EmptyState, Icon } from '../Admin/shared/AdminUI';
import type { ProjectRow } from '../Admin/Workspace/AdminProjects';
import { AvatarStack, CompanyMark } from '../Admin/Workspace/shared';
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
    /** Lines logged on each of the last 7 days, oldest first. */
    days: number[];
    /** People who logged work this week, most recent first. */
    people: string[];
    lastDate: string | null;
  };
  tasks: { open: number; overdue: number };
  today: { total: number; done: number };
};

type Overview = {
  companies: Company[];
  projects: OverviewProject[];
  users: Person[];
};

// Kept between visits, so coming back from a project shows the page at once.
let cached: Overview | null = null;

/* --------------------------------- status --------------------------------- */

const PULSES = {
  moving: { label: 'Moving', dot: 'bg-emerald-400' },
  quiet: { label: 'Quiet', dot: 'bg-amber-300' },
  attention: { label: 'Needs a look', dot: 'bg-rose-400' },
  paused: { label: 'Paused', dot: 'bg-neutral-500' },
} as const;

type Pulse = keyof typeof PULSES;

/** How the project is doing: overdue work, work this week, or none. */
const pulseOf = (p: OverviewProject): Pulse => {
  if (p.status !== 'ACTIVE') return 'paused';
  if (p.tasks.overdue) return 'attention';
  return p.activity.days.some(Boolean) ? 'moving' : 'quiet';
};

const StatusDot = ({ pulse }: { pulse: Pulse }) => (
  <span className="relative flex size-2 shrink-0">
    {pulse === 'moving' && (
      <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-40" />
    )}
    <span className={cn('relative size-2 rounded-full', PULSES[pulse].dot)} />
  </span>
);

/* ------------------------------- indicators ------------------------------- */

/** A ring that fills with the project's goal, or its tasks when it has none. */
const ProgressRing = ({
  percent,
  color,
  title,
}: {
  percent: number;
  color: string;
  title: string;
}) => {
  const r = 15;
  const length = 2 * Math.PI * r;
  return (
    <span title={title} className="relative flex size-10 shrink-0">
      <svg viewBox="0 0 40 40" className="size-10 -rotate-90">
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          strokeWidth="3.5"
          className="stroke-white/[0.07]"
        />
        <motion.circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={length}
          initial={{ strokeDashoffset: length }}
          animate={{ strokeDashoffset: length * (1 - percent / 100) }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      {percent >= 100 && (
        <Icon
          name="check"
          className="absolute inset-0 m-auto size-fit text-[16px]"
        />
      )}
    </span>
  );
};

/** Seven segments, one per day ending today, brighter for more work. */
const WeekStrip = ({ days, color }: { days: number[]; color: string }) => {
  const max = Math.max(1, ...days);
  return (
    <span
      title="Worklogs, last 7 days"
      className="flex h-2 min-w-0 flex-1 gap-1"
    >
      {days.map((n, i) => (
        <span
          key={i}
          className="flex-1 rounded-full bg-white/[0.06]"
          style={
            n
              ? { backgroundColor: color, opacity: 0.35 + 0.65 * (n / max) }
              : {}
          }
        />
      ))}
    </span>
  );
};

/* ---------------------------------- card ---------------------------------- */

const ProjectCard = ({
  project,
  people,
  isMine,
}: {
  project: OverviewProject;
  people: Map<string, Person>;
  isMine: boolean;
}) => {
  const color = project.color || '#10b981';
  const pulse = pulseOf(project);

  const goal = project.goals?.[0];
  const goalProgress = goal
    ? project.goalProgress?.find((g) => g.goalId === goal.id)
    : null;
  const ring =
    goal && goalProgress
      ? {
          percent: goalProgress.percent,
          title: `${goalProgress.done}/${goal.target} ${goal.title}`,
        }
      : {
          percent: project.progress?.percent ?? 0,
          title: `${project.progress?.percent ?? 0}% of tasks done`,
        };

  // Who worked on it this week, else its team.
  const faces = (
    project.activity.people.length
      ? project.activity.people
      : [...(project.leadIds ?? []), ...(project.memberIds ?? [])]
  )
    .map((id) => people.get(id))
    .filter((p): p is Person => !!p);

  return (
    <Link
      href={`${APP_ROUTES.projects}/${project.id}`}
      style={{ '--accent': color } as CSSProperties}
      className="group flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:bg-white/[0.04] active:translate-y-0"
    >
      <div className="flex items-center gap-3">
        <CompanyMark
          name={project.name}
          color={project.color}
          logo={project.logo}
          size={40}
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-white">
              {project.name}
            </span>
            {isMine && (
              <Icon
                name="person"
                filled
                className="shrink-0 text-[14px] text-amber-300"
              />
            )}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
            <StatusDot pulse={pulse} />
            {PULSES[pulse].label}
          </p>
        </div>
        <ProgressRing percent={ring.percent} color={color} title={ring.title} />
      </div>

      <div className="flex items-center gap-4">
        <WeekStrip days={project.activity.days} color={color} />
        <span className="flex h-6 shrink-0 items-center">
          {faces.length ? <AvatarStack users={faces} max={3} /> : null}
        </span>
      </div>
    </Link>
  );
};

const CardSkeleton = () => (
  <div className="flex h-[124px] flex-col justify-between rounded-2xl border border-white/[0.04] bg-white/[0.02] p-4">
    <div className="flex items-center gap-3">
      <div className="size-10 animate-pulse rounded-xl bg-white/[0.06]" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-2.5 w-1/4 animate-pulse rounded bg-white/[0.04]" />
      </div>
    </div>
    <div className="h-2 animate-pulse rounded-full bg-white/[0.04]" />
  </div>
);

/* ---------------------------------- page ---------------------------------- */

const Chip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      'flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors',
      active
        ? 'bg-white text-neutral-950'
        : 'bg-white/[0.04] text-neutral-400 hover:bg-white/[0.08] hover:text-neutral-100',
    )}
  >
    {children}
  </button>
);

/**
 * Every project the user can see, across their companies, at a glance: how
 * it is doing, how busy its week was, how far its goal is and who is on it.
 * The details are on the project page a card opens.
 */
export const ProjectsOverview = () => {
  const { user } = useUser();
  const [data, setData] = useState<Overview | null>(cached);
  const [failed, setFailed] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);

  useEffect(() => {
    PortalSdk.getData('/api/projects/overview', null)
      .then((res) => {
        cached = res?.data ?? null;
        setData(cached);
      })
      .catch(() => setFailed(!cached));
  }, []);

  const people = useMemo(
    () => new Map((data?.users ?? []).map((u) => [u.id, u])),
    [data],
  );
  const isMine = (p: OverviewProject) =>
    !!user && (p.leadIds?.includes(user.id) || p.memberIds?.includes(user.id));

  // Companies with at least one project, in the order the API gave them.
  const companies = useMemo(
    () =>
      (data?.companies ?? []).filter((c) =>
        data?.projects.some((p) => p.companyId === c.id),
      ),
    [data],
  );

  const groups = useMemo(() => {
    const shown = (data?.projects ?? [])
      .filter(
        (p) =>
          (!companyId || p.companyId === companyId) && (!onlyMine || isMine(p)),
      )
      // Yours first, then the ones worked on most recently.
      .sort(
        (a, b) =>
          Number(isMine(b)) - Number(isMine(a)) ||
          (b.activity.lastDate ?? '').localeCompare(a.activity.lastDate ?? ''),
      );
    return companies
      .map((company) => ({
        company,
        projects: shown.filter((p) => p.companyId === company.id),
      }))
      .filter((g) => g.projects.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, companies, companyId, onlyMine, user?.id]);

  return (
    <div className="fixed inset-0 overflow-y-auto bg-neutral-950 pb-[88px] text-neutral-100 md:left-16 md:pb-12">
      <div className="mx-auto max-w-5xl px-4 pt-8 md:px-8 md:pt-12">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Projects
        </h1>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          {companies.length > 0 && (
            <div className="no-scrollbar -mx-4 flex max-w-[calc(100%+2rem)] items-center gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
              <Chip active={!companyId} onClick={() => setCompanyId(null)}>
                All
              </Chip>
              {companies.map((c) => (
                <Chip
                  key={c.id}
                  active={companyId === c.id}
                  onClick={() => setCompanyId(c.id)}
                >
                  <CompanyMark
                    name={c.name}
                    color={c.color}
                    logo={c.logo}
                    size={16}
                  />
                  {c.name}
                </Chip>
              ))}
              <span className="mx-1 h-4 w-px shrink-0 bg-white/10" />
              <Chip active={onlyMine} onClick={() => setOnlyMine((v) => !v)}>
                <Icon name="person" className="text-[15px]" />
                Mine
              </Chip>
            </div>
          )}
          {/* What the dots mean */}
          <div className="flex items-center gap-3 text-[11px] text-neutral-500">
            {(Object.keys(PULSES) as Pulse[]).map((key) => (
              <span key={key} className="flex items-center gap-1.5">
                <span
                  className={cn('size-1.5 rounded-full', PULSES[key].dot)}
                />
                {PULSES[key].label}
              </span>
            ))}
          </div>
        </div>

        {!data && !failed ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : failed ? (
          <EmptyState
            icon="cloud_off"
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
          <motion.div layout className="mt-4">
            <AnimatePresence initial={false} mode="popLayout">
              {groups.map(({ company, projects }) => (
                <motion.section
                  key={company.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="pt-6"
                >
                  <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                    {company.name}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence initial={false} mode="popLayout">
                      {projects.map((project) => (
                        <motion.div
                          key={project.id}
                          layout
                          className="min-w-0"
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ProjectCard
                            project={project}
                            people={people}
                            isMine={isMine(project)}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.section>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};
