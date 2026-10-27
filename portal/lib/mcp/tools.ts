import {
  lockMessage,
  LOOK_OPTIONS,
  LOOK_PARTS,
  LOOK_STYLES,
} from '@/lib/avatar/look';
import { getLook, saveLook } from '@/lib/avatar/server';
import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import { syncTaskPoints } from '@/lib/progress/server';
import { isOnTeam } from '@/lib/worklogs/linker';
import { PERSONAL_COMPANY } from '@/lib/worklogs/personal';
import { goalHistory, toDay } from '@/lib/workspace/projects';
import { runDueSchedules } from '@/lib/workspace/schedules';
import { getPublicUsers, getWorkspaceForUser } from '@/lib/workspace/server';
import type { CompanyMember, Project, Task } from '@/models/workspace';
import {
  MEMBER_STATUS,
  OPEN_TASK_STATUSES,
  PROJECT_STATUS,
  TASK_STATUS,
} from '@/models/workspace';

import { HIRING_TOOLS } from './hiring';
import { PLAN_TOOLS } from './plans';
import { SCHEDULE_TOOLS } from './schedules';
import { companiesWith, type Tool, ToolError } from './shared';
import type { PointInput, PointStatus, TidyPoint } from './worklog';
import {
  claudeLines,
  logPoints,
  POINT_STATUSES,
  tidyPoints,
  todayFor,
  typedLines,
} from './worklog';
import {
  createTask,
  describeTask,
  findProject,
  findTask,
  goalSummary,
  type PointTask,
  statusChange,
  taskForPoint,
  WORKSPACE_TOOLS,
} from './workspace';

/*
 * The tools the portal's MCP server offers an assistant acting for one
 * person. Every tool works with that person's own permissions.
 */

export { ToolError };

const STATUS_KEYS = Object.keys(POINT_STATUSES) as PointStatus[];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

async function userToday(user: SessionUser) {
  const record = await db.user.findFirst({ where: { id: user.id } });
  return todayFor(record?.timezone);
}

const taskView = (t: Task, projects: Map<string, Project>) => ({
  id: t.id,
  title: t.title,
  status: t.status,
  project: projects.get(t.projectId)?.name ?? null,
  dueDate: t.dueDate ?? null,
  ...(t.forDate && { forDate: t.forDate }),
  ...((t.assigneeIds?.length ?? 0) > 1 && { shared: true }),
});

