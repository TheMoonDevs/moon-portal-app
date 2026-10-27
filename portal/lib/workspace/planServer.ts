import { db } from '@/lib/mongodb/db-client';
import { isAllowedInCompany, isOnProjectTeam } from '@/lib/permissions/company';
import { syncTaskPoints } from '@/lib/progress/server';
import type {
  CompanyMember,
  Plan,
  PlanStep,
  Project,
  Task,
  TaskSchedule,
} from '@/models/workspace';
import {
  MEMBER_STATUS,
  PLAN_STATUS,
  PROJECT_STATUS,
  TASK_SIZE,
  TASK_STATUS,
} from '@/models/workspace';

import { PLAN_STATUSES, planDay, sanitizeSteps } from './plans';
import {
  fail,
  getPublicUsers,
  nowIso,
  requireCompanyPermission,
  requireUser,
} from './server';

/** The projects and people a plan in `companyId` can name. */
export async function planChoices(companyId: string) {
  const [projects, members]: [Project[], CompanyMember[]] = await Promise.all([
    db.project.findMany({
      where: { companyId, status: { notIn: [PROJECT_STATUS.ARCHIVED] } },
      select: {
        name: true,
        color: true,
        logo: true,
        parentId: true,
        goals: true,
      },
      orderBy: { name: 'asc' },
    }),
    db.companyMember.findMany({
      where: { companyId, status: MEMBER_STATUS.ACTIVE },
      select: { userId: true },
    }),
  ]);
  const people: {
    id: string;
    name?: string;
    email?: string;
    avatar?: string;
  }[] = await getPublicUsers(members.map((m) => m.userId));
  return {
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color ?? null,
      logo: p.logo ?? null,
      parentId: p.parentId ?? null,
      goals: p.goals ?? [],
    })),
    people: people.map((u) => ({
      id: u.id,
      name: u.name ?? u.email ?? 'Someone',
      email: u.email ?? null,
      avatar: u.avatar ?? null,
    })),
  };
}

type Choices = Awaited<ReturnType<typeof planChoices>>;

/**
 * Plan fields from a request body. `previous` is the stored plan when
 * editing; fields left out of the body keep their stored value.
 */
export function readPlanBody(
  body: any,
  choices: Choices,
  previous?: Plan,
): { data?: Partial<Plan>; error?: string } {
  const has = (k: string) => body && k in body;
  const projectIds = new Set(choices.projects.map((p) => p.id));
  const peopleIds = new Set(choices.people.map((p) => p.id));
  const data: Partial<Plan> = {};
  if (has('title') || !previous) {
    const title =
      typeof body?.title === 'string' ? body.title.trim().slice(0, 160) : '';
    if (!title) return { error: 'Give the plan a title.' };
    data.title = title;
  }
  if (has('notes'))
    data.notes =
      typeof body.notes === 'string' ? body.notes.slice(0, 20000) : null;
  if (has('status')) {
    if (!PLAN_STATUSES.includes(body.status))
      return { error: 'Unknown plan status.' };
    data.status = body.status;
  }
  if (has('startOn')) data.startOn = planDay(body.startOn);
  if (has('endOn')) data.endOn = planDay(body.endOn);
  if (has('ownerId')) {
    if (!peopleIds.has(body.ownerId))
      return { error: 'The owner must be in the company.' };
    data.ownerId = body.ownerId;
  }
  if (has('memberIds'))
    data.memberIds = Array.isArray(body.memberIds)
      ? Array.from(
          new Set(
            body.memberIds.filter(
              (x: unknown) => typeof x === 'string' && peopleIds.has(x),
            ),
          ),
        )
      : [];
  if (has('steps'))
    data.steps = sanitizeSteps(
      body.steps,
      previous?.steps ?? [],
      projectIds,
      peopleIds,
    );
  return { data };
}

export type PlanView = Omit<Plan, 'steps'> & {
  steps: (PlanStep & { task?: { id: string; status: string } | null })[];
  /** Scheduled tasks set up in the plan. */
  schedules: TaskSchedule[];
};

/**
 * Plans with each made-into-a-task step showing its task's status, and the
 * scheduled tasks set up in each.
 */
export async function withTasks(plans: Plan[]): Promise<PlanView[]> {
  const ids = plans.flatMap((p) =>
    (p.steps ?? []).map((s) => s.taskId).filter(Boolean),
  ) as string[];
  const [tasks, schedules]: [Task[], TaskSchedule[]] = await Promise.all([
    ids.length
      ? db.task.findMany({
          where: { id: { in: ids } },
          select: { status: true },
        })
      : [],
    plans.length
      ? db.taskSchedule.findMany({
          where: { planId: { in: plans.map((p) => p.id) } },
          orderBy: { createdAt: 'asc' },
        })
      : [],
  ]);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return plans.map((p) => ({
    ...p,
    schedules: schedules.filter((s) => s.planId === p.id),
    steps: (p.steps ?? []).map((s) => {
      const task = s.taskId ? byId.get(s.taskId) : undefined;
      return {
        ...s,
        task: task ? { id: task.id, status: task.status } : null,
        // A step made into a task is done when its task is.
        done: task ? task.status === TASK_STATUS.DONE : !!s.done,
      };
    }),
  }));
}

