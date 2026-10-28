'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { cn } from '@/lib/utils';
import {
  childrenOf,
  descendantsOf,
  leadsAbove,
  overallProgress,
  ownProgress,
} from '@/lib/workspace/projectProgress';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { AdminButton, EmptyState, Icon } from '../Admin/shared/AdminUI';
import type { ProjectRow } from '../Admin/Workspace/AdminProjects';
import { AvatarStack, CompanyMark } from '../Admin/Workspace/shared';
import type { Person } from '../Project/types';
import { NewProjectDialog } from './NewProjectDialog';
import { ProjectRequests, type RequestsData } from './ProjectRequests';
import { Tip, TipProvider, TipRow, TipTitle } from './Tip';

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
let cachedRequests: RequestsData | null = null;

/* --------------------------------- status --------------------------------- */

const PULSES = {
  moving: {
    label: 'Moving',
    dot: 'bg-emerald-400',
    hint: 'Someone logged work on it in the last 7 days and nothing is overdue.',
  },
  quiet: {
    label: 'Quiet',
    dot: 'bg-amber-300',
    hint: 'Nobody logged work on it in the last 7 days.',
  },
  attention: {
    label: 'Needs a look',
    dot: 'bg-rose-400',
    hint: 'It has tasks past their due date.',
  },
  paused: {
    label: 'Paused',
    dot: 'bg-neutral-500',
    hint: 'Its status is not Active (planning, on hold or completed).',
  },
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

const PERIOD_NOW: Record<string, string> = {
  day: 'today',
  week: 'this week',
  month: 'this month',
};

/** A ring that fills with the project's overall progress. */
const ProgressRing = ({
  percent,
  color,
}: {
  percent: number;
  color: string;
}) => {
  const r = 15;
  const length = 2 * Math.PI * r;
  return (
    <span className="relative flex size-10 shrink-0">
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
      {percent >= 100 ? (
        <Icon
          name="check"
          className="absolute inset-0 m-auto size-fit text-[16px]"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-neutral-300">
          {percent}
        </span>
      )}
    </span>
  );
};

/** Seven segments, one per day ending today, brighter for more work. */
const WeekStrip = ({ days, color }: { days: number[]; color: string }) => {
  const max = Math.max(1, ...days);
  return (
    <span className="flex h-2 min-w-0 flex-1 gap-1">
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

/** One bar per item, each filled to its percent. */
const Segments = ({
  items,
}: {
  items: { key: string; percent: number; color: string }[];
}) => (
  <span className="flex h-1.5 min-w-0 flex-1 gap-1">
    {items.map((item) => (
      <span
        key={item.key}
        className="relative flex-1 overflow-hidden rounded-full bg-white/[0.07]"
      >
        <motion.span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: item.color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, item.percent)}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </span>
    ))}
  </span>
);

/** A row of the card: an icon, its bars and a short count, with a tip. */
const Meter = ({
  icon,
  tip,
  children,
  count,
}: {
  icon: string;
  tip: React.ReactNode;
  children: React.ReactNode;
  count: React.ReactNode;
}) => (
  <Tip content={tip}>
    <span
      tabIndex={0}
      onClick={(e) => e.stopPropagation()}
      className="-mx-1.5 flex cursor-help items-center gap-2.5 rounded-lg px-1.5 py-1 outline-none transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.06]"
    >
      <Icon name={icon} className="text-[15px] text-neutral-500" />
      {children}
      <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-neutral-400">
        {count}
      </span>
    </span>
  </Tip>
);

/* ---------------------------------- card ---------------------------------- */

const ProjectCard = ({
  project,
  all,
  people,
  isMine,
  canAddSub,
  onAddSub,
}: {
  project: OverviewProject;
  /** Every project, to find its sub-projects. */
  all: OverviewProject[];
  people: Map<string, Person>;
  isMine: boolean;
  /** Whether a sub-project is made at once (else it is a request). */
  canAddSub: boolean;
  onAddSub: () => void;
}) => {
  const router = useRouter();
  const color = project.color || '#10b981';
  const pulse = pulseOf(project);
  const href = `${APP_ROUTES.projects}/${project.id}`;

  const own = ownProgress(project);
  const overall = overallProgress(project, all);
  const subs = childrenOf(all, project.id);
  const deeper = descendantsOf(all, project.id).length - subs.length;
  const goals = (project.goals ?? []).map((g) => ({
    goal: g,
    progress: project.goalProgress?.find((p) => p.goalId === g.id),
  }));

  // Who worked on it this week, else its team.
  const faces = (
    project.activity.people.length
      ? project.activity.people
      : [...(project.leadIds ?? []), ...(project.memberIds ?? [])]
  )
    .filter((id, i, list) => list.indexOf(id) === i)
    .map((id) => people.get(id))
    .filter((p): p is Person => !!p);
  const logged = project.activity.days.reduce((n, d) => n + d, 0);

  const open = () => router.push(href);

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => e.key === 'Enter' && open()}
      style={{ '--accent': color } as CSSProperties}
      className="group flex h-full cursor-pointer flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 outline-none transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:bg-white/[0.04] focus-visible:border-[color:var(--accent)] active:translate-y-0"
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
          <Tip
            content={
              <>
                <TipTitle>{PULSES[pulse].label}</TipTitle>
                {PULSES[pulse].hint}
              </>
            }
          >
            <span
              onClick={(e) => e.stopPropagation()}
              className="mt-1 flex w-fit cursor-help items-center gap-1.5 text-xs text-neutral-500"
            >
              <StatusDot pulse={pulse} />
              {PULSES[pulse].label}
              {project.tasks.overdue > 0 && (
                <span className="text-rose-300/80">
                  · {project.tasks.overdue} overdue
                </span>
              )}
            </span>
          </Tip>
        </div>
        <Tip
          side="top"
          content={
            <>
              <TipTitle>{overall}% overall</TipTitle>
              <div className="flex flex-col gap-0.5">
                {own.source === 'goals' && (
                  <TipRow
                    label={`Its ${own.goals === 1 ? 'goal' : `${own.goals} goals`}, this period`}
                    value={`${own.percent}%`}
                  />
                )}
                {own.source === 'tasks' && (
                  <TipRow
                    label={`Tasks done (${own.done} of ${own.total})`}
                    value={`${own.percent}%`}
                  />
                )}
                {subs.map((c) => (
                  <TipRow
                    key={c.id}
                    color={c.color}
                    label={c.name}
                    value={`${overallProgress(c, all)}%`}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-neutral-500">
                {subs.length
                  ? 'The average of the project itself and each sub-project.'
                  : own.source === 'goals'
                    ? 'How far its goals are in their current day, week or month.'
                    : own.source === 'tasks'
                      ? 'It has no goals, so this is the share of its tasks done.'
                      : 'Nothing to measure yet: add a goal on the project page.'}
              </p>
            </>
          }
        >
          <span onClick={(e) => e.stopPropagation()} className="cursor-help">
            <ProgressRing percent={overall} color={color} />
          </span>
        </Tip>
      </div>

      <div className="flex flex-col">
        {goals.length > 0 ? (
          <Meter
            icon="track_changes"
            count={`${goals.filter((g) => (g.progress?.percent ?? 0) >= 100).length}/${goals.length}`}
            tip={
              <>
                <TipTitle>Goals</TipTitle>
                <div className="flex flex-col gap-0.5">
                  {goals.map(({ goal, progress }) => (
                    <TipRow
                      key={goal.id}
                      label={`${goal.title} ${PERIOD_NOW[goal.period] ?? ''}`}
                      value={`${progress?.done ?? 0}/${goal.target}`}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-500">
                  One bar per goal. Each fills as its tasks are done; the number
                  is how many goals are met.
                </p>
              </>
            }
          >
            <Segments
              items={goals.map(({ goal, progress }) => ({
                key: goal.id,
                percent: progress?.percent ?? 0,
                color: (progress?.percent ?? 0) >= 100 ? '#34d399' : color,
              }))}
            />
          </Meter>
        ) : (
          <Meter
            icon="track_changes"
            count="–"
            tip={
              <>
                <TipTitle>No goals yet</TipTitle>
                Goals like “2 releases a week” show here and fill as their tasks
                are done. Add them on the project page.
              </>
            }
          >
            <span className="h-1.5 flex-1 rounded-full border border-dashed border-white/10" />
          </Meter>
        )}

        {subs.length > 0 && (
          <Meter
            icon="account_tree"
            count={subs.length}
            tip={
              <>
                <TipTitle>
                  {subs.length} sub-project{subs.length === 1 ? '' : 's'}
                  {deeper > 0 && ` (+${deeper} below them)`}
                </TipTitle>
                <div className="flex flex-col gap-0.5">
                  {subs.map((c) => (
                    <TipRow
                      key={c.id}
                      color={c.color}
                      label={c.name}
                      value={`${overallProgress(c, all)}%`}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-500">
                  One bar per sub-project, filled to its own overall progress.
                </p>
              </>
            }
          >
            <Segments
              items={subs.map((c) => ({
                key: c.id,
                percent: overallProgress(c, all),
                color: c.color || color,
              }))}
            />
          </Meter>
        )}
      </div>

      {subs.length > 0 && (
        <div className="-mt-1 flex flex-wrap gap-1.5">
          {subs.slice(0, 4).map((c) => (
            <Link
              key={c.id}
              href={`${APP_ROUTES.projects}/${c.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex max-w-[140px] items-center gap-1.5 rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] text-neutral-300 transition-colors hover:bg-white/[0.1] hover:text-white"
            >
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: c.color || color }}
              />
              <span className="truncate">{c.name}</span>
            </Link>
          ))}
          {subs.length > 4 && (
            <span className="px-1 text-[11px] text-neutral-500">
              +{subs.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center gap-3 pt-1">
        <Tip
          content={
            <>
              <TipTitle>Last 7 days</TipTitle>
              {logged
                ? `${logged} work point${logged === 1 ? '' : 's'} logged by ${project.activity.people.length} ${project.activity.people.length === 1 ? 'person' : 'people'}. One bar per day, ending today; brighter is busier.`
                : 'Nothing logged this week. One bar per day, ending today.'}
            </>
          }
        >
          <span
            onClick={(e) => e.stopPropagation()}
            className="flex min-w-0 flex-1 cursor-help py-1"
          >
            <WeekStrip days={project.activity.days} color={color} />
          </span>
        </Tip>
        {faces.length > 0 && (
          <Tip
            content={
              <>
                <TipTitle>
                  {project.activity.people.length
                    ? 'Worked on it this week'
                    : 'On the team'}
                </TipTitle>
                {faces.map((p) => p.name).join(', ')}
              </>
            }
          >
            <span
              onClick={(e) => e.stopPropagation()}
              className="flex h-6 shrink-0 cursor-help items-center"
            >
              <AvatarStack users={faces} max={3} />
            </span>
          </Tip>
        )}
        <Tip
          content={
            canAddSub
              ? 'Add a sub-project'
              : 'Ask for a sub-project. The owners or this project’s leads approve it.'
          }
        >
          <button
            type="button"
            aria-label="Add a sub-project"
            onClick={(e) => {
              e.stopPropagation();
              onAddSub();
            }}
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-white/[0.08] hover:text-white md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
          >
            <Icon name="add" className="text-[18px]" />
          </button>
        </Tip>
      </div>
    </div>
  );
};

const CardSkeleton = () => (
  <div className="flex h-[150px] flex-col justify-between rounded-2xl border border-white/[0.04] bg-white/[0.02] p-4">
    <div className="flex items-center gap-3">
      <div className="size-10 animate-pulse rounded-xl bg-white/[0.06]" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-2.5 w-1/4 animate-pulse rounded bg-white/[0.04]" />
      </div>
    </div>
    <div className="h-1.5 animate-pulse rounded-full bg-white/[0.04]" />
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
 * it is doing, how its goals and sub-projects are going, how busy its week
 * was and who is on it. Sub-projects sit inside the card of the project
 * above them. Hovering any indicator says what it means. New projects are
 * made here, or asked for when the person may not make them.
 */
export const ProjectsOverview = () => {
  const { user } = useUser();
  const { can } = useWorkspace();
  const [data, setData] = useState<Overview | null>(cached);
  const [requests, setRequests] = useState<RequestsData | null>(cachedRequests);
  const [failed, setFailed] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [creating, setCreating] = useState<{
    companyId: string | null;
    parentId: string | null;
  } | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  const load = useCallback(() => {
    PortalSdk.getData('/api/projects/overview', null)
      .then((res) => {
        cached = res?.data ?? null;
        setData(cached);
      })
      .catch(() => setFailed(!cached));
    PortalSdk.getData('/api/projects/requests', null)
      .then((res) => {
        cachedRequests = res?.data ?? null;
        setRequests(cachedRequests);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    load();
    // Opened from a request's notification.
    setHighlight(new URLSearchParams(window.location.search).get('request'));
  }, [load]);

  const all = useMemo(() => data?.projects ?? [], [data]);
  const people = useMemo(
    () => new Map((data?.users ?? []).map((u) => [u.id, u])),
    [data],
  );
  const isMine = (p: OverviewProject) =>
    !!user && (p.leadIds?.includes(user.id) || p.memberIds?.includes(user.id));
  /** On it, or on a project under it. */
  const involves = (p: OverviewProject) =>
    isMine(p) || descendantsOf(all, p.id).some(isMine);

  // Companies with at least one project, in the order the API gave them.
  const companies = useMemo(
    () =>
      (data?.companies ?? []).filter((c) =>
        data?.projects.some((p) => p.companyId === c.id),
      ),
    [data],
  );

  const groups = useMemo(() => {
    const byId = new Map(all.map((p) => [p.id, p]));
    const shown = all
      // Sub-projects show inside the card of the project above them.
      .filter((p) => !p.parentId || !byId.has(p.parentId))
      .filter(
        (p) =>
          (!companyId || p.companyId === companyId) &&
          (!onlyMine || involves(p)),
      )
      // Yours first, then the ones worked on most recently.
      .sort(
        (a, b) =>
          Number(involves(b)) - Number(involves(a)) ||
          (b.activity.lastDate ?? '').localeCompare(a.activity.lastDate ?? ''),
      );
    return companies
      .map((company) => ({
        company,
        projects: shown.filter((p) => p.companyId === company.id),
      }))
      .filter((g) => g.projects.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, companies, companyId, onlyMine, user?.id]);

  const shownRequests = useMemo(
    () =>
      requests && {
        ...requests,
        requests: requests.requests.filter(
          (r) => !companyId || r.companyId === companyId,
        ),
      },
    [requests, companyId],
  );

  const leadsUnder = (p: OverviewProject) =>
    can(p.companyId, 'projects:approve') ||
    (!!user && leadsAbove(all, p.id).has(user.id));

  return (
    <TipProvider delayDuration={120}>
      <div className="fixed inset-0 overflow-y-auto bg-neutral-950 pb-[88px] text-neutral-100 md:left-16 md:pb-12">
        <div className="mx-auto max-w-5xl px-4 pt-8 md:px-8 md:pt-12">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Projects
            </h1>
            {data && data.companies.length > 0 && (
              <AdminButton
                tone="primary"
                size="sm"
                icon="add"
                onClick={() => setCreating({ companyId, parentId: null })}
              >
                New project
              </AdminButton>
            )}
          </div>

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
                <Tip key={key} content={PULSES[key].hint}>
                  <span className="flex cursor-help items-center gap-1.5">
                    <span
                      className={cn('size-1.5 rounded-full', PULSES[key].dot)}
                    />
                    {PULSES[key].label}
                  </span>
                </Tip>
              ))}
            </div>
          </div>

          {shownRequests && (
            <ProjectRequests
              data={shownRequests}
              highlight={highlight}
              companyName={(id) =>
                data?.companies.find((c) => c.id === id)?.name ?? ''
              }
              projectName={(id) => all.find((p) => p.id === id)?.name}
              onChanged={(created) => {
                load();
                if (created) setHighlight(null);
              }}
            />
          )}

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
                  : 'Start one with New project.'
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
                              all={all}
                              people={people}
                              isMine={isMine(project)}
                              canAddSub={leadsUnder(project)}
                              onAddSub={() =>
                                setCreating({
                                  companyId: project.companyId,
                                  parentId: project.id,
                                })
                              }
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

        <NewProjectDialog
          open={!!creating}
          onOpenChange={(open) => !open && setCreating(null)}
          projects={all}
          companyId={creating?.companyId}
          parentId={creating?.parentId}
          onDone={load}
        />
      </div>
    </TipProvider>
  );
};
