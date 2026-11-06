import { db } from '@/lib/mongodb/db-client';
import { isAllowedInCompany, isOnProjectTeam } from '@/lib/permissions/company';
import { syncTaskPoints } from '@/lib/progress/server';
import type {
  CompanyMember,
  GoalTally,
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

import {
  kindOf,
  PLAN_STATUSES,
  planDay,
  projectFamily,
  sanitizeSteps,
} from './plans';
import { goalProgress, tallyRows } from './projects';
import {
  fail,
  getPublicUsers,
  nowIso,
  requireCompanyPermission,
  requireUser,
} from './server';
import { canSeePlan } from './sharing';
import { sharingViewer } from './sharingServer';

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
    companyId,
    projects: projects.map((p) => ({
      id: p.id,
      companyId,
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
      companyIds: [companyId],
    })),
  };
}

type Choices = Awaited<ReturnType<typeof planChoices>>;

/**
 * Plan fields from a request body. `previous` is the stored plan when
 * editing; fields left out of the body keep their stored value. A project
 * plan's steps must stay inside its project and sub-projects.
 */
export async function readPlanBody(
  body: any,
  choices: Choices,
  previous?: Plan,
): Promise<{ data?: Partial<Plan>; error?: string }> {
  const has = (k: string) => body && k in body;
  const allProjectIds = new Set(choices.projects.map((p) => p.id));
  const peopleIds = new Set(choices.people.map((p) => p.id));
  const data: Partial<Plan> = {};
  if (has('title') || !previous) {
    const title =
      typeof body?.title === 'string' ? body.title.trim().slice(0, 160) : '';
    if (!title) return { error: 'Give the plan a title.' };
    data.title = title;
  }
  if (has('projectId')) {
    if (body.projectId && !allProjectIds.has(body.projectId))
      return { error: 'Link the plan to a project of its company.' };
    data.projectId = body.projectId || null;
  }
  const linkedTo =
    data.projectId !== undefined ? data.projectId : previous?.projectId;
  const projectIds = linkedTo
    ? projectFamily(choices.projects, linkedTo)
    : allProjectIds;
  if (has('notes'))
    data.notes =
      typeof body.notes === 'string' ? body.notes.slice(0, 100_000) : null;
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
  const steps: any[] | null = has('steps')
    ? Array.isArray(body.steps)
      ? body.steps
      : []
    : linkedTo && data.projectId !== undefined
      ? (previous?.steps ?? [])
      : null;
  if (steps) {
    // A project plan's new picks stay in its project and the ones under
    // it; steps that were already for another project keep it.
    const before = new Map(
      (previous?.steps ?? []).map((s) => [s.id, s.projectId]),
    );
    if (
      linkedTo &&
      steps.some(
        (s) =>
          typeof s?.projectId === 'string' &&
          s.projectId &&
          !projectIds.has(s.projectId) &&
          before.get(s?.id) !== s.projectId &&
          !(typeof s?.taskId === 'string' && s.taskId),
      )
    )
      return {
        error:
          'A project plan’s steps can only be for its project and the ones under it.',
      };
    // Tasks the steps link to: in the company, and in the plan's projects.
    const wanted = Array.from(
      new Set(
        steps
          .map((s) => s?.taskId)
          .filter((id): id is string => typeof id === 'string' && !!id),
      ),
    );
    const tasks: Task[] = wanted.length
      ? await db.task.findMany({
          where: {
            id: { in: wanted },
            companyId: previous?.companyId ?? choices.companyId,
          },
          select: { projectId: true },
        })
      : [];
    data.steps = sanitizeSteps(steps, previous?.steps ?? [], {
      projectIds,
      allProjectIds,
      peopleIds,
      tasks: new Map(
        tasks
          .filter((t) => projectIds.has(t.projectId))
          .map((t) => [t.id, t.projectId]),
      ),
      goals: new Map(
        choices.projects.map((p) => [
          p.id,
          new Set((p.goals ?? []).map((g) => g.id)),
        ]),
      ),
    });
  }
  return { data };
}

/** Where a goal step's goal stands now. */
export type StepGoal = {
  title: string;
  kind: 'scheduled' | 'target';
  done: number;
  target: number;
  percent: number;
  /** The period a scheduled goal counts in, e.g. "week". */
  period: string;
  met: boolean;
};

/** A task step's task, enough to show and edit it beside the plan. */
export type StepTask = {
  id: string;
  status: string;
  title: string;
  description: string | null;
  projectId: string;
  assigneeIds: string[];
  dueDate: string | null;
  forDate: string | null;
  /** When it was finished, ISO, for a done task. */
  completedAt: string | null;
};

export type PlanView = Omit<Plan, 'steps'> & {
  steps: (PlanStep & {
    task?: StepTask | null;
    goal?: StepGoal | null;
  })[];
  /** Scheduled tasks set up in the plan. */
  schedules: TaskSchedule[];
};

