'use client';

import { useMediaQuery } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import {
  Panel as ResizablePanel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import { Toaster } from 'sonner';

import { cn } from '@/lib/utils';
import { PLAN_STATUS_META } from '@/lib/workspace/plans';
import { PLAN_STATUS } from '@/models/workspace';
import { useWorkspace } from '@/utils/hooks/useWorkspace';

import {
  AdminButton,
  ConfirmDialog,
  EmptyState,
  Icon,
  NativeSelect,
  SearchInput,
  Spin,
} from '../Admin/shared/AdminUI';
import { PlanEditor, StepPanel } from './PlanEditor';
import type { PlansData, PlanView, StepView } from './types';
import { isPast, shortDay, stepCount } from './types';
import { ALL_COMPANIES, usePlans } from './usePlans';

/* -------------------------------------------------------------------------- */
/*                                The plan list                               */
/* -------------------------------------------------------------------------- */

const GROUPS: { label: string; statuses: PLAN_STATUS[] }[] = [
  { label: 'Active', statuses: [PLAN_STATUS.ACTIVE] },
  { label: 'Ideas', statuses: [PLAN_STATUS.IDEA] },
  { label: 'Finished', statuses: [PLAN_STATUS.DONE, PLAN_STATUS.DROPPED] },
];

type Kind = 'all' | 'grand' | 'project';
const KINDS: { value: Kind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'grand', label: 'Grand' },
  { value: 'project', label: 'Project' },
];