export const TOOLS: Tool[] = [
  {
    name: 'get_context',
    title: 'Get my portal context',
    description:
      "The person's companies (with their people, for sharing tasks), projects (effort, parent project, goals with this period's progress and whether recent periods were met), their open tasks, and what has been logged in the Claude section today. Everyone also has a Personal company for private work only they can see. Call this first in a session so you can link work to the right project, task and goal.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: async (user) => {
      const workspace = await getWorkspaceForUser(user);
      const mine = workspace.filter((w) => w.member);
      const companies = (mine.length ? mine : workspace).map((w) => w.company);
      const companyIds = companies.map((c) => c.id);
      const today = await userToday(user);
      if (!companyIds.length)
        return {
          today,
          companies: [PERSONAL_COMPANY],
          projects: [],
          myTasks: [],
          loggedToday: await claudeLines(user.id, today),
          typedToday: await typedLines(user.id, today),
        };

      await runDueSchedules({ companyId: { in: companyIds } });
      const projects: Project[] = await db.project.findMany({
        where: {
          companyId: { in: companyIds },
          status: { notIn: [PROJECT_STATUS.ARCHIVED] },
        },
      });
      const byId = new Map(projects.map((p) => [p.id, p]));
      const goalTasks: Task[] = await db.task.findMany({
        where: {
          projectId: { in: projects.map((p) => p.id) },
          status: TASK_STATUS.DONE,
          goalId: {
            in: projects.flatMap((p) => (p.goals ?? []).map((g) => g.id)),
          },
        },
        select: {
          status: true,
          goalId: true,
          goalPartId: true,
          completedAt: true,
          forDate: true,
        },
      });
      const myTasks: Task[] = await db.task.findMany({
        where: {
          companyId: { in: companyIds },
          assigneeIds: user.id,
          status: { in: OPEN_TASK_STATUSES },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      });

      const members: CompanyMember[] = await db.companyMember.findMany({
        where: { companyId: { in: companyIds }, status: MEMBER_STATUS.ACTIVE },
        select: { userId: true, companyId: true },
      });
      const users: { id: string; name?: string; email?: string }[] =
        await getPublicUsers(members.map((m) => m.userId));
      const people = new Map(users.map((u) => [u.id, u]));
      const day = (d: unknown) =>
        d ? new Date(d as string).toISOString().slice(0, 10) : null;

      return {
        today,
        companies: [
          ...companies.map((c) => ({
            id: c.id,
            name: c.name,
            people: members
              .filter((m) => m.companyId === c.id)
              .map((m) => people.get(m.userId))
              .filter(Boolean)
              .map((u) => ({ name: u!.name, email: u!.email })),
          })),
          PERSONAL_COMPANY,
        ],
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          company: companies.find((c) => c.id === p.companyId)?.name,
          effort: p.effort ?? null,
          onTeam: isOnTeam(p, user.id),
          ...(p.parentId && { parent: byId.get(p.parentId)?.name ?? null }),
          goals: (p.goals ?? []).map((g) =>
            goalSummary(
              g,
              goalHistory(
                g,
                goalTasks,
                4,
                toDay(),
                g.since ?? day(p.createdAt),
              ),
            ),
          ),
        })),
        myTasks: myTasks
          .filter((t) => byId.has(t.projectId))
          .map((t) => taskView(t, byId)),
        loggedToday: await claudeLines(user.id, today),
        typedToday: await typedLines(user.id, today),
      };
    },
  },
  {
    name: 'log_work',
    title: 'Log work points',
    description: `Writes work points into the "Claude" section of the person's worklog for the day, so they can follow progress in the portal. Keep it to 2-3 points per session, one per deliverable the person would name in a standup (e.g. "Lyric video for the new song", "Thumbnails and YouTube pack for it"). Never a new point for a revision, version, round, fix or sub-step: update the existing point instead, naming it with point (its key from loggedToday, or its text) and saying what happened in note ("v6 rendered, 3 notes fixed"); every update goes on the point's timeline, which shows how long it took from start to finish. Log a point when you start it (doing), add notes as it moves, and end it with done, not_done or blocked; same text also updates the line instead of adding another. Use waiting when you need the person's permission or input. Keep each point one short line about the outcome, in plain words, never secrets or credentials. Name the project (and task) when you know it; otherwise the portal links it. When the person already typed a line for the same work (typedToday in get_context), set typedLine to its text so the two are linked as one point. Work can only be logged to projects the person leads or is on the team of (onTeam in get_context). When the project has no task for the work yet, name the task (or the goal it counts towards) and the portal creates it, already done for a done point; set completeTask to finish an existing task too. Work done early for a later week: set forDate to the day it was scheduled for, so it counts towards that week's goal (the line is still logged today). Set personal for the person's own private work (not for any company): only they will ever see it.`,
    inputSchema: {
      type: 'object',
      properties: {
        points: {
          type: 'array',
          minItems: 1,
          maxItems: 20,
          items: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description:
                  'One line naming the deliverable, e.g. "Fix login redirect on Safari". Can be left out when point names an existing one.',
              },
              point: {
                type: 'string',
                description:
                  'An existing point to update: its key (loggedToday) or text. Keeps its words; use note for what happened.',
              },
              note: {
                type: 'string',
                description:
                  'What just happened, for the point\'s timeline, e.g. "v6 rendered" (optional).',
              },
              typedLine: {
                type: 'string',
                description:
                  'Text of a line the person typed for the same work (typedToday), to link it to this point (optional).',
              },
              status: {
                type: 'string',
                enum: STATUS_KEYS,
                description:
                  'doing, done, not_done (dropped or failed), blocked, or waiting (on the person).',
              },
              project: {
                type: 'string',
                description: 'Project id or exact name (optional).',
              },
              task: {
                type: 'string',
                description:
                  'Task id or exact title (optional). With a project named, a title the project does not have yet becomes a new task.',
              },
              goal: {
                type: 'string',
                description:
                  'Goal id or title this work counts towards (optional). With no task named, the point becomes a task for it.',
              },
              goalPart: {
                type: 'string',
                description: 'Part of the goal, e.g. a channel (optional).',
              },
              forDate: {
                type: 'string',
                description:
                  'YYYY-MM-DD the work was scheduled for, when done early (optional).',
              },
              completeTask: {
                type: 'boolean',
                description: 'With status done: also mark the named task done.',
              },
              personal: {
                type: 'boolean',
                description:
                  "True for the person's own private work. It goes under their Personal company and no one else sees it.",
              },
            },
            required: ['status'],
          },
        },
        date: {
          type: 'string',
          description:
            "YYYY-MM-DD. Defaults to today in the person's timezone.",
        },
      },
      required: ['points'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    run: async (user, args) => {
      const points: (PointInput & PointTask)[] = (
        Array.isArray(args?.points) ? args.points : []
      )
        .slice(0, 20)
        .map((p: any) => ({
          text: typeof p?.text === 'string' ? p.text.trim().slice(0, 300) : '',
          point:
            typeof p?.point === 'string' && p.point.trim()
              ? p.point.trim().slice(0, 300)
              : undefined,
          note: typeof p?.note === 'string' ? p.note : undefined,
          typedLine:
            typeof p?.typedLine === 'string'
              ? p.typedLine.slice(0, 300)
              : undefined,
          status: STATUS_KEYS.includes(p?.status) ? p.status : 'done',
          project: typeof p?.project === 'string' ? p.project : undefined,
          task: typeof p?.task === 'string' ? p.task : undefined,
          personal: p?.personal === true,
          goal: typeof p?.goal === 'string' ? p.goal : undefined,
          goalPart: typeof p?.goalPart === 'string' ? p.goalPart : undefined,
          forDate:
            typeof p?.forDate === 'string' && DAY.test(p.forDate)
              ? p.forDate
              : undefined,
          completeTask: p?.completeTask === true,
        }))
        .filter(
          (p: PointInput & PointTask) =>
            !!p.point || p.text.replace(/[^\p{L}\p{N}]/gu, '').length >= 3,
        );
      if (!points.length)
        throw new ToolError('Give at least one point with some text.');
      const date =
        typeof args?.date === 'string' && DAY.test(args.date)
          ? args.date
          : await userToday(user);
      // Find or create each point's task first, so the line links to it.
      const tasks: Record<string, unknown>[] = [];
      for (const point of points) {
        if (point.personal || !point.text) continue;
        try {
          const found = await taskForPoint(user, point);
          if (!found) continue;
          point.place = {
            companyId: found.task.companyId,
            projectId: found.task.projectId,
            taskId: found.task.id,
          };
          if (found.created || found.completed)
            tasks.push({
              ...(await describeTask(found.task, found.project)),
              ...(found.created ? { created: true } : { completed: true }),
            });
        } catch (error) {
          if (!(error instanceof ToolError)) throw error;
          tasks.push({ point: point.text, problem: error.message });
        }
      }
      const logged = await logPoints(user, points, date);
      return { date, ...logged, ...(tasks.length && { tasks }) };
    },
  },
  {
    name: 'tidy_points',
    title: 'Tidy a day of work points',
    description: `Rewrites a day's Claude points as fewer ones, when a day was logged in too many small points (a line per version, round or fix). Each new point lists the existing points it replaces in merge (their keys from loggedToday, or their texts); points that should go entirely are listed in drop. Every existing point must be merged or dropped. Merged points' history moves onto the new point, with their words kept as notes on its timeline. Show the person the new list and get their OK before calling this.`,
    inputSchema: {
      type: 'object',
      properties: {
        points: {
          type: 'array',
          minItems: 1,
          maxItems: 30,
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'The new point, one line.' },
              status: { type: 'string', enum: STATUS_KEYS },
              merge: {
                type: 'array',
                items: { type: 'string' },
                description: 'Keys or texts of the points it replaces.',
              },
              project: {
                type: 'string',
                description: 'Project id or exact name (optional).',
              },
              typedLine: {
                type: 'string',
                description:
                  'Text of a line the person typed for the same work, to link (optional).',
              },
            },
            required: ['text', 'status', 'merge'],
          },
        },
        drop: {
          type: 'array',
          items: { type: 'string' },
          description: 'Keys or texts of points to remove without merging.',
        },
        date: {
          type: 'string',
          description:
            "YYYY-MM-DD. Defaults to today in the person's timezone.",
        },
      },
      required: ['points'],
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
    run: async (user, args) => {
      const points: TidyPoint[] = (
        Array.isArray(args?.points) ? args.points : []
      )
        .slice(0, 30)
        .map((p: any) => ({
          text: typeof p?.text === 'string' ? p.text.trim().slice(0, 300) : '',
          status: STATUS_KEYS.includes(p?.status) ? p.status : 'done',
          merge: Array.isArray(p?.merge)
            ? p.merge.filter((m: unknown) => typeof m === 'string')
            : [],
          project: typeof p?.project === 'string' ? p.project : undefined,
          typedLine:
            typeof p?.typedLine === 'string'
              ? p.typedLine.slice(0, 300)
              : undefined,
        }));
      if (
        !points.length ||
        points.some((p) => p.text.replace(/[^\p{L}\p{N}]/gu, '').length < 3)
      )
        throw new ToolError('Give each new point some text.');
      const keys = new Set(points.map((p) => p.text.toLowerCase()));
      if (keys.size < points.length)
        throw new ToolError('Two new points have the same text.');
      const drop: string[] = Array.isArray(args?.drop)
        ? args.drop.filter((d: unknown) => typeof d === 'string')
        : [];
      const date =
        typeof args?.date === 'string' && DAY.test(args.date)
          ? args.date
          : await userToday(user);
      return tidyPoints(user, points, drop, date);
    },
  },
  {
    name: 'find_tasks',
    title: 'Find tasks',
    description:
      'Searches open tasks in the projects the person can see, by words in the title. Use it to find the task a piece of work belongs to.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Words from the task title.' },
        project: {
          type: 'string',
          description: 'Project id or name (optional).',
        },
      },
      required: ['query'],
    },
    annotations: { readOnlyHint: true },
    run: async (user, args) => {
      const allowed = await companiesWith(user, 'tasks:read');
      if (!allowed.size) return { tasks: [] };
      const projects: Project[] = await db.project.findMany({
        where: {
          companyId: { in: Array.from(allowed.keys()) },
          status: { notIn: [PROJECT_STATUS.ARCHIVED] },
        },
      });
      const wantedProject =
        typeof args?.project === 'string'
          ? args.project.trim().toLowerCase()
          : '';
      const scoped = wantedProject
        ? projects.filter(
            (p) =>
              p.id === args.project || p.name.toLowerCase() === wantedProject,
          )
        : projects;
      const byId = new Map(scoped.map((p) => [p.id, p]));
      const words = String(args?.query ?? '')
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 1);
      const tasks: Task[] = scoped.length
        ? await db.task.findMany({
            where: {
              projectId: { in: scoped.map((p) => p.id) },
              status: { in: OPEN_TASK_STATUSES },
            },
            orderBy: { updatedAt: 'desc' },
            take: 500,
          })
        : [];
      const hits = tasks
        .map((t) => ({
          t,
          score: words.filter((w) => t.title.toLowerCase().includes(w)).length,
        }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 15);
      return { tasks: hits.map((x) => taskView(x.t, byId)) };
    },
  },
  {
    name: 'update_task_status',
    title: 'Update a task',
    description:
      'Moves a portal task to another status, e.g. IN_PROGRESS when you start it or IN_REVIEW when it is ready for the person to check. Only mark DONE when the person agrees the task is finished.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        status: {
          type: 'string',
          enum: [
            TASK_STATUS.TODO,
            TASK_STATUS.IN_PROGRESS,
            TASK_STATUS.IN_REVIEW,
            TASK_STATUS.DONE,
          ],
        },
      },
      required: ['taskId', 'status'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    run: async (user, args) => {
      const task = await findTask(user, args?.taskId, 'tasks:edit');
      const status = args?.status as TASK_STATUS;
      if (
        ![
          TASK_STATUS.TODO,
          TASK_STATUS.IN_PROGRESS,
          TASK_STATUS.IN_REVIEW,
          TASK_STATUS.DONE,
        ].includes(status)
      )
        throw new ToolError('Unknown status.');
      const updated: Task = await db.task.update({
        where: { id: task.id },
        data: {
          ...statusChange(task, status),
          updatedAt: new Date().toISOString(),
        },
      });
      await syncTaskPoints(updated);
      return { task: { id: updated.id, title: updated.title, status } };
    },
  },
  {
    name: 'add_task',
    title: 'Add a task',
    description:
      'Adds a task to a project. It is assigned to the person unless you name others; a task can be shared by several people, and everyone on it gets its points when it is done. Link it to a goal so it counts towards it, and set forDate to the day it is scheduled for (the goal period it counts in; work done early still counts for that day).',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project id or exact name.' },
        title: { type: 'string' },
        description: { type: 'string' },
        major: {
          type: 'boolean',
          description: 'True for a big piece of work (counts more points).',
        },
        assignees: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Everyone on the task: "me", names or emails from get_context. Defaults to the person.',
        },
        status: {
          type: 'string',
          enum: [
            TASK_STATUS.TODO,
            TASK_STATUS.IN_PROGRESS,
            TASK_STATUS.IN_REVIEW,
            TASK_STATUS.DONE,
          ],
        },
        goal: { type: 'string', description: 'Goal id or title (optional).' },
        goalPart: {
          type: 'string',
          description: 'Part of the goal (optional).',
        },
        forDate: { type: 'string', description: 'YYYY-MM-DD (optional).' },
        dueDate: { type: 'string', description: 'YYYY-MM-DD (optional).' },
      },
      required: ['project', 'title'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    run: async (user, args) => {
      const project = await findProject(user, args?.project);
      const task = await createTask(user, project, {
        ...args,
        title: args?.title,
      });
      return { task: await describeTask(task, project) };
    },
  },
  {
    name: 'get_avatar',
    title: 'See my character',
    description:
      "How the person's little character in the portal's World looks now, every choice for each part, the anime styles, and whether they can change it yet (a saved look stays for 30 days, or until they earn 100 more work points). Call this before set_avatar.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: async (user) => {
      const { look, lock } = await getLook(user.id);
      return {
        look,
        lock: { ...lock, message: lockMessage(lock) },
        options: LOOK_OPTIONS,
        styles: LOOK_STYLES.map((s) => s.name),
      };
    },
  },
  {
    name: 'set_avatar',
    title: 'Restyle my character',
    description:
      'Changes how the person\'s character in the portal\'s World looks. Turn what they ask for into these choices: "make me a pink-haired wizard with a cat" could be style Wizard with hairColor pink and pet cat. A style (anime looks such as Ninja, Samurai, Pop idol, Magical girl) sets the whole look first; parts you pass then change on top of it, and parts you leave out stay. Outfit colour "brand" is their company\'s colour. Once saved, the look is set for 30 days unless they earn 100 more work points, so describe what you will pick and get their OK before calling this. They see it in the World and in Settings › Character.',
    inputSchema: {
      type: 'object',
      properties: {
        style: {
          type: 'string',
          enum: LOOK_STYLES.map((s) => s.name),
          description: 'An anime style to start from.',
        },
        ...Object.fromEntries(
          LOOK_PARTS.map((part) => [
            part,
            { type: 'string', enum: [...LOOK_OPTIONS[part]] },
          ]),
        ),
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    run: async (user, args) => {
      const result = await saveLook(user.id, args);
      if (result.errors) throw new ToolError(result.errors.join(' '));
      return { look: result.look, lock: lockMessage(result.lock!) };
    },
  },
  ...WORKSPACE_TOOLS,
  ...PLAN_TOOLS,
  ...SCHEDULE_TOOLS,
  ...HIRING_TOOLS,
];

/** What tools/list returns: the tools this person can use. */
export async function toolList(user: SessionUser) {
  const visible = await Promise.all(
    TOOLS.map((t) => (t.visible ? t.visible(user) : true)),
  );
  return TOOLS.filter((_, i) => visible[i]).map(
    ({ run: _run, visible: _visible, ...tool }) => tool,
  );
}
