import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import { syncTaskPoints } from '@/lib/progress/server';
import { isOnTeam } from '@/lib/worklogs/linker';
import { fitGoal } from '@/lib/workspace/goalFit';
import { syncGoalSchedules } from '@/lib/workspace/goalSchedules';
import { updateGoalProgress } from '@/lib/workspace/goalTally';
import { moveProject } from '@/lib/workspace/moveProject';
import {
  PERIOD_LABELS,
  runsOn,
  sanitizeGoals,
  toDay,
} from '@/lib/workspace/projects';
import {
  completeScheduleRun,
  dayMentioned,
  matchSchedule,
} from '@/lib/workspace/scheduleRuns';
import {
  asDay,
  asEffort,
  checkParent,
  getPublicUsers,
  getWorkspaceForUser,
  slugify,
} from '@/lib/workspace/server';
import type {
  CompanyMember,
  GoalPeriod,
  Project,
  ProjectGoal,
  Task,
  TaskSchedule,
} from '@/models/workspace';
import {
  MEMBER_STATUS,
  PROJECT_EFFORT,
  PROJECT_STATUS,
  TASK_SIZE,
  TASK_STATUS,
} from '@/models/workspace';

import { allowsInProject, companiesWith, type Tool, ToolError } from './shared';

/*
 * Tools for running the workspace from a conversation: projects (effort and
 * parent), goals, and tasks shared by several people. Each works with the
 * person's own company permissions.
 */

const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

/**
 * A project by id or name where the person may do `permission`: from their
 * company permissions, or for tasks from being on the project's team.
 */
export async function findProject(
  user: SessionUser,
  ref: unknown,
  permission = 'tasks:create',
) {
  if (typeof ref !== 'string' || !ref.trim())
    throw new ToolError('Give a project id or name.');
  const workspace = await getWorkspaceForUser(user);
  const byCompany = new Map(workspace.map((w) => [w.company.id, w]));
  const projects: Project[] = byCompany.size
    ? await db.project.findMany({
        where: {
          companyId: { in: Array.from(byCompany.keys()) },
          status: { notIn: [PROJECT_STATUS.ARCHIVED] },
        },
      })
    : [];
  const matches = projects.filter(
    (p) =>
      (p.id === ref.trim() || same(p.name, ref)) &&
      allowsInProject(
        byCompany.get(p.companyId)?.permissions,
        user,
        p,
        permission,
      ),
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1)
    throw new ToolError(
      `More than one project is called "${ref}". Use its id: ${matches
        .map((p) => `${p.id} (${byCompany.get(p.companyId)?.company.name})`)
        .join(', ')}.`,
    );
  throw new ToolError(
    `No project "${ref}" where you can do that. Call get_context to see your projects.`,
  );
}

/**
 * A task by id where the person may do `permission`: from their company
 * permissions, or from being on its project's team.
 */
export async function findTask(
  user: SessionUser,
  ref: unknown,
  permission: string,
) {
  if (typeof ref !== 'string' || !ref.trim())
    throw new ToolError('Give the task id (from get_context or find_tasks).');
  const task: Task | null = await db.task.findFirst({
    where: { id: ref.trim() },
  });
  if (!task) throw new ToolError(`No task with id "${ref}".`);
  const workspace = await getWorkspaceForUser(user);
  const permissions = workspace.find(
    (w) => w.company.id === task.companyId,
  )?.permissions;
  const project: Project | null = await db.project.findFirst({
    where: { id: task.projectId },
  });
  if (!project || !allowsInProject(permissions, user, project, permission))
    throw new ToolError(
      'Only the people on its project (or a manager) can change that task.',
    );
  return task;
}

/** Active members of a company, with the fields used to find them. */
export async function companyPeople(companyId: string) {
  const members: CompanyMember[] = await db.companyMember.findMany({
    where: { companyId, status: MEMBER_STATUS.ACTIVE },
    select: { userId: true },
  });
  const users: {
    id: string;
    name?: string;
    username?: string;
    email?: string;
  }[] = await getPublicUsers(members.map((m) => m.userId));
  return users;
}

/**
 * People by "me", id, email, name or username (or a first name that only
 * one member has). Undefined when no list was given.
 */