const PlanList = ({
  data,
  selectedId,
  onSelect,
  showCompany,
}: {
  data: PlansData;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Name each plan's company, when several are listed. */
  showCompany: boolean;
}) => {
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const [showFinished, setShowFinished] = useState(false);
  const projectById = useMemo(
    () => new Map(data.projects.map((p) => [p.id, p])),
    [data.projects],
  );
  const companyById = useMemo(
    () => new Map(data.companies.map((c) => [c.id, c])),
    [data.companies],
  );
  const q = search.trim().toLowerCase();
  const matchesKind = (p: PlanView) =>
    kind === 'all' || (kind === 'grand') === !p.projectId;
  const shown = data.plans.filter(
    (p) =>
      matchesKind(p) &&
      (!q ||
        p.title.toLowerCase().includes(q) ||
        (p.notes ?? '').toLowerCase().includes(q) ||
        (!!p.projectId &&
          (projectById.get(p.projectId)?.name ?? '')
            .toLowerCase()
            .includes(q))),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-2 p-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search plans…"
        />
        <div className="flex items-center gap-1">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              title={
                k.value === 'grand'
                  ? 'Plans across many projects'
                  : k.value === 'project'
                    ? 'Plans linked to one project'
                    : undefined
              }
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                kind === k.value
                  ? 'bg-white/[0.1] text-white'
                  : 'text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-300',
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-6">
        {GROUPS.map((group) => {
          const plans = shown.filter((p) =>
            group.statuses.includes(p.status as PLAN_STATUS),
          );
          if (!plans.length) return null;
          const finished = group.label === 'Finished';
          const open = !finished || showFinished || !!q;
          return (
            <div key={group.label} className="mb-3">
              <button
                type="button"
                onClick={() => finished && setShowFinished((v) => !v)}
                className="flex w-full items-center gap-1 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500"
              >
                {group.label}
                <span className="font-normal">{plans.length}</span>
                {finished && !q && (
                  <Icon
                    name={open ? 'expand_less' : 'expand_more'}
                    className="ml-auto text-[16px]"
                  />
                )}
              </button>
              {open &&
                plans.map((plan) => {
                  const count = stepCount(plan);
                  const projectIds = Array.from(
                    new Set(plan.steps.map((s) => s.projectId).filter(Boolean)),
                  ) as string[];
                  const linked = plan.projectId
                    ? projectById.get(plan.projectId)
                    : undefined;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => onSelect(plan.id)}
                      className={cn(
                        'flex w-full flex-col gap-1 rounded-lg px-3 py-2 text-left transition-colors',
                        plan.id === selectedId
                          ? 'bg-white/[0.08]'
                          : 'hover:bg-white/[0.04]',
                      )}
                    >
                      <span className="truncate text-sm font-medium text-neutral-100">
                        {plan.title || 'Untitled plan'}
                      </span>
                      <span className="flex min-w-0 items-center gap-2 text-[11px] text-neutral-500">
                        {showCompany && (
                          <span className="max-w-[90px] shrink-0 truncate text-neutral-400">
                            {companyById.get(plan.companyId)?.name}
                          </span>
                        )}
                        {linked ? (
                          <span
                            className="flex min-w-0 items-center gap-1 truncate rounded-full bg-white/[0.05] px-1.5 py-px text-neutral-300"
                            title="Project plan"
                          >
                            <span
                              className="size-1.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: linked.color || '#525252',
                              }}
                            />
                            <span className="truncate">{linked.name}</span>
                          </span>
                        ) : (
                          projectIds.length > 1 && (
                            <span
                              className="flex shrink-0 items-center gap-0.5 text-violet-300/80"
                              title="Grand plan"
                            >
                              <Icon name="hub" className="text-[12px]" />
                            </span>
                          )
                        )}
                        {!linked && projectIds.length > 0 && (
                          <span className="flex items-center gap-0.5">
                            {projectIds.slice(0, 4).map((id) => (
                              <span
                                key={id}
                                title={projectById.get(id)?.name}
                                className="size-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    projectById.get(id)?.color || '#525252',
                                }}
                              />
                            ))}
                          </span>
                        )}
                        {count.total > 0 && (
                          <span>
                            {count.done}/{count.total} steps
                          </span>
                        )}
                        {plan.endOn && (
                          <span
                            className={cn(
                              plan.status !== PLAN_STATUS.DONE &&
                                isPast(plan.endOn) &&
                                'text-rose-300',
                            )}
                          >
                            by {shortDay(plan.endOn)}
                          </span>
                        )}
                        {!count.total && !plan.endOn && (
                          <span className="truncate">
                            {PLAN_STATUS_META[plan.status as PLAN_STATUS]?.hint}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
            </div>
          );
        })}
        {!shown.length && (
          <p className="px-3 py-6 text-center text-xs text-neutral-500">
            {q ? 'No plans match.' : 'No plans yet.'}
          </p>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                  The page                                  */
/* -------------------------------------------------------------------------- */

const Handle = () => (
  <PanelResizeHandle className="group relative w-px bg-white/[0.07] transition-colors data-[resize-handle-state=drag]:bg-white/30 data-[resize-handle-state=hover]:bg-white/20">
    <span className="absolute -inset-x-1.5 inset-y-0" />
  </PanelResizeHandle>
);

export const PlansPage = () => {
  const { companies, loading: loadingWorkspace } = useWorkspace();
  const wide = useMediaQuery('(min-width: 1024px)');
  const readable = useMemo(
    () => companies.filter((c) => c.permissions.includes('tasks:read')),
    [companies],
  );

  // Every company's plans at first.
  const [companyId, setCompanyId] = useState<string>(ALL_COMPANIES);
  const [pickingCompany, setPickingCompany] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [stepId, setStepId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [makingTask, setMakingTask] = useState(false);
  const [freshId, setFreshId] = useState<string | null>(null);
  // On a phone one panel shows at a time.
  const [view, setView] = useState<'list' | 'plan' | 'step'>('list');

  const plans = usePlans(companyId);
  const { data, loading, saveState, change, flush } = plans;

  useEffect(() => {
    setPlanId(null);
    setStepId(null);
    setView('list');
  }, [companyId]);

  const showAll = companyId === ALL_COMPANIES;
  const loaded = data?.companies ?? [];
  const creatable = loaded.filter((c) => data?.can[c.id]?.create);

  const plan = data?.plans.find((p) => p.id === planId) ?? null;
  const step = plan?.steps.find((s) => s.id === stepId) ?? null;
  const { addsTasksIn } = plans;
  const canEditPlan = !!plan && plans.canEdit(plan);
  const canDeletePlan = !!plan && plans.canDelete(plan);

  // The address names the open plan and step: /plans?plan_id=…&step_id=…
  const setAddress = (plan: string | null, step: string | null) => {
    const url = new URL(window.location.href);
    if (plan) url.searchParams.set('plan_id', plan);
    else url.searchParams.delete('plan_id');
    if (plan && step) url.searchParams.set('step_id', step);
    else url.searchParams.delete('step_id');
    window.history.replaceState(window.history.state, '', url);
  };

  const selectPlan = (id: string | null, step: string | null = null) => {
    if (planId && planId !== id) flush(planId);
    setPlanId(id);
    setStepId(step);
    setView(step && !wide ? 'step' : id ? 'plan' : 'list');
    setAddress(id, step);
  };

  // Open the plan (and step) the address names, once the plans are in.
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (opened || !data) return;
    setOpened(true);
    const params = new URLSearchParams(window.location.search);
    const want = params.get('plan_id');
    const found = want && data.plans.find((p) => p.id === want);
    if (!found) return;
    const step = params.get('step_id');
    setPlanId(found.id);
    setStepId(found.steps.some((s) => s.id === step) ? step : null);
    setView('plan');
  }, [data, opened]);

  /** A new plan; with every company shown, `inCompany` says where. */
  const createPlan = async (inCompany?: string) => {
    const where =
      inCompany ?? (showAll ? creatable[0]?.id : companyId) ?? undefined;
    if (showAll && !inCompany && creatable.length > 1) {
      setPickingCompany(true);
      return;
    }
    setPickingCompany(false);
    setCreating(true);
    const created = await plans.create({ companyId: where });
    setCreating(false);
    if (!created) return;
    selectPlan(created.id);
    setFreshId(created.id);
  };

  const deletePlan = async () => {
    if (!plan) return;
    setDeleting(true);
    const gone = await plans.remove(plan.id);
    setDeleting(false);
    if (!gone) return;
    selectPlan(null);
    setConfirmDelete(false);
  };

  const changeStep = (fields: Partial<StepView>) =>
    plan &&
    step &&
    change(plan.id, (p) => ({
      ...p,
      steps: p.steps.map((s) => (s.id === step.id ? { ...s, ...fields } : s)),
    }));

  const removeStep = () => {
    if (!plan || !step) return;
    change(plan.id, (p) => ({
      ...p,
      steps: p.steps.filter((s) => s.id !== step.id),
    }));
    setStepId(null);
    setView('plan');
  };

  const makeTask = async () => {
    if (!plan || !step) return;
    setMakingTask(true);
    await plans.makeTask(plan.id, step.id);
    setMakingTask(false);
  };

  /** Deletes a step and the task it links to. */
  const deleteStepTask = async (id: string) => {
    if (!plan) return false;
    const done = await plans.deleteStepTask(plan.id, id);
    if (done && stepId === id) selectStep(null);
    return done;
  };

  const selectStep = (id: string | null) => {
    setStepId(id);
    if (id && !wide) setView('step');
    setAddress(planId, id);
  };

  /* ------------------------------- panels ------------------------------- */

  const list = data && (
    <PlanList
      data={data}
      selectedId={planId}
      onSelect={selectPlan}
      showCompany={showAll && loaded.length > 1}
    />
  );

  const choices = plan ? plans.choicesFor(plan) : null;

  const editor =
    plan && data && choices ? (
      <PlanEditor
        key={plan.id}
        plan={plan}
        projects={choices.projects}
        stepProjects={choices.stepProjects}
        companyName={
          showAll && loaded.length > 1
            ? loaded.find((c) => c.id === plan.companyId)?.name
            : undefined
        }
        people={choices.people}
        canEdit={canEditPlan}
        canDelete={canDeletePlan}
        selectedStepId={stepId}
        onSelectStep={selectStep}
        onChange={(update) => change(plan.id, update)}
        onDelete={() => setConfirmDelete(true)}
        onBack={wide ? undefined : () => setView('list')}
        fresh={plan.id === freshId}
        addsTasksIn={plans.addsTasksIn}
        onMakeTask={(stepId) => plans.makeTask(plan.id, stepId)}
        onShare={(change) => plans.share(plan.id, change)}
        meId={plans.meId}
        onDeleteTask={(stepId) => deleteStepTask(stepId)}
      />
    ) : (
      <EmptyState
        icon="lightbulb"
        title={data?.plans.length ? 'Pick a plan' : 'No plans yet'}
        description="A plan can start as just an idea. A grand plan can span many projects; link it to one project to make it that project's plan. Steps can be plain text, tasks (type / to link one) or goals."
        action={
          plans.canCreate && (
            <AdminButton
              tone="primary"
              icon="add"
              loading={creating}
              onClick={() => createPlan()}
            >
              New plan
            </AdminButton>
          )
        }
        className="h-full"
      />
    );

  const side = plan && data && choices && (
    <StepPanel
      plan={plan}
      step={step}
      projects={choices.projects}
      stepProjects={choices.stepProjects}
      people={choices.people}
      canEdit={canEditPlan}
      canMakeTask={addsTasksIn(step?.projectId)}
      makingTask={makingTask}
      onChange={changeStep}
      onRemove={removeStep}
      onMakeTask={makeTask}
      onAddNote={(text) =>
        step ? plans.addNote(plan.id, step.id, text) : Promise.resolve(false)
      }
      onRefresh={() => plans.refresh(plan.id)}
      onOpenStep={selectStep}
      onDeleteTask={() =>
        step ? deleteStepTask(step.id) : Promise.resolve(false)
      }
      onClose={() => {
        selectStep(null);
        if (!wide) setView('plan');
      }}
    />
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-neutral-950 pb-[72px] text-neutral-100 md:left-16 md:pb-0">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.07] px-4">
        <h1 className="flex items-center gap-2 text-base font-semibold text-white">
          <Icon name="map" className="text-[20px] text-neutral-400" />
          Plans
        </h1>
        {readable.length > 1 && (
          <NativeSelect
            aria-label="Company"
            value={companyId}
            onChange={(e) => {
              if (planId) flush(planId);
              setCompanyId(e.target.value);
            }}
            className="h-9 w-auto min-w-[150px]"
          >
            <option value={ALL_COMPANIES}>Show all</option>
            {readable.map(({ company }) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </NativeSelect>
        )}
        <div className="flex-1" />
        {plan && (
          <span className="hidden items-center gap-1 text-xs text-neutral-500 sm:flex">
            {saveState === 'saving' ? (
              <>
                <Spin className="size-3" /> Saving
              </>
            ) : saveState === 'error' ? (
              <span className="text-rose-300">Not saved</span>
            ) : (
              <>
                <Icon name="cloud_done" className="text-[15px]" /> Saved
              </>
            )}
          </span>
        )}
        {plans.canCreate && (
          <div className="relative">
            <AdminButton
              tone="primary"
              size="sm"
              icon="add"
              loading={creating}
              onClick={() =>
                pickingCompany ? setPickingCompany(false) : createPlan()
              }
            >
              New plan
            </AdminButton>
            {pickingCompany && (
              <div className="absolute right-0 top-11 z-30 w-56 rounded-xl border border-white/10 bg-neutral-900 p-1.5 shadow-2xl">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  New plan in
                </p>
                {creatable.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => createPlan(c.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-neutral-200 hover:bg-white/[0.06]"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: c.color || '#525252' }}
                    />
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1">
        {!loadingWorkspace && !readable.length ? (
          <EmptyState
            icon="domain"
            title="No company yet"
            description="Plans live in a company. Once you are in one, its plans show here."
            className="h-full"
          />
        ) : !data ? (
          <div className="flex h-full items-center justify-center">
            {loading || loadingWorkspace ? <Spin className="size-5" /> : null}
          </div>
        ) : wide ? (
          <PanelGroup direction="horizontal" autoSaveId="plans-panels">
            <ResizablePanel defaultSize={22} minSize={15} maxSize={35}>
              {list}
            </ResizablePanel>
            <Handle />
            <ResizablePanel defaultSize={50} minSize={30}>
              {editor}
            </ResizablePanel>
            {side && (
              <>
                <Handle />
                <ResizablePanel defaultSize={28} minSize={20} maxSize={45}>
                  {side}
                </ResizablePanel>
              </>
            )}
          </PanelGroup>
        ) : view === 'step' && step ? (
          side
        ) : view !== 'list' && plan ? (
          editor
        ) : data.plans.length ? (
          list
        ) : (
          editor
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${plan?.title || 'this plan'}?`}
        message="The plan and its steps go away. Tasks made from its steps stay in their projects."
        confirmLabel="Delete plan"
        loading={deleting}
        onConfirm={deletePlan}
      />
      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  );
};
