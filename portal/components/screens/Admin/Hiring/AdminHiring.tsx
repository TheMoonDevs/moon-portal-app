'use client';

import type { User } from '@db/client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { answerText, APPLICATION_STAGES } from '@/lib/hiring/forms';
import { TASK_SETS, type TaskSet, taskSetOf } from '@/lib/hiring/taskSets';
import { cn } from '@/lib/utils';
import {
  APPLICATION_STAGE,
  FORM_FIELD_TYPE,
  JOB_OPENING_STATUS,
} from '@/models/hiring';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import {
  useWorkspace,
  type WorkspaceCompany,
} from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  HiringLayout,
  type HiringNavGroup,
  type HiringNavItem,
} from '../../Hiring/HiringLayout';
import { AdminCourses, type CourseView } from '../Courses/AdminCourses';
import {
  AdminOnboarding,
  type OnboardingCounts,
  type OnboardingView,
} from '../Onboarding/AdminOnboarding';
import {
  AdminButton,
  CheckBox,
  ConfirmDialog,
  EmptyState,
  Icon,
  IconAction,
  NativeSelect,
  Panel,
  Pill,
  SearchInput,
  Segmented,
  SkeletonRows,
} from '../shared/AdminUI';
import { errorText, NeedsCompany } from '../Workspace/shared';
import { ApplicantDetail } from './ApplicantDetail';
import { EmailComposer } from './EmailComposer';
import { HiringCandidates } from './HiringCandidates';
import { HiringEmails } from './HiringEmails';
import { HiringFunnel } from './HiringFunnel';
import { HiringInterviews } from './HiringInterviews';
import {
  type ApplicationRow,
  type ComposeOpening,
  EMAIL_STATUS_META,
  type HiringSectionProps,
  OPENING_STATUS_META,
  type OpeningRow,
  STAGE_META,
  timeAgo,
} from './hiringMeta';
import { HiringPool } from './HiringPool';
import { HiringQueue } from './HiringQueue';
import { HiringSkills } from './HiringSkills';
import { HiringSources } from './HiringSources';
import { HiringTeam } from './HiringTeam';
import { ImportApplicants } from './ImportApplicants';
import { OpeningEditor, type OpeningEditorSection } from './OpeningEditor';
import { ScreeningMode } from './ScreeningMode';

/** How often the board checks for new applicants while the tab is visible. */
const LIVE_INTERVAL_MS = 15_000;

type StageFilter = 'ALL' | APPLICATION_STAGE;

/** The pages of the Hiring space, each a row in its sidebar. */
const VIEW_META = {
  candidates: {
    label: 'Candidates',
    icon: 'groups',
    title: 'Candidates',
    subtitle: 'Everyone who applied, across every opening.',
  },
  queue: {
    label: 'Review queue',
    icon: 'inbox',
    title: 'Review queue',
    subtitle: 'Everything waiting on the hiring team, across openings.',
  },
  interviews: {
    label: 'Interviews',
    icon: 'forum',
    title: 'Interviews',
    subtitle: 'Interviews booked through meeting links, with scorecards.',
  },
  pool: {
    label: 'Talent pool',
    icon: 'diversity_3',
    title: 'Talent pool',
    subtitle: 'Strong people from past openings, kept to ask again.',
  },
  funnel: {
    label: 'Funnel',
    icon: 'filter_alt',
    title: 'Funnel and timing',
    subtitle: 'Where candidates drop off, and how long each stage takes.',
  },
  opening: {
    label: 'Opening',
    icon: 'work',
    title: 'Openings',
    subtitle: 'Pick an opening in the sidebar.',
  },
  onboarding: {
    label: 'In progress',
    icon: 'view_kanban',
    title: 'Onboarding',
    subtitle:
      'New hires from their details form and agreements, through the trial, to their offer.',
  },
  'onboarding-hired': {
    label: 'Hired',
    icon: 'verified',
    title: 'Hired',
    subtitle: 'People who finished onboarding and joined the team.',
  },
  'onboarding-ended': {
    label: 'Ended',
    icon: 'block',
    title: 'Ended',
    subtitle: 'Onboardings that stopped before an offer.',
  },
  'onboarding-documents': {
    label: 'Documents',
    icon: 'description',
    title: 'Documents',
    subtitle: 'The agreements and policies new hires read and sign.',
  },
  courses: {
    label: 'Courses',
    icon: 'school',
    title: 'Courses',
    subtitle: 'Short courses for your people.',
  },
  emails: {
    label: 'Emails',
    icon: 'mail',
    title: 'Emails',
    subtitle: 'Saved templates and every email sent to candidates.',
  },
  sources: {
    label: 'Sources',
    icon: 'campaign',
    title: 'Sources',
    subtitle: 'Which channels bring people, and a share kit per opening.',
  },
  team: {
    label: 'Team',
    icon: 'supervisor_account',
    title: 'Hiring team',
    subtitle: 'Who leads which opening, and what waits on each lead.',
  },
  skills: {
    label: 'Skills',
    icon: 'psychology',
    title: 'Skills',
    subtitle: 'Claude skills the team uses for screening and emails.',
  },
} as const;

type View = keyof typeof VIEW_META;

const isView = (value: unknown): value is View =>
  typeof value === 'string' && value in VIEW_META;

/** Older links name the board "openings". */
const LEGACY_VIEWS: Record<string, View> = { openings: 'opening' };

const ONBOARDING_VIEW: Partial<Record<View, OnboardingView>> = {
  onboarding: 'board',
  'onboarding-hired': 'hired',
  'onboarding-ended': 'ended',
  'onboarding-documents': 'documents',
};

const OPENING_DOT: Record<string, string> = {
  OPEN: '#34d399',
  DRAFT: '#737373',
  CLOSED: '#f59e0b',
};

/** The composer opened from a section other than the board. */
/** An applicant opened from another section, shown over it. */
type FloatingDetail = {
  application: ApplicationRow;
  opening: OpeningRow;
  onUpdated?: (application: ApplicationRow) => void;
};

type ExternalCompose = {
  recipients: ApplicationRow[];
  opening: ComposeOpening;
  template?: string | null;
  onSent?: (applications: ApplicationRow[]) => void;
};