export async function resolvePeople(
  user: SessionUser,
  companyId: string,
  refs: unknown,
): Promise<string[] | undefined> {
  if (refs === undefined || refs === null) return undefined;
  const list = (Array.isArray(refs) ? refs : [refs])
    .filter((r): r is string => typeof r === 'string' && !!r.trim())
    .slice(0, 20);
  if (!list.length) return [];
  const people = await companyPeople(companyId);
  const ids = list.map((ref) => {
    if (same(ref, 'me')) return user.id;
    const exact = people.filter(
      (p) =>
        p.id === ref.trim() ||
        same(p.email ?? '', ref) ||
        same(p.name ?? '', ref) ||
        same(p.username ?? '', ref),
    );
    if (exact.length === 1) return exact[0].id;
    const first = people.filter((p) =>
      same((p.name ?? '').split(/\s+/)[0] ?? '', ref),
    );
    if (first.length === 1 && !exact.length) return first[0].id;
    const found = exact.length ? exact : first;
    if (found.length > 1)
      throw new ToolError(
        `More than one person matches "${ref}": ${found
          .map((p) => `${p.name} <${p.email}>`)
          .join(', ')}. Use their email.`,
      );
    throw new ToolError(
      `No one called "${ref}" in this company. get_context lists its people.`,
    );
  });
  return Array.from(new Set(ids));
}

/** A goal of the project by id or title (and a part by id or label). */
export function resolveGoal(project: Project, ref: unknown, partRef?: unknown) {
  if (ref === undefined || ref === null || ref === '')
    return { goalId: null, goalPartId: null };
  const goals = project.goals ?? [];
  const wanted = String(ref);
  const goal =
    goals.find((g) => g.id === wanted || same(g.title, wanted)) ??
    (() => {
      const loose = goals.filter((g) =>
        g.title.toLowerCase().includes(wanted.trim().toLowerCase()),
      );
      return loose.length === 1 ? loose[0] : undefined;
    })();
  if (!goal)
    throw new ToolError(
      `${project.name} has no goal "${wanted}". Its goals: ${
        goals.map((g) => g.title).join(', ') ||
        'none yet (add one with set_goal)'
      }.`,
    );
  let goalPartId: string | null = null;
  if (partRef !== undefined && partRef !== null && partRef !== '') {
    const part = goal.parts?.find(
      (p) => p.id === partRef || same(p.label, String(partRef)),
    );
    if (!part)
      throw new ToolError(
        `The goal "${goal.title}" has no part "${partRef}". Its parts: ${
          goal.parts?.map((p) => p.label).join(', ') || 'none'
        }.`,
      );
    goalPartId = part.id;
  }
  return { goalId: goal.id, goalPartId };
}

/**
 * The schedule a task made ahead of time belongs to: one of the project's
 * active schedules for the same goal that runs on that day. Linking it
 * stops the schedule from making the same task again on that day.
 */
async function scheduleFor(
  projectId: string,
  goalId: string | null,
  forDate: string | null,
) {
  if (!goalId || !forDate) return null;
  const schedules: TaskSchedule[] = await db.taskSchedule.findMany({
    where: { projectId, goalId, active: true },
  });
  const matches = schedules.filter((s) => runsOn(s, forDate));
  return matches.length === 1 ? matches[0].id : null;
}

/** Status fields for moving a task to `status`. */
export const statusChange = (task: Task | null, status: TASK_STATUS) => ({
  status,
  completedAt:
    status === TASK_STATUS.DONE
      ? task?.status === TASK_STATUS.DONE
        ? task.completedAt
        : new Date().toISOString()
      : null,
});

const TASK_STATUSES: TASK_STATUS[] = Object.values(TASK_STATUS).filter(
  (s) => s !== TASK_STATUS.ARCHIVED,
);

export type NewTask = {
  title: string;
  description?: unknown;
  major?: unknown;
  status?: unknown;
  assignees?: unknown;
  dueDate?: unknown;
  forDate?: unknown;
  goal?: unknown;
  goalPart?: unknown;
};

