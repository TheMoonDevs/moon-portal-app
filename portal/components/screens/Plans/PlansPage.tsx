'use client';

import { useMediaQuery } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Panel as ResizablePanel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import { toast, Toaster } from 'sonner';

import { cn } from '@/lib/utils';
import { PLAN_STATUS_META } from '@/lib/workspace/plans';
import { PLAN_STATUS } from '@/models/workspace';
import { useUser } from '@/utils/hooks/useUser';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  ConfirmDialog,
  EmptyState,
  Icon,
  SearchInput,
  Spin,
} from '../Admin/shared/AdminUI';
import { CompanyPicker, errorText } from '../Admin/Workspace/shared';
import { PlanEditor, StepPanel } from './PlanEditor';
import { PlanSchedules } from './PlanSchedules';
import type { PlansData, PlanView, StepView } from './types';
import { isPast, shortDay, stepCount } from './types';

const COMPANY_KEY = 'plans:company';
const SAVE_AFTER_MS = 700;

/** What a save sends: the plan's own fields, not the tasks' status. */
const payload = (plan: PlanView) => ({
  title: plan.title.trim() || 'Untitled plan',
  notes: plan.notes ?? null,
  status: plan.status,
  startOn: plan.startOn ?? null,
  endOn: plan.endOn ?? null,
  ownerId: plan.ownerId,
  memberIds: plan.memberIds ?? [],
  steps: plan.steps
    .filter((s) => s.text.trim())
    .map(({ task: _task, ...s }) => s),
});

