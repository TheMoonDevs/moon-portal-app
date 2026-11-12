'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { projectFamily } from '@/lib/workspace/plans';
import { labelCoreProjects } from '@/lib/workspace/projectLabel';
import { PLAN_STATUS, TASK_STATUS } from '@/models/workspace';
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
  /** Plans with a task being made: their saves wait, so the link is kept. */
  const making = useRef(new Map<string, number>());

  const load = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await PortalSdk.getData(
        id === ALL_COMPANIES ? '/api/plans' : `/api/plans?companyId=${id}`,
        null,
      );
      const next: PlansData | null = res?.data ?? null;
      // A plan names projects of its company: the core one reads "ZONE (Core)".
      if (next)
        next.projects = labelCoreProjects(next.projects, next.companies, {
          inCompany: true,
        });
      setData(next);
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
    // A task is being made from a step: save once its link is back.
    if (making.current.get(id)) return;
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

  /**
   * Turns a step into a task in its project. Saves of the plan wait while
   * it is made, so a save typed meanwhile does not drop the new link.
   */
  const makeTask = useCallback(
    async (planId: string, stepId: string, quiet = false) => {
      await flush(planId);
      making.current.set(planId, (making.current.get(planId) ?? 0) + 1);
      try {
        const res = await PortalSdk.postData(
          `/api/plans/${planId}/steps/${stepId}/task`,
          {},
        );
        const saved: PlanView = res?.data?.plan;
        const made = saved?.steps.find((x) => x.id === stepId);
        if (!made) throw new Error('The task was not made.');
        const link = (p: PlanView): PlanView => ({
          ...p,
          steps: p.steps.map((s) =>
            s.id !== stepId
              ? s
              : {
                  ...s,
                  kind: made.kind,
                  taskId: made.taskId,
                  task: made.task ?? null,
                  projectId: made.projectId,
                  done: made.done,
                },
          ),
        });
        const waiting = pending.current.get(planId);
        if (waiting) pending.current.set(planId, link(waiting));
        setData(
          (d) =>
            d && {
              ...d,
              plans: d.plans.map((p) => (p.id === planId ? link(p) : p)),
            },
        );
        if (!quiet) toast.success('Added to the project’s tasks');
        return true;
      } catch (err) {
        toast.error(errorText(err, 'Could not make the task.'));
        return false;
      } finally {
        making.current.set(planId, (making.current.get(planId) ?? 1) - 1);
        if (pending.current.has(planId)) {
          clearTimeout(timers.current.get(planId));
          timers.current.set(
            planId,
            setTimeout(() => persist(planId), SAVE_AFTER_MS),
          );
        }
      }
    },
    [flush, persist],
  );

  /**
   * Changes a task step's task right from the step: its status, due date or
   * people. Shows at once, and goes back if the task could not be saved.
   */
  const updateStepTask = useCallback(
    async (
      planId: string,
      stepId: string,
      fields: {
        status?: string;
        dueDate?: string | null;
        assigneeIds?: string[];
      },
    ) => {
      const plan =
        pending.current.get(planId) ?? data?.plans.find((p) => p.id === planId);
      const step = plan?.steps.find((s) => s.id === stepId);
      if (!step?.taskId) return false;
      const before = { done: step.done, task: step.task };
      const mark = (p: PlanView, next: Partial<PlanView['steps'][number]>) => ({
        ...p,
        steps: p.steps.map((s) => (s.id === stepId ? { ...s, ...next } : s)),
      });
      const apply = (next: Partial<PlanView['steps'][number]>) => {
        const waiting = pending.current.get(planId);
        if (waiting) pending.current.set(planId, mark(waiting, next));
        setData(
          (d) =>
            d && {
              ...d,
              plans: d.plans.map((p) => (p.id === planId ? mark(p, next) : p)),
            },
        );
      };
      const done =
        fields.status !== undefined
          ? fields.status === TASK_STATUS.DONE
          : step.done;
      const after = {
        done,
        task: step.task && {
          ...step.task,
          ...fields,
          ...(fields.status !== undefined && {
            completedAt:
              fields.status === TASK_STATUS.DONE
                ? (step.task.completedAt ?? new Date().toISOString())
                : null,
          }),
        },
      };
      apply(after);
      try {
        await PortalSdk.patchData(`/api/tasks/${step.taskId}`, fields);
        // A plan save that came back meanwhile had the old task.
        apply(after);
        return true;
      } catch (err) {
        apply(before);
        toast.error(errorText(err, 'Could not change the task.'));
        return false;
      }
    },
    [data],
  );

  /** Ticks a task step's task done, or not done, right from the step. */
  const setTaskDone = useCallback(
    (planId: string, stepId: string, done: boolean) =>
      updateStepTask(planId, stepId, {
        status: done ? TASK_STATUS.DONE : TASK_STATUS.TODO,
      }),
    [updateStepTask],
  );

  /** Sets who can open a plan: everyone in its company, or only some people. */
  const share = useCallback(
    async (
      planId: string,
      change: { restricted: boolean; userIds: string[] },
    ) => {
      try {
        await flush(planId);
        const res = await PortalSdk.putData(
          `/api/plans/${planId}/sharing`,
          change,
        );
        const saved: PlanView | undefined = res?.data?.plan;
        setData(
          (d) =>
            d && {
              ...d,
              plans: d.plans.map((p) =>
                p.id === planId
                  ? { ...p, sharing: saved?.sharing ?? { ...change } }
                  : p,
              ),
            },
        );
        toast.success(
          change.restricted
            ? 'Only the people you picked can open it now'
            : 'It is open to everyone again',
        );
        return true;
      } catch (err) {
        toast.error(errorText(err, 'Could not change who can open it.'));
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

  /** Deletes the task a step links to, and the step. */
  const deleteStepTask = useCallback(
    async (planId: string, stepId: string) => {
      const plan =
        pending.current.get(planId) ?? data?.plans.find((p) => p.id === planId);
      const taskId = plan?.steps.find((s) => s.id === stepId)?.taskId;
      if (!taskId) return false;
      try {
        await PortalSdk.deleteData(`/api/tasks/${taskId}`, {});
        change(planId, (p) => ({
          ...p,
          steps: p.steps.filter((s) => s.id !== stepId),
        }));
        toast.success('Step and task deleted');
        return true;
      } catch (err) {
        toast.error(errorText(err, 'Could not delete the task.'));
        return false;
      }
    },
    [data, change],
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
    setTaskDone,
    updateStepTask,
    share,
    meId: user?.id ?? null,
    refreshSchedules,
    addNote,
    deleteStepTask,
    refresh,
    addsTasksIn,
    canEdit,
    canDelete,
    canCreate,
    choicesFor,
  };
};
