'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { PLAN_STATUS } from '@/models/workspace';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { errorText } from '../Admin/Workspace/shared';
import type { PlansData, PlanView } from './types';

const SAVE_AFTER_MS = 700;

export type PlanSaveState = 'saved' | 'saving' | 'error';

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

/**
 * A company's plans, saved a moment after each change. Used by the plans
 * page and by a project's page, which shows the plans with a step for it.
 */
export const usePlans = (companyId: string | null | undefined) => {
  const { user } = useUser();
  const [data, setData] = useState<PlansData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<PlanSaveState>('saved');

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<string, PlanView>());

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
    setData(null);
    if (companyId) load(companyId);
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

  /** Makes a plan; `fields` can start it with steps. */
  const create = useCallback(
    async (fields: Partial<PlanView> = {}) => {
      if (!companyId) return null;
      try {
        const res = await PortalSdk.postData('/api/plans', {
          companyId,
          title: 'New plan',
          status: PLAN_STATUS.IDEA,
          ...fields,
        });
        const created: PlanView = res?.data?.plan;
        setData((d) => d && { ...d, plans: [created, ...d.plans] });
        return created;
      } catch (err) {
        toast.error(errorText(err));
        return null;
      }
    },
    [companyId],
  );

  const remove = useCallback(async (id: string) => {
    try {
      clearTimeout(timers.current.get(id));
      pending.current.delete(id);
      await PortalSdk.deleteData(`/api/plans/${id}`, {});
      setData((d) => d && { ...d, plans: d.plans.filter((p) => p.id !== id) });
      toast.success('Plan deleted');
      return true;
    } catch (err) {
      toast.error(errorText(err));
      return false;
    }
  }, []);

  /** Turns a step into a task in its project. */
  const makeTask = useCallback(
    async (planId: string, stepId: string) => {
      try {
        await flush(planId);
        const res = await PortalSdk.postData(
          `/api/plans/${planId}/steps/${stepId}/task`,
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
        return true;
      } catch (err) {
        toast.error(errorText(err));
        return false;
      }
    },
    [flush],
  );

  // After a scheduled task changes, fetch the plan's list of them again.
  const refreshSchedules = useCallback(async (id: string) => {
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
  }, []);

  // The people on a project run its tasks, and plans with a step for it.
  const addsTasksIn = (projectId?: string | null) =>
    !!data &&
    !!projectId &&
    (data.can.createTasks || data.can.teamProjectIds.includes(projectId));
  const isMine = (plan: PlanView) =>
    !!data &&
    (plan.ownerId === user?.id ||
      plan.steps.some(
        (s) => !!s.projectId && data.can.teamProjectIds.includes(s.projectId),
      ));
  const canEdit = (plan: PlanView) => isMine(plan) || !!data?.can.editAll;
  const canDelete = (plan: PlanView) => isMine(plan) || !!data?.can.deleteAll;

  return {
    data,
    loading,
    saveState,
    change,
    flush,
    create,
    remove,
    makeTask,
    refreshSchedules,
    addsTasksIn,
    canEdit,
    canDelete,
  };
};
