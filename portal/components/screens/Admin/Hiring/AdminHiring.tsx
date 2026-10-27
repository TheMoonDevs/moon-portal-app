'use client';

import type { User } from '@db/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { answerText, APPLICATION_STAGES } from '@/lib/hiring/forms';
import { cn } from '@/lib/utils';
import {
  type APPLICATION_STAGE,
  FORM_FIELD_TYPE,
  JOB_OPENING_STATUS,
} from '@/models/hiring';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  CheckBox,
  ConfirmDialog,
  CopyButton,
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
import { CompanyPicker, errorText, NeedsCompany } from '../Workspace/shared';
import { ApplicantDetail } from './ApplicantDetail';
import { EmailComposer } from './EmailComposer';
import {
  type ApplicationRow,
  applyUrl,
  EMAIL_STATUS_META,
  OPENING_STATUS_META,
  type OpeningRow,
  STAGE_META,
  timeAgo,
} from './hiringMeta';
import { ImportApplicants } from './ImportApplicants';
import { OpeningEditor } from './OpeningEditor';

/** How often the board checks for new applicants while the tab is visible. */
const LIVE_INTERVAL_MS = 15_000;

type StageFilter = 'ALL' | APPLICATION_STAGE;

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

export const AdminHiring = ({
  users,
  selectedCompanyId,
  onSelectCompany,
}: {
  users: User[];
  selectedCompanyId: string | null;
  onSelectCompany: (companyId: string) => void;
}) => {
  const { hiringCompanies, can } = useWorkspace();
  const companyId = hiringCompanies.some(
    (c) => c.company.id === selectedCompanyId,
  )
    ? selectedCompanyId
    : (hiringCompanies[0]?.company.id ?? null);

  const [openings, setOpenings] = useState<OpeningRow[]>([]);
  const [openingsLoading, setOpeningsLoading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const [view, setView] = useState<'board' | 'list'>('board');
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState<APPLICATION_STAGE | ''>('');
  const [busy, setBusy] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<OpeningRow | null>(null);
  const [archiving, setArchiving] = useState<OpeningRow | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [composeIds, setComposeIds] = useState<string[] | null>(null);
  const [importOpen, setImportOpen] = useState(false);

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
    setOpeningId(null);
    loadOpenings();
  }, [loadOpenings]);

  useEffect(() => {
    knownIds.current = null;
    setApplications([]);
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

  // `?tab=hiring&application=<id>` opens that applicant: pick their company,
  // then their opening, then show them once the opening's applicants load.
  const [linked, setLinked] = useState<ApplicationRow | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('application');
    if (!id) return;
    PortalSdk.getData(`/api/hiring/applications/${id}`, null)
      .then((res) => {
        const application: ApplicationRow | undefined = res?.data?.application;
        if (application) setLinked(application);
      })
      .catch((err) =>
        toast.error(errorText(err, 'Could not open that applicant.')),
      );
  }, []);

  useEffect(() => {
    if (!linked) return;
    if (companyId !== linked.companyId) {
      if (hiringCompanies.some((c) => c.company.id === linked.companyId))
        onSelectCompany(linked.companyId);
      else setLinked(null);
      return;
    }
    if (openingsLoading) return;
    if (!openings.some((o) => o.id === linked.openingId)) {
      if (openings.length) {
        toast.error("That applicant's opening is archived.");
        setLinked(null);
      }
      return;
    }
    if (openingId !== linked.openingId) {
      setOpeningId(linked.openingId);
      return;
    }
    if (applications.some((a) => a.id === linked.id)) {
      setDetailId(linked.id);
      setLinked(null);
    }
  }, [
    linked,
    companyId,
    hiringCompanies,
    onSelectCompany,
    openings,
    openingsLoading,
    openingId,
    applications,
  ]);

  // Keep the open applicant in the address bar so the page can be shared.
  useEffect(() => {
    if (linked) return;
    const url = new URL(window.location.href);
    if (detailId) url.searchParams.set('application', detailId);
    else url.searchParams.delete('application');
    window.history.replaceState(null, '', url.toString());
  }, [detailId, linked]);

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

  const visible =
    stageFilter === 'ALL'
      ? searched
      : searched.filter((a) => a.stage === stageFilter);

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

  /* --------------------------------- render -------------------------------- */

  if (!hiringCompanies.length)
    return (
      <NeedsCompany text="You don’t have hiring access in any company yet. Ask an owner to give you a role with Hiring access." />
    );

  const status = opening ? OPENING_STATUS_META[opening.status] : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <CompanyPicker
          companies={hiringCompanies}
          value={companyId}
          onChange={onSelectCompany}
        />
        <div className="flex-1" />
        {companyId && can(companyId, 'hiring:create') && (
          <AdminButton
            tone="primary"
            icon="add"
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            New opening
          </AdminButton>
        )}
      </div>

      {!companyId ? (
        <NeedsCompany text="Choose a company to see its openings." />
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
          />
        </Panel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            {openings.map((o) => (
              <OpeningCard
                key={o.id}
                opening={o}
                active={o.id === openingId}
                onClick={() => setOpeningId(o.id)}
              />
            ))}
          </div>

          {opening && (
            <div className="flex min-w-0 flex-col gap-4">
              <Panel className="flex flex-col gap-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-white">
                        {opening.title}
                      </h2>
                      <Pill tone={status?.tone}>{status?.label}</Pill>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {[
                        opening.department,
                        opening.location,
                        opening.employmentType,
                        `${opening.fields?.length ?? 0} questions`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {canEdit && opening.status !== JOB_OPENING_STATUS.OPEN && (
                      <AdminButton
                        size="sm"
                        tone="primary"
                        icon="rocket_launch"
                        loading={busy}
                        onClick={() =>
                          setOpeningStatus(JOB_OPENING_STATUS.OPEN)
                        }
                      >
                        {opening.status === JOB_OPENING_STATUS.DRAFT
                          ? 'Publish'
                          : 'Reopen'}
                      </AdminButton>
                    )}
                    {canEdit && opening.status === JOB_OPENING_STATUS.OPEN && (
                      <AdminButton
                        size="sm"
                        icon="lock"
                        loading={busy}
                        onClick={() =>
                          setOpeningStatus(JOB_OPENING_STATUS.CLOSED)
                        }
                      >
                        Close
                      </AdminButton>
                    )}
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
                  </div>
                </div>

                {opening.status !== JOB_OPENING_STATUS.DRAFT ? (
                  <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-neutral-900/60 px-3 py-2">
                    <Icon
                      name="link"
                      className="text-[18px] text-neutral-500"
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-neutral-300">
                      {applyUrl(opening.slug)}
                    </span>
                    <CopyButton
                      value={applyUrl(opening.slug)}
                      label="Copy link"
                    />
                    <IconAction
                      icon="open_in_new"
                      label="Open apply page"
                      onClick={() =>
                        window.open(applyUrl(opening.slug), '_blank')
                      }
                    />
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-xs text-neutral-500">
                    <Icon name="info" className="text-[16px]" />
                    Publish the opening to get a link candidates can apply
                    through.
                  </p>
                )}
              </Panel>

              <div className="flex flex-wrap items-center gap-3">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search applicants…"
                  className="min-w-[200px] flex-1"
                />
                <Segmented
                  value={view}
                  onChange={setView}
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
                    onClick={() => setComposeIds(Array.from(selected))}
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
              ) : view === 'board' ? (
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
                          {rows.map((a) => (
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
          )}
        </div>
      )}

      {companyId && (
        <OpeningEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          companyId={companyId}
          opening={editing}
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
        users={users}
        canEdit={canEdit}
        onClose={() => setDetailId(null)}
        onUpdated={(updated) => replaceApplications([updated])}
        onEmail={detail ? () => setComposeIds([detail.id]) : undefined}
      />
      {companyId && opening && (
        <EmailComposer
          open={!!composeIds && composeRecipients.length > 0}
          onOpenChange={(open) => !open && setComposeIds(null)}
          companyId={companyId}
          companyName={companyName}
          role={opening.title}
          recipients={composeRecipients}
          canEditTemplates={canEdit}
          onSent={(result) => {
            replaceApplications(result.applications);
            if (!result.failed) setSelected(new Set());
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
      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(null)}
        title={`Archive ${archiving?.title ?? 'opening'}?`}
        message="It disappears from this list and its apply link stops working. Every application is kept."
        confirmLabel="Archive"
        loading={busy}
        onConfirm={archive}
      />
    </div>
  );
};