/** Creates a task in `project`; shared by add_task and log_work. */
export async function createTask(
  user: SessionUser,
  project: Project,
  input: NewTask,
) {
  const title = text(input.title, 200);
  if (!title) throw new ToolError('Give the task a title.');
  const forDate = asDay(input.forDate);
  const dueDate = asDay(input.dueDate);
  if (forDate === undefined || dueDate === undefined)
    throw new ToolError('Use YYYY-MM-DD for dates.');
  const status = TASK_STATUSES.includes(input.status as TASK_STATUS)
    ? (input.status as TASK_STATUS)
    : TASK_STATUS.TODO;
  const { goalId, goalPartId } = resolveGoal(
    project,
    input.goal,
    input.goalPart,
  );
  const assigneeIds = (await resolvePeople(
    user,
    project.companyId,
    input.assignees,
  )) ?? [user.id];
  const now = new Date().toISOString();
  const made: Task = await db.task.create({
    data: {
      companyId: project.companyId,
      projectId: project.id,
      title,
      description: text(input.description, 4000) || null,
      size: input.major ? TASK_SIZE.MAJOR : TASK_SIZE.MINOR,
      ...statusChange(null, status),
      assigneeIds,
      dueDate,
      forDate,
      goalId,
      goalPartId,
      ...(input.goal ? { goalChecked: true } : {}),
      scheduleId: await scheduleFor(project.id, goalId, forDate),
      createdById: user.id,
      createdAt: now,
      updatedAt: now,
    },
  });
  const task = await fitGoal(made);
  await syncTaskPoints(task);
  return task;
}

/** What a tool returns about a task. */
export async function describeTask(task: Task, project?: Project | null) {
  const people = await getPublicUsers(task.assigneeIds ?? []);
  const goal = project?.goals?.find((g) => g.id === task.goalId);
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    project: project?.name ?? null,
    people: people.map((p: { name?: string }) => p.name),
    ...(task.forDate && { forDate: task.forDate }),
    ...(task.dueDate && { dueDate: task.dueDate }),
    ...(goal && { goal: goal.title }),
  };
}

const PERIODS: GoalPeriod[] = ['day', 'week', 'month'];
const EFFORTS = Object.values(PROJECT_EFFORT);

const goalView = (g: ProjectGoal) => ({
  id: g.id,
  title: g.title,
  target: `${g.target} ${PERIOD_LABELS[g.period]}`,
  ...(g.parts?.length && {
    parts: g.parts.map((p) => `${p.label}: ${p.target}`),
  }),
});

async function saveGoals(
  user: SessionUser,
  project: Project,
  goals: unknown[],
) {
  const created = project.createdAt
    ? new Date(project.createdAt as string).toISOString().slice(0, 10)
    : null;
  const updated: Project = await db.project.update({
    where: { id: project.id },
    data: {
      goals: sanitizeGoals(goals, project.goals ?? [], created),
      updatedAt: new Date().toISOString(),
    },
  });
  // New goals set up their scheduled tasks; changed ones update them.
  await syncGoalSchedules(updated, project.goals ?? [], user.id);
  return updated;
}

