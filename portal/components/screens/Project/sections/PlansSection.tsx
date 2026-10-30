'use client';

import { useMediaQuery } from '@mui/material';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import { PLAN_STATUS_META } from '@/lib/workspace/plans';
import { PLAN_STATUS } from '@/models/workspace';

import { AdminButton, ConfirmDialog, Spin } from '../../Admin/shared/AdminUI';
import { PlanEditor, StepPanel } from '../../Plans/PlanEditor';
import { PlanSchedules } from '../../Plans/PlanSchedules';
import type { PlanView, StepView } from '../../Plans/types';
import { isPast, shortDay, stepCount } from '../../Plans/types';
import type { usePlans } from '../../Plans/usePlans';
import { SectionShell } from './SectionShell';

type Plans = ReturnType<typeof usePlans>;

/** Plans with a step or a scheduled task for the project. */
export const plansFor = (
  plans: PlanView[],
  projectId: string,
  keep: Set<string>,
) =>
  plans.filter(
    (p) =>
      keep.has(p.id) ||
      p.steps.some((s) => s.projectId === projectId) ||
      (p.schedules ?? []).some((s) => s.projectId === projectId),
  );

const PlanCard = ({
  plan,
  projectId,
  onOpen,
}: {
  plan: PlanView;
  projectId: string;
  onOpen: () => void;
}) => {
  const count = stepCount(plan);
  const here = plan.steps.filter((s) => s.projectId === projectId);
  const status = PLAN_STATUS_META[plan.status as PLAN_STATUS];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
    >
      <span className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-100">
          {plan.title || 'Untitled plan'}
        </span>
        <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-neutral-400">
          {status?.label}
        </span>
      </span>
      {plan.notes && (
        <span className="line-clamp-2 text-xs text-neutral-500">
          {plan.notes}
        </span>
      )}
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
        {count.total > 0 && (
          <span>
            {count.done}/{count.total} steps
          </span>
        )}
        {here.length > 0 && here.length !== count.total && (
          <span>{here.length} for this project</span>
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
      </span>
    </button>
  );
};

/**
 * The company's plans that name this project, edited here just as on the
 * plans page.
 */
export const PlansSection = ({
  projectId,
  plans,
  linked,
  planId,
  onOpen,
  onCreated,
}: {
  projectId: string;
  plans: Plans;
  /** The plans for this project, from `plansFor`. */
  linked: PlanView[];
  planId: string | null;
  onOpen: (id: string | null) => void;
  /** A plan made here, kept in the list until it has a step for the project. */
  onCreated: (plan: PlanView) => void;
}) => {
  const wide = useMediaQuery('(min-width: 1024px)');
  const { data, change, flush } = plans;
  const [stepId, setStepId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [makingTask, setMakingTask] = useState(false);
  const [freshId, setFreshId] = useState<string | null>(null);

  const plan = linked.find((p) => p.id === planId) ?? null;
  const step = plan?.steps.find((s) => s.id === stepId) ?? null;

  if (!data)
    return (
      <div className="flex h-full items-center justify-center py-20">
        {plans.loading && <Spin className="size-5" />}
      </div>
    );

  const create = async () => {
    setCreating(true);
    const created = await plans.create();
    setCreating(false);
    if (!created) return;
    onCreated(created);
    setFreshId(created.id);
    onOpen(created.id);
  };

  if (!plan)
    return (
      <SectionShell
        icon="map"
        title="Plans"
        description="The company’s plans with a step for this project. Open one to change it, just like on the plans page."
        actions={
          data.can.create && (
            <AdminButton
              tone="primary"
              size="sm"
              icon="add"
              loading={creating}
              onClick={create}
            >
              New plan
            </AdminButton>
          )
        }
      >
        {linked.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {linked.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                projectId={projectId}
                onOpen={() => onOpen(p.id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 px-6 py-14 text-center">
            <p className="text-sm text-neutral-300">
              No plans for this project
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
              A plan shows here once one of its steps is for this project. Steps
              you add to a plan made here are for this project.
            </p>
          </div>
        )}
      </SectionShell>
    );

  const canEdit = plans.canEdit(plan);
  const canDelete = plans.canDelete(plan);

  const changeStep = (fields: Partial<StepView>) =>
    step &&
    change(plan.id, (p) => ({
      ...p,
      steps: p.steps.map((s) => (s.id === step.id ? { ...s, ...fields } : s)),
    }));

  const removeStep = () => {
    if (!step) return;
    change(plan.id, (p) => ({
      ...p,
      steps: p.steps.filter((s) => s.id !== step.id),
    }));
    setStepId(null);
  };

  const makeTask = async () => {
    if (!step) return;
    setMakingTask(true);
    await plans.makeTask(plan.id, step.id);
    setMakingTask(false);
  };

  const deletePlan = async () => {
    setDeleting(true);
    const gone = await plans.remove(plan.id);
    setDeleting(false);
    if (!gone) return;
    setConfirmDelete(false);
    setStepId(null);
    onOpen(null);
  };

  const back = () => {
    flush(plan.id);
    setStepId(null);
    onOpen(null);
  };

  const editor = (
    <PlanEditor
      key={plan.id}
      plan={plan}
      projects={data.projects}
      people={data.people}
      canEdit={canEdit}
      canDelete={canDelete}
      selectedStepId={stepId}
      onSelectStep={setStepId}
      onChange={(update) => change(plan.id, update)}
      onDelete={() => setConfirmDelete(true)}
      onBack={back}
      fresh={plan.id === freshId}
      newStepProjectId={projectId}
      extra={
        <PlanSchedules
          plan={plan}
          projects={data.projects}
          people={data.people}
          canEdit={canEdit}
          canAddTo={plans.addsTasksIn}
          onSaved={() => plans.refreshSchedules(plan.id)}
        />
      }
    />
  );

  const side = (
    <StepPanel
      plan={plan}
      step={step}
      projects={data.projects}
      people={data.people}
      canEdit={canEdit}
      canMakeTask={plans.addsTasksIn(step?.projectId)}
      makingTask={makingTask}
      onChange={changeStep}
      onRemove={removeStep}
      onMakeTask={makeTask}
      onClose={() => setStepId(null)}
    />
  );

  return (
    <div className="flex h-full min-h-0">
      {wide ? (
        <>
          <div className="min-w-0 flex-1">{editor}</div>
          <div className="w-[340px] shrink-0 border-l border-white/[0.07]">
            {side}
          </div>
        </>
      ) : (
        <div className="min-w-0 flex-1">{step ? side : editor}</div>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${plan.title || 'this plan'}?`}
        message="The plan and its steps go away. Tasks made from its steps stay in their projects."
        confirmLabel="Delete plan"
        loading={deleting}
        onConfirm={deletePlan}
      />
    </div>
  );
};
