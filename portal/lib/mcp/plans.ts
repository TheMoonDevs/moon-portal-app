import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import { newStep, PLAN_STATUSES } from '@/lib/workspace/plans';
import {
  createPlan,
  deletePlan,
  mayChangePlan,
  planChoices,
  readPlanBody,
  stepToTask,
  teamProjectIds,
  withTasks,
} from '@/lib/workspace/planServer';
import { describeSchedule } from '@/lib/workspace/projects';
import type { Plan, PlanStep } from '@/models/workspace';

import { companiesWith, type Tool, ToolError } from './shared';
import { resolvePeople } from './workspace';

/*
 * Plans from a conversation: ideas in a company that firm up into steps
 * (what, which project, who, by when). A grand plan needs no project; a
 * project plan is linked to one and its steps stay inside it. Steps are
 * plain text, an existing task, or a project goal.
 */

const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

type Choices = Awaited<ReturnType<typeof planChoices>>;

async function findCompany(
  user: SessionUser,
  ref: unknown,
  permission: string,
) {
  const allowed = await companiesWith(user, permission);
  const wanted = typeof ref === 'string' ? ref.trim() : '';
  if (!wanted && allowed.size === 1) return Array.from(allowed.values())[0];
  const company = Array.from(allowed.values()).find(
    (c) => c.id === wanted || same(c.name, wanted),
  );
  if (!company)
    throw new ToolError(
      wanted
        ? `No company "${wanted}" where you can do that.`
        : 'Name the company.',
    );
  return company;
}

/** A plan by id or title, where the person may read (or edit) it. */
export async function findPlan(user: SessionUser, ref: unknown, edit = false) {
  const wanted = typeof ref === 'string' ? ref.trim() : '';
  if (!wanted) throw new ToolError('Give the plan id or title.');
  const readable = await companiesWith(user, 'tasks:read');
  const plans: Plan[] = readable.size
    ? await db.plan.findMany({
        where: { companyId: { in: Array.from(readable.keys()) } },
      })
    : [];
  const matches = plans.filter((p) => p.id === wanted || same(p.title, wanted));
  if (!matches.length) throw new ToolError(`No plan "${wanted}".`);
  if (matches.length > 1)
    throw new ToolError(
      `More than one plan is called "${wanted}". Use its id: ${matches
        .map((p) => p.id)
        .join(', ')}.`,
    );
  const plan = matches[0];
  if (edit) await mustChangePlan(user, plan, 'tasks:edit');
  return plan;
}

/** Throws unless the person may change (or delete) the plan; see mayChangePlan. */
async function mustChangePlan(
  user: SessionUser,
  plan: Plan,
  permission: 'tasks:edit' | 'tasks:delete',
) {
  const allowed = await companiesWith(user, permission);
  const teamIds = await teamProjectIds(plan.companyId, user.id);
  if (!mayChangePlan(plan, user.id, allowed.has(plan.companyId), teamIds))
    throw new ToolError(
      'Only the plan’s owner, the people on its projects or a manager can do that.',
    );
}

const projectRef = (choices: Choices, ref: unknown) => {
  if (ref === undefined) return undefined;
  if (ref === null || ref === '') return null;
  const wanted = String(ref);
  const project = choices.projects.find(
    (p) => p.id === wanted || same(p.name, wanted),
  );
  if (!project)
    throw new ToolError(
      `No project "${wanted}" in this company. Its projects: ${
        choices.projects.map((p) => p.name).join(', ') || 'none'
      }.`,
    );
  return project.id;
};

const dayRef = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new ToolError('Use YYYY-MM-DD for dates.');
  return value;
};