export const WORKSPACE_TOOLS: Tool[] = [
  {
    name: 'create_project',
    title: 'Create a project',
    description:
      'Creates a project in one of the person\'s companies. Effort is how much work it takes to keep going (LOW, MEDIUM or HIGH). A project can sit under a parent project of the same company, e.g. "Lyrics videos" under "Music channel". Confirm the name with the person first.',
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string', description: 'Company id or name.' },
        name: { type: 'string' },
        description: { type: 'string' },
        effort: { type: 'string', enum: EFFORTS },
        parent: {
          type: 'string',
          description: 'Parent project id or name (optional).',
        },
      },
      required: ['company', 'name'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    run: async (user, args) => {
      const allowed = await companiesWith(user, 'projects:create');
      const ref = text(args?.company, 200);
      const company = Array.from(allowed.values()).find(
        (c) => c.id === ref || same(c.name, ref),
      );
      if (!company)
        throw new ToolError(
          `No company "${ref}" where you can create projects.`,
        );
      const name = text(args?.name, 120);
      if (!name) throw new ToolError('Give the project a name.');
      const effort = asEffort(args?.effort);
      if (effort === undefined)
        throw new ToolError('Effort is LOW, MEDIUM or HIGH.');
      const parent = args?.parent
        ? await findProject(user, args.parent, 'projects:read')
        : null;
      if (parent && parent.companyId !== company.id)
        throw new ToolError('The parent must be in the same company.');
      const now = new Date().toISOString();
      const project: Project = await db.project.create({
        data: {
          companyId: company.id,
          name,
          slug: slugify(name),
          description: text(args?.description, 4000) || null,
          status: PROJECT_STATUS.ACTIVE,
          color: null,
          icon: null,
          logo: null,
          leadIds: [user.id],
          memberIds: [],
          goals: [],
          effort: effort ?? PROJECT_EFFORT.MEDIUM,
          parentId: parent?.id ?? null,
          createdById: user.id,
          createdAt: now,
          updatedAt: now,
        },
      });
      return {
        project: {
          id: project.id,
          name: project.name,
          company: company.name,
          effort: project.effort,
          parent: parent?.name ?? null,
        },
      };
    },
  },
  {
    name: 'update_project',
    title: 'Update a project',
    description:
      "Changes a project's effort (LOW, MEDIUM or HIGH), its parent project (empty string to take it out from under one), status or description.",
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project id or exact name.' },
        effort: { type: 'string', enum: EFFORTS },
        parent: { type: 'string', description: 'Parent project id or name.' },
        status: {
          type: 'string',
          enum: Object.values(PROJECT_STATUS).filter(
            (s) => s !== PROJECT_STATUS.ARCHIVED,
          ),
        },
        description: { type: 'string' },
      },
      required: ['project'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    run: async (user, args) => {
      const project = await findProject(user, args?.project, 'projects:edit');
      const data: Record<string, unknown> = {};
      if (args?.effort !== undefined) {
        const effort = asEffort(args.effort);
        if (effort === undefined)
          throw new ToolError('Effort is LOW, MEDIUM or HIGH.');
        data.effort = effort;
      }
      let parentName: string | null | undefined;
      if (args?.parent !== undefined) {
        const parent = args.parent
          ? await findProject(user, args.parent, 'projects:read')
          : null;
        const checked = await checkParent(
          project.companyId,
          project.id,
          parent?.id ?? null,
        );
        if (checked.error) throw new ToolError(checked.error);
        data.parentId = checked.parentId;
        parentName = parent?.name ?? null;
      }
      if (args?.status !== undefined) {
        if (
          !Object.values(PROJECT_STATUS).includes(args.status) ||
          args.status === PROJECT_STATUS.ARCHIVED
        )
          throw new ToolError('Unknown project status.');
        data.status = args.status;
      }
      if (typeof args?.description === 'string')
        data.description = text(args.description, 4000) || null;
      if (!Object.keys(data).length)
        throw new ToolError(
          'Say what to change: effort, parent, status or description.',
        );
      const updated: Project = await db.project.update({
        where: { id: project.id },
        data: { ...data, updatedAt: new Date().toISOString() },
      });
      return {
        project: {
          id: updated.id,
          name: updated.name,
          effort: updated.effort ?? null,
          status: updated.status,
          ...(parentName !== undefined && { parent: parentName }),
        },
      };
    },
  },
  {
    name: 'move_project',
    title: 'Move a project to another company',
    description:
      "Moves a project, with its sub-projects, goals, tasks, scheduled tasks and results, to another of the person's companies. Confirm with the person first.",
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project id or exact name.' },
        company: { type: 'string', description: 'Company id or name.' },
      },
      required: ['project', 'company'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    run: async (user, args) => {
      const project = await findProject(user, args?.project, 'projects:edit');
      if (project.isCore)
        throw new ToolError(
          `${project.name} is its company's CORE project and stays with it.`,
        );
      const targets = await companiesWith(user, 'projects:create');
      const ref = text(args?.company, 200);
      const company = Array.from(targets.values()).find(
        (c) => c.id === ref || same(c.name, ref),
      );
      if (!company)
        throw new ToolError(`No company "${ref}" where you can add projects.`);
      if (company.id === project.companyId)
        throw new ToolError(`${project.name} is already in ${company.name}.`);
      const { moved } = await moveProject(project, company.id);
      return {
        project: project.name,
        company: company.name,
        ...(moved > 1 && { subProjects: moved - 1 }),
      };
    },
  },
  {
    name: 'set_goal',
    title: 'Set a goal',
    description:
      'Adds a goal to a project, or changes one (match it by id or title). A goal is a target per day, week or month, e.g. "Release lyrics videos", 3 per week. Every done task linked to the goal counts in the period of the day it was scheduled for, so work done early for next week fills next week. A period that ends short counts as missed. Parts split a target, e.g. 9 shorts as 3 per channel. A new goal also sets up a scheduled task that makes its tasks at the start of each period (one per part); change its days with update_schedule.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project id or exact name.' },
        goal: {
          type: 'string',
          description:
            'Id or title of the goal to change; leave out to add one.',
        },
        title: { type: 'string' },
        target: { type: 'integer', minimum: 1 },
        period: { type: 'string', enum: PERIODS },
        parts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              target: { type: 'integer', minimum: 1 },
            },
            required: ['label', 'target'],
          },
        },
      },
      required: ['project'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    run: async (user, args) => {
      const project = await findProject(user, args?.project, 'projects:edit');
      const goals = project.goals ?? [];
      const existing = args?.goal
        ? goals.find((g) => g.id === args.goal || same(g.title, args.goal))
        : undefined;
      if (args?.goal && !existing)
        throw new ToolError(
          `${project.name} has no goal "${args.goal}". Leave goal out to add a new one.`,
        );
      if (!existing && !text(args?.title, 120))
        throw new ToolError('Give the new goal a title.');
      if (args?.period !== undefined && !PERIODS.includes(args.period))
        throw new ToolError('Period is day, week or month.');
      const parts = Array.isArray(args?.parts)
        ? args.parts.map((p: any) => ({
            // Keep a part's id when its label stays, so linked tasks still count.
            id: existing?.parts?.find((x) =>
              same(x.label, String(p?.label ?? '')),
            )?.id,
            label: p?.label,
            target: p?.target,
          }))
        : existing?.parts;
      const next = {
        ...existing,
        title: text(args?.title, 120) || existing?.title,
        target: args?.target ?? existing?.target ?? 1,
        period: args?.period ?? existing?.period ?? 'week',
        parts,
      };
      const updated = await saveGoals(
        user,
        project,
        existing
          ? goals.map((g) => (g.id === existing.id ? next : g))
          : [...goals, next],
      );
      const saved = existing
        ? updated.goals?.find((g) => g.id === existing.id)
        : updated.goals?.[updated.goals.length - 1];
      return {
        project: updated.name,
        goal: saved ? goalView(saved) : null,
        added: !existing,
      };
    },
  },
  {
    name: 'remove_goal',
    title: 'Remove a goal',
    description:
      'Removes a goal from a project. Its tasks stay; they just stop counting towards it. Confirm with the person first.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project id or exact name.' },
        goal: { type: 'string', description: 'Goal id or title.' },
      },
      required: ['project', 'goal'],
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
    run: async (user, args) => {
      const project = await findProject(user, args?.project, 'projects:edit');
      const { goalId } = resolveGoal(project, args?.goal);
      const goal = project.goals?.find((g) => g.id === goalId);
      await saveGoals(
        user,
        project,
        (project.goals ?? []).filter((g) => g.id !== goalId),
      );
      return { project: project.name, removed: goal?.title };
    },
  },
  {
    name: 'update_goal_progress',
    title: 'Update goal progress',
    description:
      'Adds progress to a goal by hand, for work no task tracks (followers gained, a reel posted from a phone, a sale). Use add for how much more was done (negative to take some back), or done to set the total for the period; done tasks always count on their own, and finished tasks are matched to goals automatically. date picks the period (default today). A goal with parts needs the part.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project id or exact name.' },
        goal: { type: 'string', description: 'Goal id or title.' },
        goalPart: { type: 'string', description: 'Part label of the goal.' },
        add: { type: 'integer', description: 'How much to add, e.g. 1.' },
        done: {
          type: 'integer',
          minimum: 0,
          description: "The period's total, instead of add.",
        },
        date: { type: 'string', description: 'YYYY-MM-DD (optional).' },
      },
      required: ['project', 'goal'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    run: async (user, args) => {
      const project = await findProject(user, args?.project, 'projects:edit');
      const { goalId, goalPartId } = resolveGoal(
        project,
        args?.goal,
        args?.goalPart,
      );
      const goal = project.goals!.find((g) => g.id === goalId)!;
      if (goal.parts?.length && !goalPartId)
        throw new ToolError(
          `Say which part of "${goal.title}": ${goal.parts.map((p) => p.label).join(', ')}.`,
        );
      const add = Number.isInteger(args?.add)
        ? (args.add as number)
        : undefined;
      const done = Number.isInteger(args?.done)
        ? (args.done as number)
        : undefined;
      if (add === undefined && done === undefined)
        throw new ToolError('Give add (how much more) or done (the total).');
      const day = asDay(args?.date);
      if (day === undefined) throw new ToolError('Use YYYY-MM-DD for dates.');
      const progress = await updateGoalProgress(project, user.id, {
        goal,
        partId: goalPartId,
        ...(done !== undefined ? { done } : { add }),
        ...(day && { day }),
      });
      return {
        project: project.name,
        goal: goal.title,
        done: progress.done,
        target: progress.target,
        byHand: progress.manual,
        period: `${progress.from} to ${progress.to}`,
        ...(progress.parts && {
          parts: progress.parts.map((p) => `${p.label}: ${p.done}/${p.target}`),
        }),
      };
    },
  },
  {
    name: 'update_task',
    title: 'Change a task',
    description:
      'Changes a task: title, details, status, the people on it (a task can be shared; everyone on it gets its points when it is done), the day it is scheduled for (forDate, which decides the goal period it counts in), due date, or the goal it counts towards. Only mark DONE when the work is finished.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: TASK_STATUSES },
        assignees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Everyone on the task: "me", names or emails.',
        },
        forDate: { type: 'string', description: 'YYYY-MM-DD, or "" to clear.' },
        dueDate: { type: 'string', description: 'YYYY-MM-DD, or "" to clear.' },
        goal: {
          type: 'string',
          description: 'Goal id or title, or "" to unlink.',
        },
        goalPart: { type: 'string', description: 'Part label of the goal.' },
        major: { type: 'boolean' },
      },
      required: ['taskId'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    run: async (user, args) => {
      const task = await findTask(user, args?.taskId, 'tasks:edit');
      const project: Project | null = await db.project.findFirst({
        where: { id: task.projectId },
      });
      const data: Record<string, unknown> = {};
      if (args?.title !== undefined) {
        const title = text(args.title, 200);
        if (!title) throw new ToolError('A task needs a title.');
        data.title = title;
      }
      if (typeof args?.description === 'string')
        data.description = text(args.description, 4000) || null;
      if (args?.status !== undefined) {
        if (!TASK_STATUSES.includes(args.status))
          throw new ToolError('Unknown status.');
        Object.assign(data, statusChange(task, args.status));
      }
      if (args?.assignees !== undefined)
        data.assigneeIds = await resolvePeople(
          user,
          task.companyId,
          args.assignees,
        );
      for (const key of ['forDate', 'dueDate'] as const)
        if (args?.[key] !== undefined) {
          const day = asDay(args[key]);
          if (day === undefined)
            throw new ToolError('Use YYYY-MM-DD for dates.');
          data[key] = day;
        }
      if (args?.goal !== undefined && project)
        Object.assign(data, resolveGoal(project, args.goal, args.goalPart), {
          goalChecked: true,
        });
      if (args?.major !== undefined)
        data.size = args.major ? TASK_SIZE.MAJOR : TASK_SIZE.MINOR;
      if (!Object.keys(data).length) throw new ToolError('Say what to change.');
      const updated = await fitGoal(
        await db.task.update({
          where: { id: task.id },
          data: { ...data, updatedAt: new Date().toISOString() },
        }),
      );
      await syncTaskPoints(updated);
      return { task: await describeTask(updated, project) };
    },
  },
];