/** Ids of the company's projects that the person leads or is on the team of. */
export async function teamProjectIds(companyId: string, userId: string) {
  const projects: Project[] = await db.project.findMany({
    where: { companyId },
    select: { leadIds: true, memberIds: true },
  });
  return projects.filter((p) => isOnProjectTeam(p, userId)).map((p) => p.id);
}

/**
 * Whether the person may change (or delete) a plan: its owner, anyone on
 * the team of a project one of its steps is for, or someone whose company
 * roles allow it (`companyAllows`), such as the company's owner.
 */
export const mayChangePlan = (
  plan: Pick<Plan, 'ownerId' | 'steps'>,
  userId: string,
  companyAllows: boolean,
  teamIds: string[],
) =>
  companyAllows ||
  plan.ownerId === userId ||
  (plan.steps ?? []).some(
    (s) => !!s.projectId && teamIds.includes(s.projectId),
  );

/**
 * Loads a plan the signed-in person can see (any member of its company).
 * `edit` and `delete` follow mayChangePlan, with `tasks:edit` or
 * `tasks:delete` as the company permission.
 */
export async function requirePlan(
  planId: string,
  need: 'read' | 'edit' | 'delete' = 'read',
) {
  const plan: Plan | null = await db.plan.findFirst({ where: { id: planId } });
  if (!plan) {
    const { response, user } = await requireUser();
    return {
      user,
      access: null,
      plan: null,
      response: response ?? fail(404, 'Plan not found.'),
    };
  }
  const guard = await requireCompanyPermission(plan.companyId, 'tasks:read');
  if (guard.response || !guard.user)
    return { ...guard, plan: null, response: guard.response };
  if (need !== 'read') {
    const permission = need === 'edit' ? 'tasks:edit' : 'tasks:delete';
    const allowed = mayChangePlan(
      plan,
      guard.user.id,
      isAllowedInCompany(guard.user, guard.access, permission),
      await teamProjectIds(plan.companyId, guard.user.id),
    );
    if (!allowed)
      return {
        ...guard,
        plan,
        response: fail(
          403,
          'Only the plan’s owner, the people on its projects or a manager can do that.',
        ),
      };
  }
  return { ...guard, plan, response: null };
}

/** Creates a plan; checks are the caller's. */
export async function createPlan(
  companyId: string,
  userId: string,
  data: Partial<Plan>,
) {
  const now = nowIso();
  const plan: Plan = await db.plan.create({
    data: {
      companyId,
      title: data.title ?? 'Untitled plan',
      notes: data.notes ?? null,
      status: data.status ?? PLAN_STATUS.IDEA,
      startOn: data.startOn ?? null,
      endOn: data.endOn ?? null,
      ownerId: data.ownerId ?? userId,
      memberIds: data.memberIds ?? [],
      steps: data.steps ?? [],
      createdById: userId,
      createdAt: now,
      updatedAt: now,
    },
  });
  return plan;
}

/** Deletes a plan. Tasks made from it stay, no longer linked to it. */
export async function deletePlan(plan: Plan) {
  await db.task.updateMany({
    where: { planId: plan.id },
    data: { planId: null, updatedAt: nowIso() },
  });
  // Its scheduled tasks keep running in their projects.
  await db.taskSchedule.updateMany({
    where: { planId: plan.id },
    data: { planId: null, updatedAt: nowIso() },
  });
  await db.plan.deleteMany({ where: { id: plan.id } });
}

/**
 * Makes a step into a task in its project, with the step's people and due
 * date. The caller checks `tasks:create` in the plan's company.
 */
export async function stepToTask(plan: Plan, stepId: string, userId: string) {
  const step = (plan.steps ?? []).find((s) => s.id === stepId);
  if (!step) return { error: 'No such step in this plan.' };
  if (step.taskId) return { error: 'That step is already a task.' };
  if (!step.projectId) return { error: 'Pick a project for the step first.' };
  const project: Project | null = await db.project.findFirst({
    where: { id: step.projectId, companyId: plan.companyId },
  });
  if (!project) return { error: 'That project is gone.' };
  const now = nowIso();
  const task: Task = await db.task.create({
    data: {
      companyId: plan.companyId,
      projectId: project.id,
      title: step.text.slice(0, 200),
      description: step.notes ?? null,
      size: TASK_SIZE.MINOR,
      status: step.done ? TASK_STATUS.DONE : TASK_STATUS.TODO,
      assigneeIds: step.assigneeIds?.length ? step.assigneeIds : [userId],
      dueDate: step.dueOn ?? null,
      forDate: null,
      completedAt: step.done ? now : null,
      goalId: null,
      goalPartId: null,
      planId: plan.id,
      createdById: userId,
      createdAt: now,
      updatedAt: now,
    },
  });
  await syncTaskPoints(task);
  const updated: Plan = await db.plan.update({
    where: { id: plan.id },
    data: {
      steps: plan.steps.map((s) =>
        s.id === stepId ? { ...s, taskId: task.id } : s,
      ),
      updatedAt: now,
    },
  });
  return { plan: updated, task, project };
}