/** A step's fields from what the assistant passed. */
async function stepFields(
  user: SessionUser,
  companyId: string,
  choices: Choices,
  input: any,
): Promise<Partial<PlanStep>> {
  const fields: Partial<PlanStep> = {};
  if (typeof input?.text === 'string' && input.text.trim())
    fields.text = input.text.trim().slice(0, 300);
  if (typeof input?.notes === 'string') fields.notes = input.notes;
  const projectId = projectRef(choices, input?.project);
  if (projectId !== undefined) fields.projectId = projectId;
  const people = await resolvePeople(user, companyId, input?.people);
  if (people) fields.assigneeIds = people;
  const dueOn = dayRef(input?.dueOn);
  if (dueOn !== undefined) fields.dueOn = dueOn;
  if (typeof input?.done === 'boolean') fields.done = input.done;
  if (input?.task !== undefined) {
    if (input.task === null || input.task === '') fields.taskId = null;
    else {
      const wanted = String(input.task).trim();
      const matches: { id: string; title: string; projectId: string }[] =
        await db.task.findMany({
          where: {
            companyId,
            OR: [
              ...(/^[a-f0-9]{24}$/i.test(wanted) ? [{ id: wanted }] : []),
              {
                title: {
                  contains: `^${wanted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
                  mode: 'insensitive',
                },
              },
            ],
          },
          select: { title: true, projectId: true },
          take: 5,
        });
      if (!matches.length) throw new ToolError(`No task "${wanted}".`);
      if (matches.length > 1 && !matches.some((t) => t.id === wanted))
        throw new ToolError(
          `More than one task is called "${wanted}". Use its id: ${matches
            .map((t) => t.id)
            .join(', ')}.`,
        );
      const task = matches.find((t) => t.id === wanted) ?? matches[0];
      fields.taskId = task.id;
      fields.projectId = task.projectId;
      fields.text ??= task.title;
    }
  }
  if (input?.goal !== undefined) {
    if (input.goal === null || input.goal === '') fields.goalId = null;
    else {
      const wanted = String(input.goal).trim();
      const inProject = fields.projectId ?? null;
      const found = choices.projects
        .filter((p) => !inProject || p.id === inProject)
        .flatMap((p) => (p.goals ?? []).map((g) => ({ g, p })))
        .filter(({ g }) => g.id === wanted || same(g.title, wanted));
      if (!found.length) throw new ToolError(`No goal "${wanted}".`);
      if (found.length > 1)
        throw new ToolError(
          `More than one goal is called "${wanted}"; name the step's project too.`,
        );
      fields.goalId = found[0].g.id;
      fields.projectId = found[0].p.id;
      fields.text ??= found[0].g.title;
    }
  }
  return fields;
}

/** How a plan reads back to the assistant. */
async function planView(plan: Plan, choices?: Choices) {
  const c = choices ?? (await planChoices(plan.companyId));
  const [view] = await withTasks([plan]);
  const name = (id?: string | null) =>
    c.people.find((p) => p.id === id)?.name ?? null;
  return {
    id: view.id,
    title: view.title,
    status: view.status,
    linkedProject: view.projectId
      ? (c.projects.find((p) => p.id === view.projectId)?.name ?? null)
      : null,
    ...(view.notes && { notes: view.notes }),
    ...(view.endOn && { by: view.endOn }),
    owner: name(view.ownerId),
    people: (view.memberIds ?? []).map(name).filter(Boolean),
    steps: view.steps.map((s) => ({
      id: s.id,
      text: s.text,
      done: !!s.done,
      ...(s.projectId && {
        project: c.projects.find((p) => p.id === s.projectId)?.name,
      }),
      ...(s.assigneeIds.length && {
        people: s.assigneeIds.map(name).filter(Boolean),
      }),
      ...(s.dueOn && { by: s.dueOn }),
      ...(s.task && { task: s.task }),
      ...(s.goal && {
        goal: `${s.goal.title}: ${s.goal.done}/${s.goal.target}${
          s.goal.kind === 'scheduled' ? ` this ${s.goal.period}` : ''
        }`,
      }),
    })),
    ...(view.schedules.length && {
      scheduledTasks: view.schedules.map((s) => ({
        id: s.id,
        title: s.title,
        project: c.projects.find((p) => p.id === s.projectId)?.name,
        repeats: describeSchedule(s),
        ...(s.active ? { next: s.nextRunOn } : { paused: true }),
      })),
    }),
  };
}

const STEP_SCHEMA = {
  type: 'object',
  properties: {
    text: { type: 'string', description: 'What needs doing.' },
    project: {
      type: 'string',
      description: 'Project id or name; "" for none. Optional.',
    },
    people: {
      type: 'array',
      items: { type: 'string' },
      description: 'Who: "me", names or emails. Several can share a step.',
    },
    dueOn: { type: 'string', description: 'By when, YYYY-MM-DD.' },
    notes: { type: 'string' },
    task: {
      type: 'string',
      description:
        'Link an existing task (id or exact title) instead of plain text; "" unlinks it. Find tasks with find_tasks.',
    },
    goal: {
      type: 'string',
      description:
        'Make the step a goal of its project (goal id or title); "" for none.',
    },
  },
};

const LINK_SCHEMA = {
  type: 'string',
  description:
    'Project id or name to link the plan to (a project plan: its steps stay in that project and its sub-projects). Leave out for a grand plan across projects; "" unlinks.',
};

export const PLAN_TOOLS: Tool[] = [
  {
    name: 'list_plans',
    title: 'List plans',
    description:
      "The plans in the person's companies: ideas and what is planned, with their steps (what, which project, who, by when) and whether each step is done.",
    inputSchema: {
      type: 'object',
      properties: {
        company: {
          type: 'string',
          description: 'Company id or name (optional).',
        },
        includeFinished: {
          type: 'boolean',
          description: 'Also list done and dropped plans.',
        },
      },
    },
    annotations: { readOnlyHint: true },
    run: async (user, args) => {
      const readable = await companiesWith(user, 'tasks:read');
      const ids = args?.company
        ? [(await findCompany(user, args.company, 'tasks:read')).id]
        : Array.from(readable.keys());
      const plans: Plan[] = ids.length
        ? await db.plan.findMany({
            where: {
              companyId: { in: ids },
              ...(!args?.includeFinished && {
                status: { in: ['IDEA', 'ACTIVE'] },
              }),
            },
            orderBy: { updatedAt: 'desc' },
            take: 50,
          })
        : [];
      const choices = new Map<string, Choices>();
      for (const id of new Set(plans.map((p) => p.companyId)))
        choices.set(id, await planChoices(id));
      return {
        plans: await Promise.all(
          plans.map(async (p) => ({
            company: readable.get(p.companyId)?.name,
            ...(await planView(p, choices.get(p.companyId))),
          })),
        ),
      };
    },
  },
  {
    name: 'create_plan',
    title: 'Create a plan',
    description:
      "Creates a plan in a company. A grand plan can be just an idea (a title and notes) with no project, and its steps can name any of the company's projects; link it to a project (project) to make it that project's plan. Add steps as it firms up: plain text (what, which project, who, by when), an existing task (task) or a project goal (goal). Status IDEA by default, ACTIVE once decided.",
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string', description: 'Company id or name.' },
        project: LINK_SCHEMA,
        title: { type: 'string' },
        notes: { type: 'string', description: 'The idea, in their words.' },
        status: { type: 'string', enum: PLAN_STATUSES },
        by: { type: 'string', description: 'Done by, YYYY-MM-DD (optional).' },
        people: {
          type: 'array',
          items: { type: 'string' },
          description: 'People in the plan: names or emails.',
        },
        steps: { type: 'array', items: STEP_SCHEMA },
      },
      required: ['title'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    run: async (user, args) => {
      // Any member can start a plan.
      const company = await findCompany(user, args?.company, 'companies:read');
      const choices = await planChoices(company.id);
      const steps: PlanStep[] = [];
      for (const s of Array.isArray(args?.steps) ? args.steps.slice(0, 50) : [])
        steps.push(newStep(await stepFields(user, company.id, choices, s)));
      const { data, error } = await readPlanBody(
        {
          projectId: projectRef(choices, args?.project) ?? null,
          title: args?.title,
          notes: args?.notes,
          status: args?.status ?? 'IDEA',
          endOn: dayRef(args?.by) ?? null,
          memberIds:
            (await resolvePeople(user, company.id, args?.people)) ?? [],
          steps,
        },
        choices,
      );
      if (error || !data) throw new ToolError(error ?? 'Invalid plan.');
      const plan = await createPlan(company.id, user.id, data);
      return { plan: await planView(plan, choices) };
    },
  },
  {
    name: 'update_plan',
    title: 'Change a plan',
    description:
      'Changes a plan: its title, notes, status, date, owner or people, the project it is linked to, and its steps. Add steps with addSteps; change steps with updateSteps (find each by id or exact text; set makeTask to turn a step that has a project into a task in that project); remove steps with removeSteps.',
    inputSchema: {
      type: 'object',
      properties: {
        plan: { type: 'string', description: 'Plan id or exact title.' },
        project: LINK_SCHEMA,
        title: { type: 'string' },
        notes: { type: 'string' },
        status: { type: 'string', enum: PLAN_STATUSES },
        by: { type: 'string', description: 'YYYY-MM-DD, or "" to clear.' },
        owner: { type: 'string', description: 'Name or email.' },
        people: { type: 'array', items: { type: 'string' } },
        addSteps: { type: 'array', items: STEP_SCHEMA },
        updateSteps: {
          type: 'array',
          items: {
            ...STEP_SCHEMA,
            properties: {
              step: { type: 'string', description: 'Step id or exact text.' },
              ...STEP_SCHEMA.properties,
              done: { type: 'boolean' },
              makeTask: {
                type: 'boolean',
                description: 'Make the step a task in its project.',
              },
            },
            required: ['step'],
          },
        },
        removeSteps: {
          type: 'array',
          items: { type: 'string' },
          description: 'Step ids or exact texts.',
        },
      },
      required: ['plan'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    run: async (user, args) => {
      let plan = await findPlan(user, args?.plan, true);
      const choices = await planChoices(plan.companyId);
      const findStep = (steps: PlanStep[], ref: unknown) => {
        const wanted = String(ref ?? '');
        const step = steps.find((s) => s.id === wanted || same(s.text, wanted));
        if (!step) throw new ToolError(`The plan has no step "${wanted}".`);
        return step;
      };

      let steps = [...(plan.steps ?? [])];
      const toTask: string[] = [];
      for (const s of Array.isArray(args?.updateSteps)
        ? args.updateSteps
        : []) {
        const step = findStep(steps, s?.step);
        const fields = await stepFields(user, plan.companyId, choices, s);
        steps = steps.map((x) => (x.id === step.id ? { ...x, ...fields } : x));
        if (s?.makeTask) toTask.push(step.id);
      }
      if (Array.isArray(args?.removeSteps)) {
        const gone = new Set(
          args.removeSteps.map((r: unknown) => findStep(steps, r).id),
        );
        steps = steps.filter((s) => !gone.has(s.id));
      }
      for (const s of Array.isArray(args?.addSteps) ? args.addSteps : [])
        steps.push(newStep(await stepFields(user, plan.companyId, choices, s)));

      const body: Record<string, unknown> = { steps };
      if (args?.project !== undefined)
        body.projectId = projectRef(choices, args.project);
      if (args?.title !== undefined) body.title = args.title;
      if (args?.notes !== undefined) body.notes = args.notes;
      if (args?.status !== undefined) body.status = args.status;
      if (args?.by !== undefined) body.endOn = dayRef(args.by);
      if (args?.owner !== undefined)
        body.ownerId = (
          await resolvePeople(user, plan.companyId, [args.owner])
        )?.[0];
      if (args?.people !== undefined)
        body.memberIds = await resolvePeople(user, plan.companyId, args.people);
      const { data, error } = await readPlanBody(body, choices, plan);
      if (error || !data) throw new ToolError(error ?? 'Invalid plan.');
      plan = await db.plan.update({
        where: { id: plan.id },
        data: { ...data, updatedAt: new Date().toISOString() },
      });

      const problems: string[] = [];
      if (toTask.length) {
        const creators = await companiesWith(user, 'tasks:create');
        const teamIds = await teamProjectIds(plan.companyId, user.id);
        for (const id of toTask) {
          const projectId = plan.steps.find((s) => s.id === id)?.projectId;
          if (
            projectId &&
            !creators.has(plan.companyId) &&
            !teamIds.includes(projectId)
          ) {
            problems.push('Only the people on a project can add its tasks.');
            continue;
          }
          const result = await stepToTask(plan, id, user.id);
          if (result.plan) plan = result.plan;
          else problems.push(result.error ?? 'Could not make the task.');
        }
      }
      return {
        plan: await planView(plan, choices),
        ...(problems.length && { problems }),
      };
    },
  },
  {
    name: 'delete_plan',
    title: 'Delete a plan',
    description:
      'Deletes a plan and its steps. Tasks made from its steps stay. Confirm with the person first.',
    inputSchema: {
      type: 'object',
      properties: {
        plan: { type: 'string', description: 'Plan id or exact title.' },
      },
      required: ['plan'],
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
    run: async (user, args) => {
      const plan = await findPlan(user, args?.plan);
      await mustChangePlan(user, plan, 'tasks:delete');
      await deletePlan(plan);
      return { deleted: plan.title };
    },
  },
];
