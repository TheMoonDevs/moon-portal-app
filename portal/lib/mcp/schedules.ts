import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import { describeSchedule, WEEKDAYS } from '@/lib/workspace/projects';
import { readScheduleBody } from '@/lib/workspace/scheduleInput';
import { runDueSchedules } from '@/lib/workspace/schedules';
import type { Project, TaskSchedule } from '@/models/workspace';

import { findPlan } from './plans';
import { companiesWith, type Tool, ToolError } from './shared';
import { findProject, resolveGoal, resolvePeople } from './workspace';

/*
 * Scheduled tasks: repeating work that creates its own tasks in a project,
 * set up on the project or in a plan.
 */

const scheduleView = (s: TaskSchedule, project?: Project | null) => ({
  id: s.id,
  title: s.title,
  ...(project && { project: project.name }),
  repeats: describeSchedule(s),
  ...(s.active ? { next: s.nextRunOn } : { paused: true }),
  ...(s.planId && { planId: s.planId }),
});

/** "Mon", "monday" or 1 to the day number. */
const weekday = (d: unknown) => {
  if (typeof d === 'number' && d >= 0 && d <= 6) return d;
  const name = String(d).trim().slice(0, 3).toLowerCase();
  const i = WEEKDAYS.findIndex((w) => w.toLowerCase() === name);
  if (i < 0) throw new ToolError(`Unknown day "${d}". Use Mon, Tue … Sun.`);
  return i;
};

/** The schedule fields the assistant passed, in the API's shape. */
async function scheduleBody(user: SessionUser, project: Project, args: any) {
  const body: Record<string, unknown> = {};
  for (const key of ['title', 'every', 'monthDay', 'count', 'dueInDays'])
    if (args?.[key] !== undefined) body[key] = args[key];
  if (args?.days !== undefined)
    body.weekdays = (Array.isArray(args.days) ? args.days : [args.days]).map(
      weekday,
    );
  if (args?.people !== undefined)
    body.assigneeIds = await resolvePeople(
      user,
      project.companyId,
      args.people,
    );
  if (args?.goal !== undefined)
    Object.assign(body, resolveGoal(project, args.goal, args.goalPart));
  if (args?.major !== undefined) body.size = args.major ? 'MAJOR' : 'MINOR';
  if (typeof args?.active === 'boolean') body.active = args.active;
  return body;
}

const FIELDS = {
  title: { type: 'string', description: 'The task it creates.' },
  every: { type: 'string', enum: ['day', 'week', 'month'] },
  days: {
    type: 'array',
    items: { type: 'string' },
    description: 'For weekly: days such as ["Mon", "Thu"].',
  },
  monthDay: { type: 'integer', description: 'For monthly: 1 to 28.' },
  count: {
    type: 'integer',
    description: 'Tasks each time, e.g. 3 for three shorts.',
  },
  dueInDays: { type: 'integer', description: 'Due this many days later.' },
  people: {
    type: 'array',
    items: { type: 'string' },
    description: 'Who gets the tasks: "me", names or emails.',
  },
  goal: { type: 'string', description: 'Goal the tasks count towards.' },
  goalPart: { type: 'string' },
  major: { type: 'boolean' },
};

export const SCHEDULE_TOOLS: Tool[] = [
  {
    name: 'list_schedules',
    title: 'List scheduled tasks',
    description:
      'The scheduled (repeating) tasks of a project, with how often they run and when next.',
    inputSchema: {
      type: 'object',
      properties: { project: { type: 'string' } },
      required: ['project'],
    },
    annotations: { readOnlyHint: true },
    run: async (user, args) => {
      const project = await findProject(user, args?.project, 'tasks:read');
      const schedules: TaskSchedule[] = await db.taskSchedule.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: 'asc' },
      });
      return { schedules: schedules.map((s) => scheduleView(s, project)) };
    },
  },
  {
    name: 'add_schedule',
    title: 'Schedule a repeating task',
    description:
      'Sets up a task that creates itself in a project on a schedule, e.g. "Post a short" 3 times every Mon and Thu. Name a plan to set it up in that plan (it shows there, not as a step). Weekly needs days.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project id or exact name.' },
        plan: {
          type: 'string',
          description: 'Plan id or title to set it up in (optional).',
        },
        ...FIELDS,
      },
      required: ['project', 'title', 'every'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    run: async (user, args) => {
      const project = await findProject(user, args?.project, 'tasks:create');
      let planId: string | null = null;
      if (args?.plan) {
        const plan = await findPlan(user, args.plan, true);
        if (plan.companyId !== project.companyId)
          throw new ToolError('The project must be in the plan’s company.');
        planId = plan.id;
      }
      const body = await scheduleBody(user, project, args);
      if (!body.assigneeIds) body.assigneeIds = [user.id];
      const { data, error } = readScheduleBody(body, project);
      if (error || !data) throw new ToolError(error ?? 'Invalid schedule.');
      const now = new Date().toISOString();
      const schedule: TaskSchedule = await db.taskSchedule.create({
        data: {
          ...data,
          companyId: project.companyId,
          projectId: project.id,
          planId,
          lastRunOn: null,
          createdById: user.id,
          createdAt: now,
          updatedAt: now,
        },
      });
      await runDueSchedules({ projectId: { in: [project.id] } });
      return { schedule: scheduleView(schedule, project) };
    },
  },
  {
    name: 'update_schedule',
    title: 'Change a scheduled task',
    description:
      'Changes a scheduled task (find its id with list_schedules or list_plans): what it creates, how often, who gets it, or pause it with active false. Set remove to stop it for good; tasks it already made stay.',
    inputSchema: {
      type: 'object',
      properties: {
        schedule: { type: 'string', description: 'Schedule id.' },
        ...FIELDS,
        active: { type: 'boolean' },
        remove: { type: 'boolean' },
      },
      required: ['schedule'],
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
    run: async (user, args) => {
      const schedule: TaskSchedule | null = await db.taskSchedule.findFirst({
        where: { id: String(args?.schedule ?? '') },
      });
      const permission = args?.remove ? 'tasks:delete' : 'tasks:edit';
      const allowed = await companiesWith(user, permission);
      if (!schedule || !allowed.has(schedule.companyId))
        throw new ToolError(
          schedule
            ? 'You cannot change scheduled tasks in that company.'
            : `No scheduled task "${args?.schedule}".`,
        );
      const project: Project | null = await db.project.findFirst({
        where: { id: schedule.projectId },
      });
      if (!project) throw new ToolError('Its project is gone.');
      if (args?.remove) {
        await db.taskSchedule.delete({ where: { id: schedule.id } });
        return { removed: schedule.title };
      }
      const body = await scheduleBody(user, project, args);
      const { data, error } = readScheduleBody(body, project, schedule);
      if (error || !data) throw new ToolError(error ?? 'Invalid schedule.');
      const updated: TaskSchedule = await db.taskSchedule.update({
        where: { id: schedule.id },
        data: { ...data, updatedAt: new Date().toISOString() },
      });
      await runDueSchedules({ projectId: { in: [project.id] } });
      return { schedule: scheduleView(updated, project) };
    },
  },
];
