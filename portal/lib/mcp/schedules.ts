import { db } from '@/lib/mongodb/db-client';
import { addGoal, changeGoal } from '@/lib/workspace/goals';
import type { ProjectGoal, TaskSchedule } from '@/models/workspace';

import { findPlan } from './plans';
import { type Tool, ToolError } from './shared';
import { findProject, goalFields, goalView, resolveGoal } from './workspace';

/*
 * Repeating work. There is no separate task schedule any more: a scheduled
 * goal makes its own dated tasks. These tools keep their old names so
 * assistants that know them still work, and act on repeating goals.
 */

const FIELDS = {
  title: { type: 'string', description: 'What repeats, e.g. "Post a short".' },
  every: { type: 'string', enum: ['day', 'week', 'month'] },
  days: {
    type: 'array',
    items: { type: 'string' },
    description: 'For weekly: the days its tasks are for, e.g. ["Mon", "Thu"].',
  },
  monthDay: { type: 'integer', description: 'For monthly: 1 to 28.' },
  count: {
    type: 'integer',
    description: 'Tasks each time, e.g. 3 for three shorts.',
  },
  people: {
    type: 'array',
    items: { type: 'string' },
    description:
      'Who gets the tasks: "me", names or emails. Leave out for the whole team.',
  },
};

/** The goal's per-period target for `count` tasks on each of its days. */
const targetFor = (args: any, goal?: ProjectGoal) => {
  const count = Number.isInteger(args?.count) ? args.count : undefined;
  if (count === undefined) return undefined;
  const every = args?.every ?? goal?.period ?? 'week';
  const days = Array.isArray(args?.days)
    ? args.days.length
    : (goal?.days?.length ?? 0);
  return every === 'week' ? count * Math.max(1, days) : count;
};

export const SCHEDULE_TOOLS: Tool[] = [
  {
    name: 'list_schedules',
    title: 'List repeating goals',
    description:
      "A project's repeating (scheduled) goals: what they make, on which days, for whom, and the next run.",
    inputSchema: {
      type: 'object',
      properties: { project: { type: 'string' } },
      required: ['project'],
    },
    annotations: { readOnlyHint: true },
    run: async (user, args) => {
      const project = await findProject(user, args?.project, 'tasks:read');
      const schedules: TaskSchedule[] = await db.taskSchedule.findMany({
        where: { projectId: project.id, active: true },
      });
      return {
        goals: (project.goals ?? [])
          .filter((g) => g.kind !== 'target')
          .map((g) => ({
            ...goalView(g),
            next:
              schedules
                .filter((s) => s.goalId === g.id)
                .map((s) => s.nextRunOn)
                .sort()[0] ?? null,
          })),
      };
    },
  },
  {
    name: 'add_schedule',
    title: 'Add repeating work',
    description:
      'Sets up repeating work in a project, e.g. "Post a short" 3 times every Mon and Thu. It is a repeating goal (the same as set_goal with kind scheduled): it makes its own dated tasks on those days, and they count towards it. Name a plan to link it to that plan. With goal, it gives that existing goal these days instead.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project id or exact name.' },
        plan: {
          type: 'string',
          description: 'Plan id or title to link it to (optional).',
        },
        goal: {
          type: 'string',
          description: 'An existing goal to put on these days (optional).',
        },
        ...FIELDS,
      },
      required: ['project'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    run: async (user, args) => {
      const project = await findProject(user, args?.project, 'projects:edit');
      const { goalId } = resolveGoal(project, args?.goal);
      const existing = project.goals?.find((g) => g.id === goalId);
      const fields = await goalFields(
        user,
        project,
        {
          ...args,
          kind: 'scheduled',
          period: args?.every ?? existing?.period,
          target: targetFor(args, existing),
          makeTasks: true,
        },
        existing,
      );
      if (args?.plan) {
        const plan = await findPlan(user, args.plan, true);
        if (plan.companyId !== project.companyId)
          throw new ToolError('The project must be in the plan’s company.');
        fields.planId = plan.id;
      }
      if (existing) {
        const goal = await changeGoal(project, existing.id, fields, user.id);
        return { project: project.name, goal: goal && goalView(goal) };
      }
      if (!fields.title) throw new ToolError('Say what repeats (title).');
      const { goal } = await addGoal(
        project,
        { target: 1, period: 'week', ...fields },
        user.id,
      );
      return { project: project.name, goal: goal && goalView(goal) };
    },
  },
  {
    name: 'update_schedule',
    title: 'Change repeating work',
    description:
      'Changes a repeating goal (by goal id or title, or the id of its schedule from list_plans): its title, days, tasks each time, or who gets them. active false stops it making tasks, true starts again. remove stops it for good (the goal stays and can still be ticked off by hand; use remove_goal to drop the goal). Tasks it already made stay.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project id or exact name.' },
        goal: { type: 'string', description: 'Goal id or title.' },
        schedule: { type: 'string', description: 'Schedule id (instead).' },
        ...FIELDS,
        active: { type: 'boolean' },
        remove: { type: 'boolean' },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    run: async (user, args) => {
      let projectRef = args?.project;
      let goalRef = args?.goal;
      if (args?.schedule) {
        const schedule: TaskSchedule | null = await db.taskSchedule.findFirst({
          where: { id: String(args.schedule) },
        });
        if (!schedule?.goalId)
          throw new ToolError(`No repeating work "${args.schedule}".`);
        projectRef = schedule.projectId;
        goalRef = schedule.goalId;
      }
      if (!projectRef || !goalRef)
        throw new ToolError('Name the project and goal (or a schedule id).');
      const project = await findProject(user, projectRef, 'projects:edit');
      const { goalId } = resolveGoal(project, goalRef);
      const existing = project.goals!.find((g) => g.id === goalId)!;
      const fields = await goalFields(
        user,
        project,
        {
          ...args,
          period: args?.every,
          target: targetFor(args, existing),
          makeTasks: args?.remove
            ? false
            : typeof args?.active === 'boolean'
              ? args.active
              : undefined,
        },
        existing,
      );
      const goal = await changeGoal(project, existing.id, fields, user.id);
      return { project: project.name, goal: goal && goalView(goal) };
    },
  },
];
