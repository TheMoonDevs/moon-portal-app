'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { cn } from '@/lib/utils';
import { childrenOf, descendantsOf } from '@/lib/workspace/projectProgress';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { AdminButton, EmptyState, Icon } from '../Admin/shared/AdminUI';
import { AvatarStack, CompanyMark } from '../Admin/Workspace/shared';
import type { Person } from '../Project/types';
import { CompanyMonth } from './CompanyMonth';
import { NewProjectDialog } from './NewProjectDialog';
import {
  goalLines,
  monthName,
  monthTasks,
  type Overview,
  type OverviewProject as OverviewProjectType,
  type Pulse,
  pulseOf,
  PULSES,
} from './overview';
import { ProjectRequests, type RequestsData } from './ProjectRequests';
import { ProjectsSidebar } from './ProjectsSidebar';
import { SubProjectBadge } from './SubProjectBadge';
import { Tip, TipProvider, TipRow, TipTitle } from './Tip';

type OverviewProject = OverviewProjectType;

// Kept between visits, so coming back from a project shows the page at once.
let cached: Overview | null = null;
let cachedRequests: RequestsData | null = null;

const StatusDot = ({ pulse }: { pulse: Pulse }) => (
  <span className="relative flex size-2 shrink-0">
    {pulse === 'moving' && (
      <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-40" />
    )}
    <span className={cn('relative size-2 rounded-full', PULSES[pulse].dot)} />
  </span>
);

/* ------------------------------- indicators ------------------------------- */

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

/* ---------------------------------- card ---------------------------------- */

const ProjectCard = ({
  project,
  all,
  people,
  isMine,
}: {
  project: OverviewProject;
  /** Every project, to find its sub-projects. */
  all: OverviewProject[];
  people: Map<string, Person>;
  isMine: boolean;
}) => {
  const router = useRouter();
  const color = project.color || '#10b981';
  const pulse = pulseOf(project);
  const href = `${APP_ROUTES.projects}/${project.id}`;

  const subs = childrenOf(all, project.id);
  const deeper = descendantsOf(all, project.id).length - subs.length;
  const month = monthTasks(project, all);
  const goals = goalLines(project);

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
              {month.overdue > 0 && (
                <span className="text-rose-300/80">
                  · {month.overdue} overdue
                </span>
              )}
            </span>
          </Tip>
        </div>
        <Tip
          side="top"
          content={
            <>
              <TipTitle>
                {month.done} of {month.done + month.open} tasks done
              </TipTitle>
              <div className="flex flex-col gap-0.5">
                <TipRow
                  label={`Finished in ${monthName()}`}
                  value={month.done}
                />
                <TipRow label="Still open" value={month.open} />
              </div>
              <p className="mt-1.5 text-[11px] text-neutral-500">
                {month.done + month.open
                  ? `Tasks finished this month against the work still open${subs.length ? ', with its sub-projects' : ''}.`
                  : 'No tasks this month yet.'}
              </p>
            </>
          }
        >
          <span onClick={(e) => e.stopPropagation()} className="cursor-help">
            <ProgressRing percent={month.percent} color={color} />
          </span>
        </Tip>
      </div>

      {(project.description || goals.length > 0) && (
        <div className="-mt-0.5 flex flex-col gap-1 text-xs leading-relaxed">
          {project.description && (
            <p className="line-clamp-2 text-neutral-400">
              {project.description}
            </p>
          )}
          {goals.length > 0 && (
            <ul className="flex min-w-0 flex-col gap-0.5">
              {goals.map((g) => (
                <li
                  key={g.id}
                  className={cn(
                    'flex min-w-0 items-start gap-1 break-words',
                    g.met ? 'text-emerald-300/90' : 'text-neutral-300',
                  )}
                >
                  <Icon
                    name={g.met ? 'check' : 'track_changes'}
                    className={cn(
                      'mt-[2px] shrink-0 text-[13px]',
                      !g.met && 'text-neutral-500',
                    )}
                  />
                  <span className="min-w-0">{g.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {subs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {subs.slice(0, 6).map((c) => (
            <SubProjectBadge
              key={c.id}
              project={c}
              all={all}
              people={people}
              fallbackColor={color}
            />
          ))}
          {(subs.length > 6 || deeper > 0) && (
            <Tip
              content={
                <>
                  {subs.length > 6 && (
                    <p>
                      {subs
                        .slice(6)
                        .map((c) => c.name)
                        .join(', ')}
                    </p>
                  )}
                  {deeper > 0 && (
                    <p className="text-neutral-500">
                      {deeper} more nested below them. See them in the list on
                      the left.
                    </p>
                  )}
                </>
              }
            >
              <span
                onClick={(e) => e.stopPropagation()}
                className="cursor-help px-1 py-0.5 text-[11px] text-neutral-500"
              >
                {subs.length > 6 ? `+${subs.length - 6}` : `+${deeper} nested`}
              </span>
            </Tip>
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
 * Every project the user can see, across their companies, at a glance. A
 * list on the left nests every project and sub-project. Each company opens
 * with how its month is going (work done, each day's work, its projects and
 * its people), then a card per project: how it is doing, its goals as text,
 * its share of this month's tasks done, its sub-projects (hover one for
 * more), how busy its week was and who is on it. Hovering any indicator
 * says what it means. New projects are made here, or asked for when the
 * person may not make them.
 */
export const ProjectsOverview = () => {
  const { user } = useUser();
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
    // Sub-projects show inside the card of the project above them.
    const tops = all.filter((p) => !p.parentId || !byId.has(p.parentId));
    const shown = tops
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
        tops: tops.filter((p) => p.companyId === company.id),
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

  return (
    <TipProvider delayDuration={120}>
      <div className="fixed inset-0 flex bg-neutral-950 text-neutral-100 md:left-16">
        {data && companies.length > 0 && (
          <aside className="hidden w-64 shrink-0 lg:block">
            <ProjectsSidebar companies={companies} all={all} />
          </aside>
        )}
        <div className="min-w-0 flex-1 overflow-y-auto pb-[88px] md:pb-12">
          <div className="mx-auto max-w-6xl px-4 pt-8 md:px-8 md:pt-12">
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
                  <Chip
                    active={onlyMine}
                    onClick={() => setOnlyMine((v) => !v)}
                  >
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
                  {groups.map(({ company, projects, tops }) => (
                    <motion.section
                      key={company.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="pt-6"
                    >
                      <CompanyMonth
                        company={company}
                        projects={tops}
                        all={all}
                        people={people}
                      />
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
      </div>
    </TipProvider>
  );
};