/** Where each goal named by the plans' steps stands now, by goal id. */
async function stepGoals(plans: Plan[]) {
  const wanted = plans.flatMap((p) =>
    (p.steps ?? []).filter((s) => s.goalId && s.projectId),
  );
  const out = new Map<string, StepGoal>();
  if (!wanted.length) return out;
  const goalIds = Array.from(new Set(wanted.map((s) => s.goalId!)));
  const [projects, done, tallies]: [Project[], Task[], GoalTally[]] =
    await Promise.all([
      db.project.findMany({
        where: {
          id: { in: Array.from(new Set(wanted.map((s) => s.projectId!))) },
        },
        select: { goals: true },
      }),
      db.task.findMany({
        where: { goalId: { in: goalIds }, status: TASK_STATUS.DONE },
        select: {
          status: true,
          goalId: true,
          goalPartId: true,
          forDate: true,
          completedAt: true,
          completedByIds: true,
          assigneeIds: true,
        },
      }),
      db.goalTally.findMany({ where: { goalId: { in: goalIds } } }),
    ]);
  const goals = projects
    .flatMap((p) => p.goals ?? [])
    .filter((g) => goalIds.includes(g.id));
  const progress = goalProgress(goals, [...done, ...tallyRows(tallies)]);
  for (const g of goals) {
    const p = progress.find((x) => x.goalId === g.id);
    if (!p) continue;
    out.set(g.id, {
      title: g.title,
      kind: p.kind,
      done: p.done,
      target: p.target,
      percent: p.percent,
      period: g.period,
      met: p.kind === 'target' ? !!p.achieved : p.percent >= 100,
    });
  }
  return out;
}

/**
 * Plans with each task step showing its task, each goal step where its goal
 * stands, and the scheduled tasks set up in each. A repeating goal set up
 * for the plan before goals were steps shows as a goal step at the end.
 */
export async function withTasks(input: Plan[]): Promise<PlanView[]> {
  const schedules: TaskSchedule[] = input.length
    ? await db.taskSchedule.findMany({
        where: { planId: { in: input.map((p) => p.id) } },
        orderBy: { createdAt: 'asc' },
      })
    : [];
  const plans = input.map((p) => {
    const steps = p.steps ?? [];
    const named = new Set(steps.map((s) => s.goalId).filter(Boolean));
    const extra: PlanStep[] = [];
    for (const sc of schedules)
      if (sc.planId === p.id && sc.goalId && !named.has(sc.goalId)) {
        named.add(sc.goalId);
        extra.push({
          id: `g${sc.goalId}`.slice(0, 20),
          kind: 'goal',
          text: sc.title,
          notes: null,
          projectId: sc.projectId,
          assigneeIds: [],
          dueOn: null,
          done: false,
          taskId: null,
          goalId: sc.goalId,
        });
      }
    return extra.length ? { ...p, steps: [...steps, ...extra] } : p;
  });
  const ids = plans.flatMap((p) =>
    (p.steps ?? []).map((s) => s.taskId).filter(Boolean),
  ) as string[];
  const [tasks, goals]: [Task[], Map<string, StepGoal>] = await Promise.all([
    ids.length
      ? db.task.findMany({
          where: { id: { in: ids } },
          select: {
            status: true,
            title: true,
            description: true,
            projectId: true,
            assigneeIds: true,
            dueDate: true,
            forDate: true,
            completedAt: true,
          },
        })
      : [],
    stepGoals(plans),
  ]);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return plans.map((p) => ({
    ...p,
    projectId: p.projectId ?? null,
    schedules: schedules.filter((s) => s.planId === p.id),
    steps: (p.steps ?? []).map((s) => {
      const task = s.taskId ? byId.get(s.taskId) : undefined;
      const goal = s.goalId ? goals.get(s.goalId) : undefined;
      return {
        ...s,
        kind: kindOf(s),
        goalId: s.goalId ?? null,
        task: task
          ? {
              id: task.id,
              status: task.status,
              title: task.title,
              description: task.description ?? null,
              projectId: task.projectId,
              assigneeIds: task.assigneeIds ?? [],
              dueDate: task.dueDate ? String(task.dueDate).slice(0, 10) : null,
              forDate: task.forDate ?? null,
              completedAt:
                task.status === TASK_STATUS.DONE && task.completedAt
                  ? new Date(task.completedAt).toISOString()
                  : null,
            }
          : null,
        goal: goal ?? null,
        // A task step is done when its task is; a goal step when it is met.
        done: task
          ? task.status === TASK_STATUS.DONE
          : goal
            ? goal.met
            : !!s.done,
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
 * the team of its linked project or of a project one of its steps is for, or someone whose company
 * roles allow it (`companyAllows`), such as the company's owner.
 */
export const mayChangePlan = (
  plan: Pick<Plan, 'ownerId' | 'steps' | 'projectId'>,
  userId: string,
  companyAllows: boolean,
  teamIds: string[],
) =>
  companyAllows ||
  plan.ownerId === userId ||
  (!!plan.projectId && teamIds.includes(plan.projectId)) ||
  (plan.steps ?? []).some(
    (s) => !!s.projectId && teamIds.includes(s.projectId),
  );

/**
 * Loads a plan the signed-in person can see: any member of its company, or
 * when it is restricted, the people it is shared with (see ./sharing). A
 * plan that is not shared with them answers as if it did not exist.
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
  if (!canSeePlan(plan, await sharingViewer(guard.user)))
    return { ...guard, plan: null, response: fail(404, 'Plan not found.') };
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
      projectId: data.projectId ?? null,
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
  if (step.goalId)
    return { error: 'That step is a goal; its goal makes the tasks.' };
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
        s.id === stepId ? { ...s, kind: 'task' as const, taskId: task.id } : s,
      ),
      updatedAt: now,
    },
  });
  return { plan: updated, task, project };
}