/** An applicant to open, or (without `id`) an opening, optionally at a stage. */
type ApplicantLink = {
  id: string | null;
  companyId: string;
  openingId: string;
  stage?: APPLICATION_STAGE | null;
};

const OpeningCard = ({
  opening,
  active,
  onClick,
}: {
  opening: OpeningRow;
  active: boolean;
  onClick: () => void;
}) => {
  const status = OPENING_STATUS_META[opening.status];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full flex-col gap-2 rounded-xl border px-3 py-3 text-left transition-colors',
        active
          ? 'border-white/20 bg-white/[0.07]'
          : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium text-white">
          {opening.title}
        </p>
        <Pill tone={status?.tone}>{status?.label ?? opening.status}</Pill>
      </div>
      <div className="flex items-center gap-3 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <Icon name="group" className="text-[14px]" />
          {opening.counts.total}
        </span>
        {opening.counts.APPLIED > 0 && (
          <span className="flex items-center gap-1 text-sky-300">
            <span className="size-1.5 rounded-full bg-sky-400" />
            {opening.counts.APPLIED} new
          </span>
        )}
        {opening.department && (
          <span className="truncate">{opening.department}</span>
        )}
      </div>
    </button>
  );
};

const ApplicantCard = ({
  application,
  selected,
  canEdit,
  onToggle,
  onOpen,
}: {
  application: ApplicationRow;
  selected: boolean;
  canEdit: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) => (
  <div
    draggable={canEdit}
    onDragStart={(e) => {
      e.dataTransfer.setData('text/plain', application.id);
      e.dataTransfer.effectAllowed = 'move';
    }}
    className={cn(
      'group flex items-start gap-2 rounded-lg border bg-neutral-900/80 p-2.5 transition-colors',
      selected
        ? 'border-white/30'
        : 'border-white/[0.07] hover:border-white/15',
      canEdit && 'cursor-grab active:cursor-grabbing',
    )}
  >
    {canEdit && (
      <button
        type="button"
        aria-label={selected ? 'Deselect' : 'Select'}
        onClick={onToggle}
        className="mt-0.5"
      >
        <CheckBox checked={selected} size="sm" />
      </button>
    )}
    <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
      <p className="truncate text-sm text-neutral-100">{application.name}</p>
      <p className="truncate text-[11px] text-neutral-500">
        {application.email}
      </p>
      <p className="mt-1 flex items-center gap-2 text-[10px] text-neutral-600">
        {timeAgo(application.submittedAt)}
        {application.lastEmail && <EmailMark email={application.lastEmail} />}
      </p>
      {application.taskSubmission ? (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
          <Icon name="task_alt" className="text-[12px]" />
          Task submitted
        </span>
      ) : application.taskOpens?.count ? (
        <span
          title={`First opened ${timeAgo(application.taskOpens.firstAt)}, last ${timeAgo(application.taskOpens.lastAt)}`}
          className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-300"
        >
          <Icon name="visibility" className="text-[12px]" />
          Opened task
          {application.taskOpens.count > 1
            ? ` ${application.taskOpens.count}×`
            : ''}{' '}
          · {timeAgo(application.taskOpens.lastAt)}
        </span>
      ) : null}
    </button>
  </div>
);

/** A small mark for the latest email, red when it didn't arrive. */
const EmailMark = ({
  email,
}: {
  email: NonNullable<ApplicationRow['lastEmail']>;
}) => {
  const meta = EMAIL_STATUS_META[email.status];
  return (
    <span
      title={`Emailed “${email.subject}” ${timeAgo(email.at)}: ${meta?.label ?? email.status}`}
      className={cn(
        'inline-flex items-center gap-0.5',
        meta?.tone === 'danger' ? 'text-rose-400' : 'text-neutral-500',
      )}
    >
      <Icon name={meta?.icon ?? 'mail'} className="text-[12px]" />
      {meta?.tone === 'danger' ? meta.label : 'Emailed'}
    </span>
  );
};

/**
 * The Hiring space: hiring, onboarding and courses for one company at a
 * time, behind a single sidebar.
 */
export const AdminHiring = ({
  users,
  spaceCompanies,
  selectedCompanyId,
  onSelectCompany,
  showAdminLink,
}: {
  users: User[];
  /** Companies where the user can see hiring or edit courses. */
  spaceCompanies: WorkspaceCompany[];
  selectedCompanyId: string | null;
  onSelectCompany: (companyId: string) => void;
  showAdminLink?: boolean;
}) => {
  const router = useRouter();
  const { hiringCompanies, can, loading: workspaceLoading } = useWorkspace();
  const companyId = spaceCompanies.some(
    (c) => c.company.id === selectedCompanyId,
  )
    ? selectedCompanyId
    : (spaceCompanies[0]?.company.id ?? null);
  const hasHiring = hiringCompanies.some((c) => c.company.id === companyId);
  const hasCourses = can(companyId, 'courses:edit');

  const [openings, setOpenings] = useState<OpeningRow[]>([]);
  const [openingsLoading, setOpeningsLoading] = useState(false);
  // Which company `openings` and which opening `applications` were loaded for.
  const [openingsFor, setOpeningsFor] = useState<string | null>(null);
  const [applicationsFor, setApplicationsFor] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const [boardView, setBoardView] = useState<'board' | 'list'>('board');
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL');
  /** In the list's Task stage: one of its sets, or all of them. */
  const [taskSet, setTaskSet] = useState<'ALL' | TaskSet>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState<APPLICATION_STAGE | ''>('');
  const [busy, setBusy] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<OpeningRow | null>(null);
  const [archiving, setArchiving] = useState<OpeningRow | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [composeIds, setComposeIds] = useState<string[] | null>(null);
  /** A template to start the composer with, e.g. the task reminder. */
  const [composeTemplate, setComposeTemplate] = useState<string | null>(null);
  const [editorSection, setEditorSection] =
    useState<OpeningEditorSection>('details');
  const [importOpen, setImportOpen] = useState(false);
  /** Fast screening of the opening's Applied people, full screen. */
  const [screening, setScreening] = useState(false);
  /** Which page of the space is on screen; `opening` is an opening's board. */
  const [view, setView] = useState<View>('candidates');
  const [courses, setCourses] = useState<CourseView[]>([]);
  const [courseId, setCourseId] = useState<string | null>(null);
  /** Bumped by the sidebar's "New course" button. */
  const [courseCreate, setCourseCreate] = useState(0);
  const [onboardingCounts, setOnboardingCounts] = useState<OnboardingCounts>({
    live: 0,
    hired: 0,
  });
  const [externalCompose, setExternalCompose] =
    useState<ExternalCompose | null>(null);
  const [floating, setFloating] = useState<FloatingDetail | null>(null);

  // `?view=queue` (or skills, team, onboarding, …) opens that page. Links
  // with an opening open its board; older links call the page `section`.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('view') ?? params.get('section');
    const value = raw ? (LEGACY_VIEWS[raw] ?? raw) : null;
    if (isView(value)) setView(value);
    else if (params.get('opening')) setView('opening');
    const course = params.get('course');
    if (course) setCourseId(course);
  }, []);

  const switchView = useCallback((next: View) => {
    setView(next);
    const url = new URL(window.location.href);
    url.searchParams.set('view', next);
    url.searchParams.delete('section');
    if (!next.startsWith('onboarding')) {
      url.searchParams.delete('hire');
      url.searchParams.delete('start');
    }
    window.history.replaceState(null, '', url.toString());
  }, []);

  // A company with courses but no hiring opens on its courses.
  useEffect(() => {
    if (!workspaceLoading && companyId && !hasHiring && hasCourses)
      setView('courses');
  }, [workspaceLoading, companyId, hasHiring, hasCourses]);

  // The sidebar lists the company's courses.
  useEffect(() => {
    setCourses([]);
    if (!companyId || !hasCourses) return;
    let cancelled = false;
    PortalSdk.getData(`/api/courses?companyId=${companyId}`, null)
      .then((res) => {
        if (!cancelled) setCourses(res?.data?.courses ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [companyId, hasCourses]);

  const knownIds = useRef<Set<string> | null>(null);
  const currentOpeningId = useRef<string | null>(null);
  currentOpeningId.current = openingId;

  const opening = openings.find((o) => o.id === openingId) ?? null;
  const canEdit = can(companyId, 'hiring:edit');

  /* ----------------------------- data loading ----------------------------- */

  const loadOpenings = useCallback(
    async (silent = false) => {
      if (!companyId) return;
      if (!silent) setOpeningsLoading(true);
      try {
        const res = await PortalSdk.getData(
          `/api/hiring/openings?companyId=${companyId}`,
          null,
        );
        const rows: OpeningRow[] = res?.data?.openings ?? [];
        setOpenings(rows);
        setOpeningsFor(companyId);
        setOpeningId((current) =>
          current && rows.some((o) => o.id === current)
            ? current
            : (rows[0]?.id ?? null),
        );
      } catch (err) {
        if (!silent) toast.error(errorText(err, 'Could not load openings.'));
      } finally {
        if (!silent) setOpeningsLoading(false);
      }
    },
    [companyId],
  );

  const loadApplications = useCallback(
    async (silent = false) => {
      if (!openingId) return;
      if (!silent) setApplicationsLoading(true);
      try {
        const res = await PortalSdk.getData(
          `/api/hiring/applications?openingId=${openingId}`,
          null,
        );
        // The person may have switched openings while this was loading.
        if (currentOpeningId.current !== openingId) return;
        const rows: ApplicationRow[] = res?.data?.applications ?? [];
        // Announce people who applied since the last check.
        if (knownIds.current) {
          const fresh = rows.filter((a) => !knownIds.current?.has(a.id));
          if (fresh.length === 1)
            toast.success(`${fresh[0].name} just applied`);
          else if (fresh.length > 1)
            toast.success(`${fresh.length} new applicants`);
        }
        knownIds.current = new Set(rows.map((a) => a.id));
        setApplications(rows);
        setApplicationsFor(openingId);
        setLastSync(new Date());
      } catch (err) {
        if (!silent) toast.error(errorText(err, 'Could not load applicants.'));
      } finally {
        if (!silent) setApplicationsLoading(false);
      }
    },
    [openingId],
  );

  useEffect(() => {
    setOpenings([]);
    setOpeningsFor(null);
    setOpeningId(null);
    loadOpenings();
  }, [loadOpenings]);

  useEffect(() => {
    knownIds.current = null;
    setApplications([]);
    setApplicationsFor(null);
    setSelected(new Set());
    setStageFilter('ALL');
    loadApplications();
  }, [loadApplications]);

  // Live updates while the tab is in front of someone.
  useEffect(() => {
    if (!companyId) return;
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      loadApplications(true);
      loadOpenings(true);
    };
    const timer = window.setInterval(tick, LIVE_INTERVAL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [companyId, loadApplications, loadOpenings]);

  /* ------------------------------ applicant links ----------------------------- */

  // `/hiring?company=<id>&opening=<id>&application=<id>` opens that
  // applicant: pick their company, then their opening, then show them once
  // the opening's applicants load. Older links carry only the application,
  // so its company and opening are looked up first. Without `application`
  // the link opens the opening, listing one stage when `stage` is set.
  const [linked, setLinked] = useState<ApplicantLink | null>(null);
  const linkRead = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('application');
    const linkCompanyId = params.get('company');
    const linkOpeningId = params.get('opening');
    const linkStage = params.get('stage');
    if (!id) {
      if (linkCompanyId && linkOpeningId)
        setLinked({
          id: null,
          companyId: linkCompanyId,
          openingId: linkOpeningId,
          stage: APPLICATION_STAGES.find((s) => s === linkStage) ?? null,
        });
      linkRead.current = true;
      return;
    }
    if (linkCompanyId && linkOpeningId) {
      setLinked({ id, companyId: linkCompanyId, openingId: linkOpeningId });
      linkRead.current = true;
      return;
    }
    PortalSdk.getData(`/api/hiring/applications/${id}`, null)
      .then((res) => {
        const application: ApplicationRow | undefined = res?.data?.application;
        if (application)
          setLinked({
            id: application.id,
            companyId: application.companyId,
            openingId: application.openingId,
          });
      })
      .catch((err) =>
        toast.error(errorText(err, 'Could not open that applicant.')),
      )
      .finally(() => {
        linkRead.current = true;
      });
  }, []);

  useEffect(() => {
    if (!linked || workspaceLoading) return;
    if (companyId !== linked.companyId) {
      if (hiringCompanies.some((c) => c.company.id === linked.companyId)) {
        onSelectCompany(linked.companyId);
      } else {
        toast.error(
          "This account can't see hiring in that applicant's company.",
        );
        setLinked(null);
      }
      return;
    }
    // Wait for this company's openings, not the ones still on screen.
    if (openingsLoading || openingsFor !== linked.companyId) return;
    if (!openings.some((o) => o.id === linked.openingId)) {
      toast.error(
        linked.id
          ? "That applicant's opening is archived."
          : 'That opening is archived.',
      );
      setLinked(null);
      return;
    }
    if (openingId !== linked.openingId) {
      setOpeningId(linked.openingId);
      return;
    }
    if (applicationsLoading || applicationsFor !== linked.openingId) return;
    if (linked.stage) {
      setBoardView('list');
      setStageFilter(linked.stage);
    }
    if (linked.id) {
      if (applications.some((a) => a.id === linked.id)) setDetailId(linked.id);
      else toast.error('That applicant is no longer in this opening.');
    }
    setLinked(null);
  }, [
    linked,
    workspaceLoading,
    companyId,
    hiringCompanies,
    onSelectCompany,
    openings,
    openingsFor,
    openingsLoading,
    openingId,
    applications,
    applicationsFor,
    applicationsLoading,
  ]);

  // Keep the open applicant in the address bar so the page can be shared.
  useEffect(() => {
    if (linked || !linkRead.current) return;
    const url = new URL(window.location.href);
    for (const key of ['company', 'opening', 'application', 'stage'])
      url.searchParams.delete(key);
    if (detailId && companyId && openingId) {
      url.searchParams.set('company', companyId);
      url.searchParams.set('opening', openingId);
      url.searchParams.set('application', detailId);
    }
    window.history.replaceState(null, '', url.toString());
  }, [detailId, linked, companyId, openingId]);

  /* -------------------------------- actions -------------------------------- */

  const replaceApplications = (updated: ApplicationRow[]) => {
    const byId = new Map(updated.map((a) => [a.id, a]));
    setApplications((rows) => rows.map((a) => byId.get(a.id) ?? a));
    loadOpenings(true);
  };

  const moveMany = async (ids: string[], stage: APPLICATION_STAGE) => {
    const toMove = ids.filter(
      (id) => applications.find((a) => a.id === id)?.stage !== stage,
    );
    if (!toMove.length) return;
    // Show the move straight away; the server's answer replaces it.
    setApplications((rows) =>
      rows.map((a) => (toMove.includes(a.id) ? { ...a, stage } : a)),
    );
    setBusy(true);
    try {
      const res = await PortalSdk.patchData('/api/hiring/applications', {
        ids: toMove,
        stage,
      });
      replaceApplications(res.data.applications);
      toast.success(
        toMove.length === 1
          ? `Moved to ${STAGE_META[stage].label}`
          : `Moved ${toMove.length} applicants to ${STAGE_META[stage].label}`,
      );
      setSelected(new Set());
      setBulkStage('');
    } catch (err) {
      toast.error(errorText(err));
      loadApplications(true);
    } finally {
      setBusy(false);
    }
  };

  const setOpeningStatus = async (status: JOB_OPENING_STATUS) => {
    if (!opening) return;
    setBusy(true);
    try {
      const res = await PortalSdk.patchData(
        `/api/hiring/openings/${opening.id}`,
        { status },
      );
      setOpenings((rows) =>
        rows.map((o) => (o.id === opening.id ? res.data.opening : o)),
      );
      toast.success(
        status === JOB_OPENING_STATUS.OPEN
          ? 'Opening is live. Share the link!'
          : `Opening ${OPENING_STATUS_META[status].label.toLowerCase()}`,
      );
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!archiving) return;
    setBusy(true);
    try {
      await PortalSdk.deleteData(`/api/hiring/openings/${archiving.id}`, {});
      toast.success('Opening archived');
      setArchiving(null);
      if (openingId === archiving.id) setOpeningId(null);
      loadOpenings();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  /* -------------------------------- derived -------------------------------- */

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter(
      (a) =>
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q),
    );
  }, [applications, search]);

  const inStage =
    stageFilter === 'ALL'
      ? searched
      : searched.filter((a) => a.stage === stageFilter);
  const taskSetCounts = useMemo(() => {
    const counts = { PAST_DUE: 0, CHECKED: 0, INBOX: 0, FAILED: 0 };
    for (const a of searched)
      if (a.stage === APPLICATION_STAGE.TASK)
        counts[taskSetOf(a, opening?.task)] += 1;
    return counts as Record<TaskSet, number>;
  }, [searched, opening?.task]);
  const visible =
    stageFilter === APPLICATION_STAGE.TASK && taskSet !== 'ALL'
      ? inStage.filter((a) => taskSetOf(a, opening?.task) === taskSet)
      : inStage;

  const stageCounts = useMemo(() => {
    const counts = Object.fromEntries(
      APPLICATION_STAGES.map((s) => [s, 0]),
    ) as Record<APPLICATION_STAGE, number>;
    for (const a of searched) counts[a.stage] = (counts[a.stage] ?? 0) + 1;
    return counts;
  }, [searched]);

  const companyName =
    hiringCompanies.find((c) => c.company.id === companyId)?.company.name ?? '';
  const composeRecipients = useMemo(
    () =>
      composeIds ? applications.filter((a) => composeIds.includes(a.id)) : [],
    [applications, composeIds],
  );

  const listFields = (opening?.fields ?? [])
    .filter((f) => f.type !== FORM_FIELD_TYPE.FILE)
    .slice(0, 2);
  const detail = applications.find((a) => a.id === detailId) ?? null;

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const leadFor = (leadId?: string | null) => {
    if (!leadId) return null;
    const lead = users.find((u) => u.id === leadId);
    return {
      id: leadId,
      name: lead?.name || 'The hiring lead',
      email: lead?.email ?? null,
    };
  };

  /**
   * Opens an applicant over the section you're in (the queue, the pool…),
   * so closing it brings you back to the same place.
   */
  const openInPlace = async (
    a: Pick<ApplicationRow, 'id' | 'openingId'>,
    onUpdated?: (application: ApplicationRow) => void,
  ) => {
    try {
      const [appRes, openingRes] = await Promise.all([
        PortalSdk.getData(`/api/hiring/applications/${a.id}`, null),
        openings.some((o) => o.id === a.openingId)
          ? null
          : PortalSdk.getData(`/api/hiring/openings/${a.openingId}`, null),
      ]);
      const opening: OpeningRow | undefined =
        openings.find((o) => o.id === a.openingId) ?? openingRes?.data?.opening;
      if (!appRes?.data?.application || !opening) return;
      setFloating({ application: appRes.data.application, opening, onUpdated });
    } catch (err) {
      toast.error(errorText(err, 'Could not open that applicant.'));
    }
  };

  const updateFloating = (updated: ApplicationRow) => {
    setFloating((current) =>
      current && current.application.id === updated.id
        ? { ...current, application: updated }
        : current,
    );
    floating?.onUpdated?.(updated);
    if (updated.openingId === openingId) replaceApplications([updated]);
  };

  /** What every section other than the board gets. */
  const sectionProps: HiringSectionProps | null = companyId
    ? {
        companyId,
        companyName,
        canEdit,
        users,
        openApplicant: (a, onUpdated) => openInPlace(a, onUpdated),
        compose: (input) => setExternalCompose(input),
      }
    : null;

  /* --------------------------------- render -------------------------------- */

  const status = opening ? OPENING_STATUS_META[opening.status] : null;
  const viewMeta = VIEW_META[view];

  const item = (id: View): HiringNavItem => ({
    id,
    label: VIEW_META[id].label,
    icon: VIEW_META[id].icon,
    active: view === id,
    onClick: () => switchView(id),
  });

  const groups: HiringNavGroup[] = [];
  if (hasHiring) {
    groups.push({
      id: 'hiring',
      label: 'Hiring',
      items: [
        item('candidates'),
        item('queue'),
        item('interviews'),
        item('pool'),
        item('funnel'),
      ],
    });
    groups.push({
      id: 'openings',
      label: 'Openings',
      action: can(companyId, 'hiring:create')
        ? {
            icon: 'add',
            label: 'New opening',
            onClick: () => {
              setEditing(null);
              setEditorSection('details');
              setEditorOpen(true);
            },
          }
        : undefined,
      empty: openingsLoading ? 'Loading…' : 'No openings yet',
      items: openings.map((o) => ({
        id: `opening:${o.id}`,
        label: o.title,
        dot: OPENING_DOT[o.status] ?? '#737373',
        dim: o.status !== JOB_OPENING_STATUS.OPEN,
        count: o.counts.APPLIED || o.counts.total || null,
        countTone: o.counts.APPLIED ? 'alert' : 'muted',
        active: view === 'opening' && o.id === openingId,
        onClick: () => {
          setOpeningId(o.id);
          switchView('opening');
        },
      })),
    });
    groups.push({
      id: 'onboarding',
      label: 'Onboarding',
      items: [
        { ...item('onboarding'), count: onboardingCounts.live || null },
        { ...item('onboarding-hired'), count: onboardingCounts.hired || null },
        item('onboarding-ended'),
        item('onboarding-documents'),
      ],
    });
  }
  if (hasCourses)
    groups.push({
      id: 'courses',
      label: 'Courses',
      action: {
        icon: 'add',
        label: 'New course',
        onClick: () => {
          switchView('courses');
          setCourseCreate((n) => n + 1);
        },
      },
      empty: 'No courses yet',
      items: courses.map((c) => ({
        id: `course:${c.id}`,
        label: c.title,
        icon: 'school',
        active: view === 'courses' && c.id === courseId,
        onClick: () => {
          setCourseId(c.id);
          switchView('courses');
        },
      })),
    });
  if (hasHiring) {
    groups.push({
      id: 'outreach',
      label: 'Outreach',
      items: [item('emails'), item('sources')],
    });
    groups.push({
      id: 'setup',
      label: 'Setup',
      items: [item('team'), item('skills')],
    });
  }

  const footer = [
    {
      icon: 'arrow_back',
      label: 'Back to portal',
      onClick: () => router.push(APP_ROUTES.home),
    },
    ...(showAdminLink
      ? [
          {
            icon: 'admin_panel_settings',
            label: 'Admin console',
            onClick: () => router.push(APP_ROUTES.admin),
          },
        ]
      : []),
  ];

  const unscreened = applications.filter(
    (a) => a.stage === APPLICATION_STAGE.APPLIED,
  ).length;
  const openingActions = opening && view === 'opening' && (
    <>
      {canEdit && unscreened > 0 && (
        <AdminButton size="sm" icon="bolt" onClick={() => setScreening(true)}>
          Screen {unscreened}
        </AdminButton>
      )}
      {canEdit && opening.status !== JOB_OPENING_STATUS.OPEN && (
        <AdminButton
          size="sm"
          tone="primary"
          icon="rocket_launch"
          loading={busy}
          onClick={() => setOpeningStatus(JOB_OPENING_STATUS.OPEN)}
        >
          {opening.status === JOB_OPENING_STATUS.DRAFT ? 'Publish' : 'Reopen'}
        </AdminButton>
      )}
      {canEdit && opening.status === JOB_OPENING_STATUS.OPEN && (
        <AdminButton
          size="sm"
          icon="lock"
          loading={busy}
          onClick={() => setOpeningStatus(JOB_OPENING_STATUS.CLOSED)}
        >
          Close
        </AdminButton>
      )}
      <IconAction
        icon="link"
        label="Links: apply, per channel and task page"
        onClick={() => {
          setEditing(opening);
          setEditorSection('links');
          setEditorOpen(true);
        }}
      />
      {canEdit && (
        <IconAction
          icon="upload_file"
          label="Import applicants from a sheet"
          onClick={() => setImportOpen(true)}
        />
      )}
      {canEdit && (
        <IconAction
          icon="edit"
          label="Edit opening and form"
          onClick={() => {
            setEditing(opening);
            setEditorSection('details');
            setEditorOpen(true);
          }}
        />
      )}
      {can(companyId, 'hiring:delete') && (
        <IconAction
          icon="archive"
          label="Archive opening"
          tone="danger"
          onClick={() => setArchiving(opening)}
        />
      )}
    </>
  );

  const title =
    view === 'opening' && opening ? (
      <span className="flex items-center gap-2">
        <span className="truncate">{opening.title}</span>
        <Pill tone={status?.tone}>{status?.label}</Pill>
      </span>
    ) : view === 'courses' ? (
      (courses.find((c) => c.id === courseId)?.title ?? 'Courses')
    ) : (
      viewMeta.title
    );
  const subtitle =
    view === 'opening' && opening
      ? [
          opening.department,
          opening.location,
          opening.employmentType,
          `${opening.fields?.length ?? 0} questions`,
          opening.task ? 'take-home task' : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : viewMeta.subtitle;

  if (!spaceCompanies.length)
    return (
      <div className="flex min-h-dvh items-center justify-center bg-neutral-950 p-6">
        <NeedsCompany text="You don’t have hiring or courses access in any company yet. Ask an owner to give you a role with Hiring access." />
      </div>
    );

  return (
    <HiringLayout
      companies={spaceCompanies}
      companyId={companyId}
      onSelectCompany={onSelectCompany}
      groups={groups}
      title={title}
      subtitle={subtitle}
      actions={openingActions}
      footer={footer}
    >
      {!companyId ? (
        <NeedsCompany text="Choose a company to see its hiring." />
      ) : view === 'courses' ? (
        <AdminCourses
          selectedCompanyId={companyId}
          onSelectCompany={onSelectCompany}
          embedded
          activeId={courseId}
          onActiveChange={setCourseId}
          onCoursesChange={setCourses}
          createSignal={courseCreate}
        />
      ) : !hasHiring ? (
        <NeedsCompany text="You don’t have hiring access in this company." />
      ) : view.startsWith('onboarding') ? (
        <AdminOnboarding
          selectedCompanyId={companyId}
          onSelectCompany={onSelectCompany}
          embedded
          view={ONBOARDING_VIEW[view] ?? 'board'}
          onCounts={setOnboardingCounts}
        />
      ) : view === 'skills' ? (
        <HiringSkills companyId={companyId} canEdit={canEdit} users={users} />
      ) : view !== 'opening' && sectionProps ? (
        view === 'candidates' ? (
          <HiringCandidates {...sectionProps} />
        ) : view === 'queue' ? (
          <HiringQueue {...sectionProps} />
        ) : view === 'interviews' ? (
          <HiringInterviews {...sectionProps} />
        ) : view === 'pool' ? (
          <HiringPool {...sectionProps} />
        ) : view === 'funnel' ? (
          <HiringFunnel
            {...sectionProps}
            onOpenOpening={(id, stage) => {
              setOpeningId(id);
              if (stage) {
                setBoardView('list');
                setStageFilter(stage);
              }
              switchView('opening');
            }}
          />
        ) : view === 'emails' ? (
          <HiringEmails {...sectionProps} />
        ) : view === 'sources' ? (
          <HiringSources {...sectionProps} />
        ) : (
          <HiringTeam {...sectionProps} />
        )
      ) : openingsLoading && !openings.length ? (
        <Panel>
          <SkeletonRows rows={4} />
        </Panel>
      ) : openings.length === 0 ? (
        <Panel>
          <EmptyState
            icon="work"
            title="No openings yet"
            description="Create an opening with its application form, then share the link. Applicants show up here as they apply."
            action={
              can(companyId, 'hiring:create') && (
                <AdminButton
                  size="sm"
                  tone="primary"
                  icon="add"
                  onClick={() => {
                    setEditing(null);
                    setEditorSection('details');
                    setEditorOpen(true);
                  }}
                >
                  New opening
                </AdminButton>
              )
            }
          />
        </Panel>
      ) : (
        opening && (
          <div className="flex min-w-0 flex-col gap-4">
            {opening.status === JOB_OPENING_STATUS.DRAFT && (
              <p className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs text-neutral-400">
                <Icon name="info" className="text-[16px]" />
                This opening is a draft. Publish it to get a link candidates can
                apply through.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search applicants…"
                className="min-w-[200px] flex-1"
              />
              <Segmented
                value={boardView}
                onChange={setBoardView}
                options={[
                  { value: 'board', label: 'Board', icon: 'view_kanban' },
                  { value: 'list', label: 'List', icon: 'table_rows' },
                ]}
              />
              <span
                className="flex items-center gap-1.5 text-[11px] text-neutral-500"
                title={
                  lastSync
                    ? `Last checked ${lastSync.toLocaleTimeString()}`
                    : undefined
                }
              >
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                Live
              </span>
            </div>

            {selected.size > 0 && canEdit && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/15 bg-white/[0.05] px-3 py-2">
                <span className="text-sm text-neutral-200">
                  {selected.size} selected
                </span>
                <NativeSelect
                  aria-label="Move selected to"
                  value={bulkStage}
                  onChange={(e) =>
                    setBulkStage(e.target.value as APPLICATION_STAGE)
                  }
                  className="h-8 w-44 text-xs"
                >
                  <option value="">Move to…</option>
                  {APPLICATION_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_META[s].label}
                    </option>
                  ))}
                </NativeSelect>
                <AdminButton
                  size="sm"
                  tone="primary"
                  disabled={!bulkStage}
                  loading={busy}
                  onClick={() =>
                    bulkStage && moveMany(Array.from(selected), bulkStage)
                  }
                >
                  Move
                </AdminButton>
                <span className="h-5 w-px bg-white/10" />
                <AdminButton
                  size="sm"
                  icon="mail"
                  onClick={() => {
                    setComposeTemplate(null);
                    setComposeIds(Array.from(selected));
                  }}
                >
                  Email
                </AdminButton>
                <AdminButton
                  size="sm"
                  tone="ghost"
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </AdminButton>
              </div>
            )}

            {applicationsLoading && !applications.length ? (
              <Panel>
                <SkeletonRows rows={4} />
              </Panel>
            ) : applications.length === 0 ? (
              <Panel>
                <EmptyState
                  icon="person_search"
                  title="No applicants yet"
                  description={
                    opening.status === JOB_OPENING_STATUS.OPEN
                      ? 'Share the apply link. New applicants appear here on their own.'
                      : 'Publish the opening and share its link to start receiving applications.'
                  }
                  action={
                    canEdit && (
                      <AdminButton
                        size="sm"
                        icon="upload_file"
                        onClick={() => setImportOpen(true)}
                      >
                        Import from a sheet
                      </AdminButton>
                    )
                  }
                />
              </Panel>
            ) : boardView === 'board' ? (
              <div className="custom-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
                {APPLICATION_STAGES.map((stage) => {
                  const meta = STAGE_META[stage];
                  const rows = searched.filter((a) => a.stage === stage);
                  return (
                    <div
                      key={stage}
                      onDragOver={(e) => canEdit && e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData('text/plain');
                        if (!id || !canEdit) return;
                        moveMany(
                          selected.has(id) ? Array.from(selected) : [id],
                          stage,
                        );
                      }}
                      className="flex w-60 shrink-0 flex-col gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-2"
                    >
                      <div className="flex items-center gap-2 p-1">
                        {canEdit && rows.length > 0 ? (
                          <button
                            type="button"
                            aria-label={`Select everyone in ${meta.label}`}
                            title={`Select everyone in ${meta.label}`}
                            onClick={() =>
                              setSelected((current) => {
                                const next = new Set(current);
                                const all = rows.every((a) => next.has(a.id));
                                rows.forEach((a) =>
                                  all ? next.delete(a.id) : next.add(a.id),
                                );
                                return next;
                              })
                            }
                          >
                            <CheckBox
                              size="sm"
                              checked={rows.every((a) => selected.has(a.id))}
                            />
                          </button>
                        ) : null}
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        <span className="flex-1 text-xs font-medium text-neutral-300">
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          {rows.length}
                        </span>
                      </div>
                      <div className="custom-scrollbar flex max-h-[60vh] min-h-[80px] flex-col gap-2 overflow-y-auto">
                        {stage === APPLICATION_STAGE.TASK
                          ? TASK_SETS.map((set) => {
                              const inSet = rows.filter(
                                (a) => taskSetOf(a, opening.task) === set.value,
                              );
                              if (!inSet.length) return null;
                              return (
                                <div
                                  key={set.value}
                                  className="flex flex-col gap-2"
                                >
                                  <p
                                    title={set.hint}
                                    className="flex items-center gap-1.5 px-1 pt-1 text-[10px] font-medium uppercase tracking-wide text-neutral-500"
                                  >
                                    <span style={{ color: set.color }}>
                                      <Icon
                                        name={set.icon}
                                        className="text-[13px]"
                                      />
                                    </span>
                                    <span className="flex-1">{set.label}</span>
                                    {inSet.length}
                                  </p>
                                  {inSet.map((a) => (
                                    <ApplicantCard
                                      key={a.id}
                                      application={a}
                                      selected={selected.has(a.id)}
                                      canEdit={canEdit}
                                      onToggle={() => toggle(a.id)}
                                      onOpen={() => setDetailId(a.id)}
                                    />
                                  ))}
                                </div>
                              );
                            })
                          : rows.map((a) => (
                              <ApplicantCard
                                key={a.id}
                                application={a}
                                selected={selected.has(a.id)}
                                canEdit={canEdit}
                                onToggle={() => toggle(a.id)}
                                onOpen={() => setDetailId(a.id)}
                              />
                            ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Panel className="overflow-hidden">
                <div className="border-b border-white/[0.07] p-3">
                  <Segmented
                    value={stageFilter}
                    onChange={setStageFilter}
                    className="max-w-full overflow-x-auto"
                    options={[
                      { value: 'ALL', label: 'All', count: searched.length },
                      ...APPLICATION_STAGES.map((s) => ({
                        value: s,
                        label: STAGE_META[s].label,
                        count: stageCounts[s],
                      })),
                    ]}
                  />
                  {stageFilter === APPLICATION_STAGE.TASK && (
                    <Segmented
                      value={taskSet}
                      onChange={setTaskSet}
                      className="mt-2 max-w-full overflow-x-auto"
                      options={[
                        {
                          value: 'ALL',
                          label: 'Every task',
                          count: stageCounts.TASK,
                        },
                        ...TASK_SETS.map((t) => ({
                          value: t.value,
                          label: t.label,
                          icon: t.icon,
                          count: taskSetCounts[t.value],
                        })),
                      ]}
                    />
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="text-[11px] uppercase tracking-wider text-neutral-500">
                      <tr className="border-b border-white/[0.07]">
                        {canEdit && (
                          <th className="w-10 px-3 py-2">
                            <button
                              type="button"
                              aria-label="Select all"
                              onClick={() =>
                                setSelected(
                                  visible.every((a) => selected.has(a.id))
                                    ? new Set()
                                    : new Set(visible.map((a) => a.id)),
                                )
                              }
                            >
                              <CheckBox
                                size="sm"
                                checked={
                                  visible.length > 0 &&
                                  visible.every((a) => selected.has(a.id))
                                }
                              />
                            </button>
                          </th>
                        )}
                        <th className="px-3 py-2 font-medium">Applicant</th>
                        <th className="px-3 py-2 font-medium">Stage</th>
                        {listFields.map((f) => (
                          <th key={f.id} className="px-3 py-2 font-medium">
                            {f.label}
                          </th>
                        ))}
                        <th className="px-3 py-2 font-medium">Applied</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((a) => {
                        const meta = STAGE_META[a.stage];
                        return (
                          <tr
                            key={a.id}
                            onClick={() => setDetailId(a.id)}
                            className="cursor-pointer border-b border-white/[0.05] last:border-b-0 hover:bg-white/[0.03]"
                          >
                            {canEdit && (
                              <td className="px-3 py-2.5">
                                <button
                                  type="button"
                                  aria-label="Select"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggle(a.id);
                                  }}
                                >
                                  <CheckBox
                                    size="sm"
                                    checked={selected.has(a.id)}
                                  />
                                </button>
                              </td>
                            )}
                            <td className="px-3 py-2.5">
                              <p className="text-neutral-100">{a.name}</p>
                              <p className="text-xs text-neutral-500">
                                {a.email}
                              </p>
                            </td>
                            <td className="px-3 py-2.5">
                              <Pill tone={meta.tone}>{meta.label}</Pill>
                            </td>
                            {listFields.map((f) => (
                              <td
                                key={f.id}
                                className="max-w-[220px] truncate px-3 py-2.5 text-neutral-300"
                              >
                                {answerText(a.answers?.[f.id]) || '—'}
                              </td>
                            ))}
                            <td className="whitespace-nowrap px-3 py-2.5 text-xs text-neutral-500">
                              {timeAgo(a.submittedAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {visible.length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-neutral-500">
                      Nobody here yet.
                    </p>
                  )}
                </div>
              </Panel>
            )}
          </div>
        )
      )}

      {companyId && (
        <OpeningEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          companyId={companyId}
          opening={editing}
          initialSection={editorSection}
          users={users}
          onSaved={(saved) => {
            setOpenings((rows) =>
              rows.some((o) => o.id === saved.id)
                ? rows.map((o) => (o.id === saved.id ? saved : o))
                : [saved, ...rows],
            );
            setOpeningId(saved.id);
          }}
        />
      )}
      <ApplicantDetail
        application={detail}
        fields={opening?.fields ?? []}
        task={opening?.task ?? null}
        screening={opening?.screening ?? null}
        users={users}
        canEdit={canEdit}
        onClose={() => setDetailId(null)}
        onUpdated={(updated) => replaceApplications([updated])}
        onEmail={
          detail
            ? () => {
                setComposeTemplate(null);
                setComposeIds([detail.id]);
              }
            : undefined
        }
        onRemind={
          detail
            ? () => {
                setComposeTemplate('starter:reminder');
                setComposeIds([detail.id]);
              }
            : undefined
        }
        onCompose={
          detail
            ? (template) => {
                setComposeTemplate(template);
                setComposeIds([detail.id]);
              }
            : undefined
        }
      />
      {floating && (
        <ApplicantDetail
          application={floating.application}
          fields={floating.opening.fields ?? []}
          task={floating.opening.task ?? null}
          screening={floating.opening.screening ?? null}
          users={users}
          canEdit={canEdit}
          onClose={() => setFloating(null)}
          onUpdated={updateFloating}
          onEmail={() =>
            setExternalCompose({
              recipients: [floating.application],
              opening: floating.opening,
              onSent: (rows) => rows.forEach(updateFloating),
            })
          }
          onRemind={() =>
            setExternalCompose({
              recipients: [floating.application],
              opening: floating.opening,
              template: 'starter:reminder',
              onSent: (rows) => rows.forEach(updateFloating),
            })
          }
          onCompose={(template) =>
            setExternalCompose({
              recipients: [floating.application],
              opening: floating.opening,
              template,
              onSent: (rows) => rows.forEach(updateFloating),
            })
          }
        />
      )}
      {companyId && opening && (
        <EmailComposer
          open={!!composeIds && composeRecipients.length > 0}
          onOpenChange={(open) => !open && setComposeIds(null)}
          companyId={companyId}
          companyName={companyName}
          role={opening.title}
          hiringLead={
            opening.hiringLeadId
              ? (() => {
                  const lead = users.find((u) => u.id === opening.hiringLeadId);
                  return {
                    id: opening.hiringLeadId,
                    name: lead?.name || 'The hiring lead',
                    email: lead?.email ?? null,
                  };
                })()
              : null
          }
          users={users}
          initialTemplate={composeTemplate}
          replyToLead={opening.replyToLead ?? true}
          recipients={composeRecipients}
          canEditTemplates={canEdit}
          onSent={(result) => {
            replaceApplications(result.applications);
            if (!result.failed) setSelected(new Set());
          }}
        />
      )}
      {companyId && externalCompose && (
        <EmailComposer
          open
          onOpenChange={(open) => !open && setExternalCompose(null)}
          companyId={companyId}
          companyName={companyName}
          role={externalCompose.opening.title}
          hiringLead={leadFor(externalCompose.opening.hiringLeadId)}
          users={users}
          initialTemplate={externalCompose.template ?? null}
          replyToLead={externalCompose.opening.replyToLead ?? true}
          recipients={externalCompose.recipients}
          canEditTemplates={canEdit}
          onSent={(result) => {
            externalCompose.onSent?.(result.applications);
            if (externalCompose.opening.id === openingId)
              replaceApplications(result.applications);
          }}
        />
      )}
      {opening && canEdit && (
        <ImportApplicants
          open={importOpen}
          onOpenChange={setImportOpen}
          openingId={opening.id}
          openingTitle={opening.title}
          fields={opening.fields ?? []}
          existingEmails={applications.map((a) => a.email)}
          onImported={() => {
            // They're not new applicants, so skip the "just applied" toast.
            knownIds.current = null;
            loadApplications(true);
            loadOpenings(true);
          }}
        />
      )}
      {screening && opening && canEdit && (
        <ScreeningMode
          opening={opening}
          applications={applications}
          onClose={() => setScreening(false)}
          onUpdated={(updated) => replaceApplications([updated])}
          onCompose={(ids, template) => {
            setScreening(false);
            setComposeTemplate(template);
            setComposeIds(ids);
          }}
        />
      )}
      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(null)}
        title={`Archive ${archiving?.title ?? 'opening'}?`}
        message="It disappears from this list and its apply link stops working. Every application is kept."
        confirmLabel="Archive"
        loading={busy}
        onConfirm={archive}
      />
    </HiringLayout>
  );
};