/** Goals with how the last few periods went, for get_context. */
export const goalSummary = (
  g: ProjectGoal,
  history: {
    met: boolean | null;
    done: number;
    target: number;
    from: string;
  }[],
) => {
  const current = history[history.length - 1];
  return {
    ...goalView(g),
    done: current?.done ?? 0,
    since: g.since ?? null,
    lastPeriods: history
      .slice(0, -1)
      .map(
        (h) => `${h.from}: ${h.met ? 'met' : 'missed'} (${h.done}/${h.target})`,
      ),
  };
};

/* ------------------------------ log_work tasks ----------------------------- */

export type PointTask = {
  text: string;
  status: string;
  project?: string;
  task?: string;
  goal?: string;
  goalPart?: string;
  forDate?: string;
  completeTask?: boolean;
};

const STATUS_FOR_POINT: Record<string, TASK_STATUS> = {
  doing: TASK_STATUS.IN_PROGRESS,
  done: TASK_STATUS.DONE,
  waiting: TASK_STATUS.IN_PROGRESS,
  blocked: TASK_STATUS.TODO,
  not_done: TASK_STATUS.TODO,
};

/**
 * The task a logged point belongs to. A task named by id or title is used
 * when the project has it; otherwise, with a project named, the task is
 * created (titled by the point when only a goal was given). A done point
 * finishes its task when `completeTask` is set, and always finishes a task
 * it just created. A title matching one of the project's scheduled tasks
 * finishes that schedule's run for `forDate`, a day the text names, or `day`.
 */
