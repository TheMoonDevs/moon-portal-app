'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  HIRE_TYPE_LABEL,
  hireNext,
  STEP_LABEL,
  STEPS,
  trialDay,
} from '@/lib/onboarding/meta';
import { cn } from '@/lib/utils';
import { ONBOARDING_STEP } from '@/models/onboarding';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  EmptyState,
  Icon,
  Panel,
  Pill,
  Segmented,
  SkeletonRows,
  UserAvatar,
} from '../shared/AdminUI';
import { CompanyPicker, errorText, NeedsCompany } from '../Workspace/shared';
import { DocumentTemplates } from './DocumentTemplates';
import { HireDrawer } from './HireDrawer';
import {
  ago,
  type BoardData,
  type Hire,
  type ReadyApplicant,
} from './onboardingClient';
import { StartDialog } from './OnboardingDialogs';

const COLUMNS = [
  ONBOARDING_STEP.DETAILS,
  ONBOARDING_STEP.AGREEMENTS,
  ONBOARDING_STEP.TRIAL,
  ONBOARDING_STEP.OFFER,
];

const COLUMN_HINT: Record<string, string> = {
  [ONBOARDING_STEP.DETAILS]: 'Details form and photo',
  [ONBOARDING_STEP.AGREEMENTS]: 'Trial Policy and NDA',
  [ONBOARDING_STEP.TRIAL]: 'In the Portal, no Claude yet',
  [ONBOARDING_STEP.OFFER]: 'Offer letter to sign',
};

type View = 'board' | 'hired' | 'ended' | 'documents';

const EMPTY: BoardData = {
  hires: [],
  companyName: '',
  people: [],
  projects: [],
  readyToOnboard: [],
};

const HireCard = ({ hire, onOpen }: { hire: Hire; onOpen: () => void }) => {
  const next = hireNext(hire);
  const trial =
    hire.step === ONBOARDING_STEP.TRIAL
      ? trialDay(hire.trialStartsOn, hire.trialEndsOn)
      : null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex w-full flex-col gap-2.5 rounded-xl border bg-neutral-900/80 p-3 text-left transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-black/30',
        next.who === 'you'
          ? 'border-amber-400/30 hover:border-amber-300/50'
          : 'border-white/[0.07] hover:border-white/20',
      )}
    >
      <div className="flex items-center gap-2.5">
        <UserAvatar src={hire.avatar} name={hire.name} size={34} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-100">
            {hire.name}
          </p>
          <p className="truncate text-[11px] text-neutral-500">
            {hire.terms?.role ?? hire.openingTitle ?? hire.email}
          </p>
        </div>
        {hire.terms && (
          <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-neutral-400">
            {HIRE_TYPE_LABEL[hire.terms.hireType]}
          </span>
        )}
      </div>
      {trial && trial.day >= 1 && (
        <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={cn(
              'h-full rounded-full',
              next.who === 'you' ? 'bg-amber-300' : 'bg-emerald-400',
            )}
            style={{
              width: `${Math.min(100, (trial.day / trial.total) * 100)}%`,
            }}
          />
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        {next.who === 'you' ? (
          <Pill tone="warning" icon="front_hand">
            {next.short}
          </Pill>
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-neutral-400">
            <Icon
              name="hourglass_top"
              className="text-[13px] text-neutral-500"
            />
            {next.short}
          </span>
        )}
        <span className="text-[10px] text-neutral-600">
          {ago(hire.updatedAt as string)}
        </span>
      </div>
    </button>
  );
};

/**
 * Onboarding: everyone the hiring team marked Hired, from the details form
 * to their first day as a full member. One column per step; a hire whose
 * next move is the team's is marked "Your move".
 */
