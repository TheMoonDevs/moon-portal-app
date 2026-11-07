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

/** The list's groups, each one opening and closing; done and dropped start closed. */
const GROUPS: { key: string; label: string; status: PLAN_STATUS }[] = [
  { key: 'idea', label: 'Ideas', status: PLAN_STATUS.IDEA },
  { key: 'active', label: 'Active', status: PLAN_STATUS.ACTIVE },
  { key: 'done', label: 'Done', status: PLAN_STATUS.DONE },
  { key: 'dropped', label: 'Dropped', status: PLAN_STATUS.DROPPED },
];
const OPEN_AT_FIRST = ['idea', 'active'];
const OPEN_KEY = 'plans-open-groups';

/** Which groups are open, kept for next time in this browser. */
const useOpenGroups = () => {
  const [open, setOpen] = useState<string[]>(OPEN_AT_FIRST);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(OPEN_KEY) ?? 'null');
      if (Array.isArray(saved)) setOpen(saved);
    } catch {
      // Nothing kept: the first groups stay open.
    }
  }, []);
  const toggle = (key: string) =>
    setOpen((list) => {
      const next = list.includes(key)
        ? list.filter((k) => k !== key)
        : [...list, key];
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify(next));
      } catch {
        // Not kept; it still works for now.
      }
      return next;
    });
  return { open, toggle };
};

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
  const groups = useOpenGroups();
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
          const plans = shown.filter((p) => p.status === group.status);
          if (!plans.length) return null;
          // A search shows every match, closed groups too.
          const open = !!q || groups.open.includes(group.key);
          const hasSelected = plans.some((p) => p.id === selectedId);
          return (
            <div key={group.key} className="mb-1">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => !q && groups.toggle(group.key)}
                className="group/head flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-300"
              >
                <Icon
                  name="chevron_right"
                  className={cn(
                    'text-[16px] transition-transform',
                    open && 'rotate-90',
                  )}
                />
                {group.label}
                <span className="font-normal">{plans.length}</span>
                {!open && hasSelected && (
                  <span
                    className="ml-auto size-1.5 rounded-full bg-sky-400"
                    title="The open plan is in here"
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
                        'flex w-full flex-col gap-1 rounded-lg py-2 pl-[30px] pr-3 text-left transition-colors',
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
  const [freshId, setFreshId] = useState<string | null>(null);
  // On a phone one panel shows at a time.
  const [view, setView] = useState<'list' | 'plan'>('list');

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
    setView(id ? 'plan' : 'list');
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

  // The picked step in full, under it in the steps.
  const details = plan && choices && step && (
    <StepPanel
      plan={plan}
      step={step}
      projects={choices.projects}
      stepProjects={choices.stepProjects}
      people={choices.people}
      canEdit={canEditPlan}
      canMakeTask={addsTasksIn(step.projectId)}
      onChange={changeStep}
      onRemove={removeStep}
      onAddNote={(text) => plans.addNote(plan.id, step.id, text)}
      onRefresh={() => plans.refresh(plan.id)}
      onDeleteTask={() => deleteStepTask(step.id)}
      onClose={() => selectStep(null)}
    />
  );

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
        onMakeTask={(stepId, quiet) => plans.makeTask(plan.id, stepId, quiet)}
        onTickTask={(stepId, done) => plans.setTaskDone(plan.id, stepId, done)}
        onTaskChange={(stepId, fields) =>
          plans.updateStepTask(plan.id, stepId, fields)
        }
        onAddNote={(stepId, text) => plans.addNote(plan.id, stepId, text)}
        onShare={(change) => plans.share(plan.id, change)}
        meId={plans.meId}
        onDeleteTask={(stepId) => deleteStepTask(stepId)}
        stepDetails={details}
      />
    ) : (
      <EmptyState
        icon="lightbulb"
        title={data?.plans.length ? 'Pick a plan' : 'No plans yet'}
        description="A plan can start as just an idea. A grand plan can span many projects; link it to one project to make it that project's plan. Steps can be plain text, tasks (type / to link one) or goals. Plans of your own, like a workout or reading plan, go in Personal, where only you see them."
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
          <PanelGroup direction="horizontal" autoSaveId="plans-panels-2">
            <ResizablePanel defaultSize={22} minSize={15} maxSize={35}>
              {list}
            </ResizablePanel>
            <Handle />
            <ResizablePanel defaultSize={78} minSize={50}>
              {editor}
            </ResizablePanel>
          </PanelGroup>
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