export async function taskForPoint(
  user: SessionUser,
  point: PointTask,
  day: string = toDay(),
) {
  if (!point.task && !point.goal) return null;
  if (!point.project) {
    if (!point.task) throw new ToolError('Name the project the goal is in.');
    const task: Task | null = await db.task.findFirst({
      where: { id: point.task.trim() },
    });
    if (!task) return null; // left for the linker to match by words
    const allowed = await companiesWith(user, 'tasks:read');
    if (!allowed.has(task.companyId)) return null;
    const project: Project | null = await db.project.findFirst({
      where: { id: task.projectId },
    });
    // Only projects they are on the team of; the linker skips the rest too.
    if (!project || !isOnTeam(project, user.id)) return null;
    return { task, created: false, project };
  }
  const project = await findProject(user, point.project, 'tasks:read');
  if (!isOnTeam(project, user.id))
    throw new ToolError(
      `You are not on the ${project.name} team, so work cannot be logged to it. A lead can add you in the project's settings.`,
    );
  const title = point.task?.trim() || point.text;
  // Work on a scheduled task counts for one of its runs, not a new task.
  const schedule = matchSchedule(
    title,
    await db.taskSchedule.findMany({
      where: { projectId: project.id, active: true },
    }),
    project.id,
  );
  if (schedule) {
    // Not done yet: the line is linked by words, to an open run if any.
    if (point.status !== 'done') return null;
    const when = point.forDate ?? dayMentioned(point.text, day);
    const run = await completeScheduleRun(
      schedule,
      when ?? day,
      !!when,
      user.id,
    );
    return run ? { task: run, created: false, completed: true, project } : null;
  }
  const tasks: Task[] = await db.task.findMany({
    where: {
      projectId: project.id,
      status: { notIn: [TASK_STATUS.ARCHIVED, TASK_STATUS.IGNORED] },
    },
    orderBy: { updatedAt: 'desc' },
    take: 500,
  });
  const found =
    tasks.find((t) => t.id === title) ??
    // An open task first, so a repeated title picks up the current one.
    tasks.find((t) => same(t.title, title) && t.status !== TASK_STATUS.DONE) ??
    tasks.find((t) => same(t.title, title));
  if (found) {
    if (
      point.completeTask &&
      point.status === 'done' &&
      found.status !== TASK_STATUS.DONE
    ) {
      const done = await fitGoal(
        await db.task.update({
          where: { id: found.id },
          data: {
            ...statusChange(found, TASK_STATUS.DONE),
            updatedAt: new Date().toISOString(),
          },
        }),
      );
      await syncTaskPoints(done);
      return { task: done, created: false, completed: true, project };
    }
    return { task: found, created: false, project };
  }
  const task = await createTask(user, project, {
    title,
    status: STATUS_FOR_POINT[point.status] ?? TASK_STATUS.TODO,
    forDate: point.forDate,
    goal: point.goal,
    goalPart: point.goalPart,
  });
  return { task, created: true, project };
}
