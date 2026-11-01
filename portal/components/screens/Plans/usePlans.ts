'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { projectFamily } from '@/lib/workspace/plans';
import { PLAN_STATUS } from '@/models/workspace';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { errorText } from '../Admin/Workspace/shared';
import type { PlansData, PlanView } from './types';

const SAVE_AFTER_MS = 700;

export type PlanSaveState = 'saved' | 'saving' | 'error';

/** What a save sends: the plan's own fields, not the tasks' status. */
const payload = (plan: PlanView) => ({
  projectId: plan.projectId ?? null,
  title: plan.title.trim() || 'Untitled plan',
  notes: plan.notes ?? null,
  status: plan.status,
  startOn: plan.startOn ?? null,
  endOn: plan.endOn ?? null,
  ownerId: plan.ownerId,
  memberIds: plan.memberIds ?? [],
  steps: plan.steps
    .filter((s) => s.text.trim())
    .map(({ task: _task, goal: _goal, ...s }) => s),
});

/** Every company they can read. */
export const ALL_COMPANIES = 'all';

/**
 * Plans of one company, or of every company (ALL_COMPANIES), saved a
 * moment after each change. Used by the plans page and by a project's
 * page, which shows the plans linked to it or with a step for it.
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
      const res = await PortalSdk.getData(
        id === ALL_COMPANIES ? '/api/plans' : `/api/plans?companyId=${id}`,
        null,
      );
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
      // Take tasks and goals from the server; keep what is being typed.
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
                        if (!fresh) return s;
                        const linked = !!(fresh.task || fresh.goal);
                        return {
                          ...s,
                          projectId: fresh.taskId
                            ? fresh.projectId
                            : s.projectId,
                          task: fresh.task ?? null,
                          goal: fresh.goal ?? null,
                          done: linked ? fresh.done : s.done,
                        };
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

  /**
   * Makes a plan; `fields` can start it with steps or link it to a project.
   * With every company loaded, `fields.companyId` says which one.
   */
  const create = useCallback(
    async (fields: Partial<PlanView> = {}) => {
      const inCompany =
        fields.companyId ?? (companyId !== ALL_COMPANIES ? companyId : null);
      if (!inCompany) return null;
      try {
        const res = await PortalSdk.postData('/api/plans', {
          title: 'New plan',
          status: PLAN_STATUS.IDEA,
          ...fields,
          companyId: inCompany,
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

  /** Adds a note to the task a step links to. */
  const addNote = useCallback(
    async (planId: string, stepId: string, text: string) => {
      try {
        await flush(planId);
        await PortalSdk.postData(`/api/plans/${planId}/steps/${stepId}/note`, {
          text,
        });
        toast.success('Note added to the task');
        return true;
      } catch (err) {
        toast.error(errorText(err, 'Could not add the note.'));
        return false;
      }
    },
    [flush],
  );

  /**
   * Saves what is waiting, then loads everything again: after a step's task
   * or goal was changed from the plan.
   */
  const refresh = useCallback(
    async (planId: string) => {
      // Let a change made just before land in the plan first.
      await new Promise((r) => setTimeout(r, 50));
      await flush(planId);
      if (companyId) await load(companyId);
    },
    [flush, load, companyId],
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

  const companyOf = (projectId?: string | null) =>
    data?.projects.find((p) => p.id === projectId)?.companyId;
  // The people on a project run its tasks, and plans linked to it or with a
  // step for it.
  const addsTasksIn = (projectId?: string | null) => {
    const can = data?.can[companyOf(projectId) ?? ''];
    return (
      !!can &&
      !!projectId &&
      (can.createTasks || can.teamProjectIds.includes(projectId))
    );
  };
  const isMine = (plan: PlanView) => {
    const team = data?.can[plan.companyId]?.teamProjectIds ?? [];
    return (
      plan.ownerId === user?.id ||
      (!!plan.projectId && team.includes(plan.projectId)) ||
      plan.steps.some((s) => !!s.projectId && team.includes(s.projectId))
    );
  };
  const canEdit = (plan: PlanView) =>
    isMine(plan) || !!data?.can[plan.companyId]?.editAll;
  const canDelete = (plan: PlanView) =>
    isMine(plan) || !!data?.can[plan.companyId]?.deleteAll;
  const canCreate = !!data && Object.values(data.can).some((c) => c.create);

  /**
   * The projects and people a plan can name: its company's, and for a
   * project plan only its project and the ones under it (`stepProjects`).
   */
  const choicesFor = (plan: PlanView) => {
    const projects = (data?.projects ?? []).filter(
      (p) => p.companyId === plan.companyId,
    );
    const family = plan.projectId
      ? projectFamily(projects, plan.projectId)
      : null;
    return {
      projects,
      stepProjects: family
        ? projects.filter((p) => family.has(p.id))
        : projects,
      people: (data?.people ?? []).filter((p) =>
        p.companyIds.includes(plan.companyId),
      ),
    };
  };

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
    addNote,
    refresh,
    addsTasksIn,
    canEdit,
    canDelete,
    canCreate,
    choicesFor,
  };
};