export const AdminOnboarding = ({
  selectedCompanyId,
  onSelectCompany,
}: {
  selectedCompanyId: string | null;
  onSelectCompany: (companyId: string) => void;
}) => {
  const { hiringCompanies, can } = useWorkspace();
  const companyId = hiringCompanies.some(
    (c) => c.company.id === selectedCompanyId,
  )
    ? selectedCompanyId
    : (hiringCompanies[0]?.company.id ?? null);
  const canEdit = can(companyId, 'hiring:edit');

  const [board, setBoard] = useState<BoardData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('board');
  const [openId, setOpenId] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [preset, setPreset] = useState<ReadyApplicant | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!companyId) return;
      if (!silent) setLoading(true);
      try {
        const res = await PortalSdk.getData(
          `/api/onboarding?companyId=${companyId}`,
          null,
        );
        setBoard({ ...EMPTY, ...res.data });
      } catch (err) {
        if (!silent) toast.error(errorText(err, 'Could not load onboarding.'));
      } finally {
        setLoading(false);
      }
    },
    [companyId],
  );

  useEffect(() => {
    setBoard(EMPTY);
    load();
  }, [load]);

  // Opened from a link or a notification: ?hire=<id>.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('hire');
    if (id) setOpenId(id);
  }, []);

  // Opened from an applicant marked Hired: ?start=<applicationId>.
  const [startFrom, setStartFrom] = useState<{
    app: string;
    company: string | null;
  } | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const app = params.get('start');
    if (app) setStartFrom({ app, company: params.get('companyId') });
  }, []);
  useEffect(() => {
    if (!startFrom || loading) return;
    if (startFrom.company && startFrom.company !== companyId) return;
    const ready = board.readyToOnboard.find(
      (r) => r.applicationId === startFrom.app,
    );
    setStartFrom(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('start');
    window.history.replaceState(null, '', url.toString());
    if (!ready || !canEdit) return;
    setPreset(ready);
    setStartOpen(true);
  }, [startFrom, loading, companyId, board.readyToOnboard, canEdit]);

  const openHire = (id: string | null) => {
    setOpenId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('hire', id);
    else url.searchParams.delete('hire');
    window.history.replaceState(null, '', url.toString());
  };

  const upsert = (hire: Hire) =>
    setBoard((b) => ({
      ...b,
      hires: [hire, ...b.hires.filter((h) => h.id !== hire.id)],
      readyToOnboard: b.readyToOnboard.filter(
        (r) => r.applicationId !== hire.applicationId,
      ),
    }));

  const live = useMemo(
    () => board.hires.filter((h) => COLUMNS.includes(h.step)),
    [board.hires],
  );
  const hired = board.hires.filter((h) => h.step === ONBOARDING_STEP.HIRED);
  const ended = board.hires.filter((h) => h.step === ONBOARDING_STEP.ENDED);
  const yourMove = live.filter((h) => hireNext(h).who === 'you');
  const open = board.hires.find((h) => h.id === openId) ?? null;

  if (!companyId)
    return (
      <NeedsCompany text="You need hiring access in a company to onboard people." />
    );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <CompanyPicker
          companies={hiringCompanies}
          value={companyId}
          onChange={onSelectCompany}
        />
        <div className="flex-1" />
        {canEdit && (
          <AdminButton
            tone="primary"
            icon="person_add"
            onClick={() => {
              setPreset(null);
              setStartOpen(true);
            }}
          >
            Start onboarding
          </AdminButton>
        )}
      </div>

      <div className="custom-scrollbar -mx-1 overflow-x-auto px-1 pb-1">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            {
              value: 'board',
              label: 'In progress',
              icon: 'view_kanban',
              count: live.length,
            },
            {
              value: 'hired',
              label: 'Hired',
              icon: 'verified',
              count: hired.length,
            },
            {
              value: 'ended',
              label: 'Ended',
              icon: 'block',
              count: ended.length,
            },
            { value: 'documents', label: 'Documents', icon: 'description' },
          ]}
        />
      </div>

      {view === 'documents' ? (
        <DocumentTemplates
          companyId={companyId}
          board={board}
          canEdit={canEdit}
        />
      ) : loading && !board.hires.length ? (
        <Panel>
          <SkeletonRows rows={4} />
        </Panel>
      ) : view === 'board' ? (
        <>
          {canEdit && board.readyToOnboard.length > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/[0.06] p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex -space-x-2">
                  {board.readyToOnboard.slice(0, 4).map((r) => (
                    <UserAvatar
                      key={r.applicationId}
                      name={r.name}
                      size={30}
                      className="ring-2 ring-neutral-950"
                    />
                  ))}
                </div>
                <p className="text-sm text-sky-100">
                  {board.readyToOnboard.length === 1
                    ? `${board.readyToOnboard[0].name} was hired and is ready to onboard.`
                    : `${board.readyToOnboard.length} hired applicants are ready to onboard.`}
                </p>
              </div>
              <AdminButton
                size="sm"
                icon="send"
                onClick={() => {
                  setPreset(board.readyToOnboard[0]);
                  setStartOpen(true);
                }}
              >
                Send their details form
              </AdminButton>
            </div>
          )}

          {yourMove.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="flex items-center gap-1.5 text-amber-200">
                <Icon name="front_hand" className="text-[16px]" />
                Your move:
              </span>
              {yourMove.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => openHire(h.id)}
                  className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-100 hover:bg-amber-500/20"
                >
                  {h.name.split(' ')[0]} · {hireNext(h).short}
                </button>
              ))}
            </div>
          )}

          {live.length === 0 ? (
            <Panel>
              <EmptyState
                icon="how_to_reg"
                title="Nobody is onboarding right now"
                description="Move an applicant to Hired, or start onboarding someone here. They get a details form first, then their agreements, then their Portal sign-in."
                action={
                  canEdit ? (
                    <AdminButton
                      size="sm"
                      icon="person_add"
                      onClick={() => setStartOpen(true)}
                    >
                      Start onboarding
                    </AdminButton>
                  ) : undefined
                }
              />
            </Panel>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {COLUMNS.map((step) => {
                const items = live.filter((h) => h.step === step);
                const meta = STEPS.find((s) => s.step === step)!;
                return (
                  <div
                    key={step}
                    className="flex min-w-0 flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-2.5"
                  >
                    <div className="flex items-center gap-2 px-1 pb-1">
                      <Icon
                        name={meta.icon}
                        className="text-[16px] text-neutral-500"
                      />
                      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                        {STEP_LABEL[step]}
                      </span>
                      <span className="rounded bg-white/[0.06] px-1.5 text-[10px] text-neutral-400">
                        {items.length}
                      </span>
                      <span className="ml-auto truncate text-[10px] text-neutral-600">
                        {COLUMN_HINT[step]}
                      </span>
                    </div>
                    {items.map((h) => (
                      <HireCard
                        key={h.id}
                        hire={h}
                        onOpen={() => openHire(h.id)}
                      />
                    ))}
                    {!items.length && (
                      <p className="rounded-xl border border-dashed border-white/[0.06] px-3 py-6 text-center text-[11px] text-neutral-600">
                        Nobody here
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <Panel>
          {(view === 'hired' ? hired : ended).length === 0 ? (
            <EmptyState
              icon={view === 'hired' ? 'verified' : 'block'}
              title={
                view === 'hired' ? 'Nobody fully hired yet' : 'Nothing ended'
              }
            />
          ) : (
            <div className="flex flex-col divide-y divide-white/[0.05]">
              {(view === 'hired' ? hired : ended).map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => openHire(h.id)}
                  className="flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03]"
                >
                  <UserAvatar src={h.avatar} name={h.name} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">
                      {h.name}
                    </span>
                    <span className="block truncate text-xs text-neutral-500">
                      {h.offer?.role ??
                        h.terms?.role ??
                        h.openingTitle ??
                        h.email}
                    </span>
                  </span>
                  <span className="text-xs text-neutral-500">
                    {view === 'hired'
                      ? `Hired ${ago(h.hiredAt)}`
                      : `Ended ${ago(h.endedAt)}`}
                  </span>
                  <Icon
                    name="chevron_right"
                    className="text-[18px] text-neutral-600"
                  />
                </button>
              ))}
            </div>
          )}
        </Panel>
      )}

      <HireDrawer
        hire={open}
        board={board}
        canEdit={canEdit}
        onClose={() => openHire(null)}
        onUpdated={upsert}
      />
      <StartDialog
        open={startOpen}
        onOpenChange={setStartOpen}
        companyId={companyId}
        board={board}
        preset={preset}
        onStarted={(hire) => {
          upsert(hire);
          openHire(hire.id);
        }}
      />
    </div>
  );
};