const readStored = () => {
  try {
    return localStorage.getItem(COMPANY_KEY);
  } catch {
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/*                                The plan list                               */
/* -------------------------------------------------------------------------- */

const GROUPS: { label: string; statuses: PLAN_STATUS[] }[] = [
  { label: 'Active', statuses: [PLAN_STATUS.ACTIVE] },
  { label: 'Ideas', statuses: [PLAN_STATUS.IDEA] },
  { label: 'Finished', statuses: [PLAN_STATUS.DONE, PLAN_STATUS.DROPPED] },
];

const PlanList = ({
  data,
  selectedId,
  onSelect,
}: {
  data: PlansData;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) => {
  const [search, setSearch] = useState('');
  const [showFinished, setShowFinished] = useState(false);
  const projectById = useMemo(
    () => new Map(data.projects.map((p) => [p.id, p])),
    [data.projects],
  );
  const q = search.trim().toLowerCase();
  const shown = data.plans.filter(
    (p) =>
      !q ||
      p.title.toLowerCase().includes(q) ||
      (p.notes ?? '').toLowerCase().includes(q),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search plans…"
        />
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
                      <span className="flex items-center gap-2 text-[11px] text-neutral-500">
                        {projectIds.length > 0 && (
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
                          <span>
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
  const { user } = useUser();
  const { companies, loading: loadingWorkspace } = useWorkspace();
  const wide = useMediaQuery('(min-width: 1024px)');
  const readable = useMemo(
    () => companies.filter((c) => c.permissions.includes('tasks:read')),
    [companies],
  );

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [data, setData] = useState<PlansData | null>(null);
  const [loading, setLoading] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [stepId, setStepId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>(
    'saved',
  );
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [makingTask, setMakingTask] = useState(false);
  const [freshId, setFreshId] = useState<string | null>(null);
  // On a phone one panel shows at a time.
  const [view, setView] = useState<'list' | 'plan' | 'step'>('list');

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<string, PlanView>());

  // Start in the company used last, else the first one.
  useEffect(() => {
    if (companyId || !readable.length) return;
    const stored = readStored();
    setCompanyId(
      readable.find((c) => c.company.id === stored)?.company.id ??
        readable[0].company.id,
    );
  }, [readable, companyId]);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await PortalSdk.getData(`/api/plans?companyId=${id}`, null);
      setData(res?.data ?? null);
    } catch (err) {
      toast.error(errorText(err, 'Could not load plans.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!companyId) return;
    try {
      localStorage.setItem(COMPANY_KEY, companyId);
    } catch {
      /* not saved; fine */
    }
    setData(null);
    setPlanId(null);
    setStepId(null);
    setView('list');
    load(companyId);
  }, [companyId, load]);

  const persist = useCallback(async (id: string) => {
    const plan = pending.current.get(id);
    if (!plan) return;
    pending.current.delete(id);
    setSaveState('saving');
    try {
      const res = await PortalSdk.patchData(`/api/plans/${id}`, payload(plan));
      const saved: PlanView | undefined = res?.data?.plan;
      // Take the tasks' status from the server; keep what is being typed.
      if (saved)
        setData(
          (d) =>
            d && {
              ...d,
              plans: d.plans.map((p) =>
                p.id !== id
                  ? p
                  : {
                      ...p,
                      steps: p.steps.map((s) => {
                        const fresh = saved.steps.find((x) => x.id === s.id);
                        return fresh?.task
                          ? { ...s, task: fresh.task, done: fresh.done }
                          : s;
                      }),
                    },
              ),
            },
        );
      setSaveState(pending.current.size ? 'saving' : 'saved');
    } catch (err) {
      setSaveState('error');
      toast.error(errorText(err, 'Could not save the plan.'));
    }
  }, []);

  const flush = useCallback(
    async (id: string) => {
      clearTimeout(timers.current.get(id));
      await persist(id);
    },
    [persist],
  );

  // Save anything waiting when leaving the page.
  useEffect(() => {
    const map = pending.current;
    const save = () => map.forEach((_p, id) => flush(id));
    window.addEventListener('beforeunload', save);
    return () => {
      window.removeEventListener('beforeunload', save);
      save();
    };
  }, [flush]);

  const change = useCallback(
    (id: string, update: (plan: PlanView) => PlanView) => {
      setData((d) => {
        if (!d) return d;
        return {
          ...d,
          plans: d.plans.map((p) => {
            if (p.id !== id) return p;
            const next = { ...update(p), updatedAt: new Date().toISOString() };
            pending.current.set(id, next);
            return next;
          }),
        };
      });
      setSaveState('saving');
      clearTimeout(timers.current.get(id));
      timers.current.set(
        id,
        setTimeout(() => persist(id), SAVE_AFTER_MS),
      );
    },
    [persist],
  );

  const plan = data?.plans.find((p) => p.id === planId) ?? null;
  const step = plan?.steps.find((s) => s.id === stepId) ?? null;
  const canEditPlan =
    !!plan && !!data && (data.can.editAll || plan.ownerId === user?.id);
  const canDeletePlan =
    !!plan && !!data && (data.can.deleteAll || plan.ownerId === user?.id);

  const selectPlan = (id: string) => {
    if (planId && planId !== id) flush(planId);
    setPlanId(id);
    setStepId(null);
    setView('plan');
  };

  const createPlan = async () => {
    if (!companyId) return;
    setCreating(true);
    try {
      const res = await PortalSdk.postData('/api/plans', {
        companyId,
        title: 'New plan',
        status: PLAN_STATUS.IDEA,
      });
      const created: PlanView = res?.data?.plan;
      setData((d) => d && { ...d, plans: [created, ...d.plans] });
      selectPlan(created.id);
      setFreshId(created.id);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setCreating(false);
    }
  };

  const deletePlan = async () => {
    if (!plan) return;
    setDeleting(true);
    try {
      clearTimeout(timers.current.get(plan.id));
      pending.current.delete(plan.id);
      await PortalSdk.deleteData(`/api/plans/${plan.id}`, {});
      setData(
        (d) => d && { ...d, plans: d.plans.filter((p) => p.id !== plan.id) },
      );
      setPlanId(null);
      setStepId(null);
      setView('list');
      setConfirmDelete(false);
      toast.success('Plan deleted');
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setDeleting(false);
    }
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
    try {
      await flush(plan.id);
      const res = await PortalSdk.postData(
        `/api/plans/${plan.id}/steps/${step.id}/task`,
        {},
      );
      const saved: PlanView = res?.data?.plan;
      setData(
        (d) =>
          d && {
            ...d,
            plans: d.plans.map((p) =>
              p.id !== saved.id
                ? p
                : {
                    ...p,
                    steps: p.steps.map(
                      (s) => saved.steps.find((x) => x.id === s.id) ?? s,
                    ),
                  },
            ),
          },
      );
      toast.success('Added to the project’s tasks');
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setMakingTask(false);
    }
  };

  // After a scheduled task changes, fetch the plan's list of them again.
  const refreshSchedules = async (id: string) => {
    try {
      const res = await PortalSdk.getData(`/api/plans/${id}`, null);
      const fresh: PlanView | undefined = res?.data?.plan;
      if (fresh)
        setData(
          (d) =>
            d && {
              ...d,
              plans: d.plans.map((p) =>
                p.id === id ? { ...p, schedules: fresh.schedules } : p,
              ),
            },
        );
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const selectStep = (id: string | null) => {
    setStepId(id);
    if (id && !wide) setView('step');
  };

  /* ------------------------------- panels ------------------------------- */

  const list = data && (
    <PlanList data={data} selectedId={planId} onSelect={selectPlan} />
  );

  const editor =
    plan && data ? (
      <PlanEditor
        key={plan.id}
        plan={plan}
        projects={data.projects}
        people={data.people}
        canEdit={canEditPlan}
        canDelete={canDeletePlan}
        selectedStepId={stepId}
        onSelectStep={selectStep}
        onChange={(update) => change(plan.id, update)}
        onDelete={() => setConfirmDelete(true)}
        onBack={wide ? undefined : () => setView('list')}
        fresh={plan.id === freshId}
        extra={
          <PlanSchedules
            plan={plan}
            projects={data.projects}
            people={data.people}
            canEdit={canEditPlan && data.can.create}
            onSaved={() => refreshSchedules(plan.id)}
          />
        }
      />
    ) : (
      <EmptyState
        icon="lightbulb"
        title={data?.plans.length ? 'Pick a plan' : 'No plans yet'}
        description="A plan can start as just an idea. Add steps when it firms up: what, for which project, who and by when."
        action={
          data?.can.create && (
            <AdminButton
              tone="primary"
              icon="add"
              loading={creating}
              onClick={createPlan}
            >
              New plan
            </AdminButton>
          )
        }
        className="h-full"
      />
    );

  const side = plan && data && (
    <StepPanel
      plan={plan}
      step={step}
      projects={data.projects}
      people={data.people}
      canEdit={canEditPlan}
      makingTask={makingTask}
      onChange={changeStep}
      onRemove={removeStep}
      onMakeTask={makeTask}
      onClose={() => {
        setStepId(null);
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
          <CompanyPicker
            companies={readable}
            value={companyId}
            onChange={(id) => {
              if (planId) flush(planId);
              setCompanyId(id);
            }}
            className="h-9 min-w-[160px]"
          />
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
        {data?.can.create && (
          <AdminButton
            tone="primary"
            size="sm"
            icon="add"
            loading={creating}
            onClick={createPlan}
          >
            New plan
          </AdminButton>
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
            {plan && (
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
