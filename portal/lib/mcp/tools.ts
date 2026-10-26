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
import { goalProgress, PERIOD_LABELS } from '@/lib/workspace/projects';
import { runDueSchedules } from '@/lib/workspace/schedules';
import { getWorkspaceForUser } from '@/lib/workspace/server';
import type { Project, Task } from '@/models/workspace';
import {
  OPEN_TASK_STATUSES,
  PROJECT_STATUS,
  TASK_SIZE,
  TASK_STATUS,
} from '@/models/workspace';

import { HIRING_TOOLS } from './hiring';
import { companiesWith, type Tool, ToolError } from './shared';
import type { PointInput, PointStatus } from './worklog';
import { claudeLines, logPoints, POINT_STATUSES, todayFor } from './worklog';

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

async function findTask(user: SessionUser, ref: unknown, permission: string) {
  if (typeof ref !== 'string' || !ref.trim())
    throw new ToolError('Give the task id (from get_context or find_tasks).');
  const allowed = await companiesWith(user, permission);
  const task: Task | null = await db.task.findFirst({
    where: { id: ref.trim() },
  });
  if (!task) throw new ToolError(`No task with id "${ref}".`);
  if (!allowed.has(task.companyId))
    throw new ToolError(
      `You do not have permission to change tasks in that company.`,
    );
  return task;
}

async function findProject(user: SessionUser, ref: unknown) {
  if (typeof ref !== 'string' || !ref.trim())
    throw new ToolError('Give a project id or name.');
  const allowed = await companiesWith(user, 'tasks:create');
  const projects: Project[] = allowed.size
    ? await db.project.findMany({
        where: {
          companyId: { in: Array.from(allowed.keys()) },
          status: { notIn: [PROJECT_STATUS.ARCHIVED] },
        },
      })
    : [];
  const wanted = ref.trim().toLowerCase();
  const matches = projects.filter(
    (p) => p.id === ref.trim() || p.name.trim().toLowerCase() === wanted,
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1)
    throw new ToolError(
      `More than one project is called "${ref}". Use its id: ${matches
        .map((p) => `${p.id} (${allowed.get(p.companyId)?.name})`)
        .join(', ')}.`,
    );
  throw new ToolError(
    `No project "${ref}" where you can add tasks. Call get_context to see your projects.`,
  );
}

const taskView = (t: Task, projects: Map<string, Project>) => ({
  id: t.id,
  title: t.title,
  status: t.status,
  project: projects.get(t.projectId)?.name ?? null,
  dueDate: t.dueDate ?? null,
});

export const TOOLS: Tool[] = [
  {
    name: 'get_context',
    title: 'Get my portal context',
    description:
      "The person's companies, projects (with goals and this period's progress), their open tasks, and what has been logged in the Claude section today. Call this first in a session so you can link work to the right project and task.",
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
          companies: [],
          projects: [],
          myTasks: [],
          loggedToday: await claudeLines(user.id, today),
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

      return {
        today,
        companies: companies.map((c) => ({ id: c.id, name: c.name })),
        projects: projects.map((p) => {
          const progress = goalProgress(p.goals ?? [], goalTasks);
          return {
            id: p.id,
            name: p.name,
            company: companies.find((c) => c.id === p.companyId)?.name,
            goals: (p.goals ?? []).map((g, i) => ({
              title: g.title,
              target: `${g.target} ${PERIOD_LABELS[g.period]}`,
              done: progress[i]?.done ?? 0,
            })),
          };
        }),
        myTasks: myTasks
          .filter((t) => byId.has(t.projectId))
          .map((t) => taskView(t, byId)),
        loggedToday: await claudeLines(user.id, today),
      };
    },
  },
  {
    name: 'log_work',
    title: 'Log work points',
    description: `Writes work points into the "Claude" section of the person's worklog for the day, so they can follow progress in the portal. Log a point when you start a piece of work (doing) and log it again with the same text when it ends (done, not_done or blocked); same text updates the line instead of adding another. Use waiting when you need the person's permission or input. Keep each point one short line about the outcome, in plain words, never secrets or credentials. Name the project (and task) when you know it; otherwise the portal links it.`,
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
                description: 'One line, e.g. "Fix login redirect on Safari".',
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
                description: 'Task id or exact title (optional).',
              },
            },
            required: ['text', 'status'],
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
      const points: PointInput[] = (
        Array.isArray(args?.points) ? args.points : []
      )
        .slice(0, 20)
        .map((p: any) => ({
          text: typeof p?.text === 'string' ? p.text.trim().slice(0, 300) : '',
          status: STATUS_KEYS.includes(p?.status) ? p.status : 'done',
          project: typeof p?.project === 'string' ? p.project : undefined,
          task: typeof p?.task === 'string' ? p.task : undefined,
        }))
        .filter(
          (p: PointInput) => p.text.replace(/[^\p{L}\p{N}]/gu, '').length >= 3,
        );
      if (!points.length)
        throw new ToolError('Give at least one point with some text.');
      const date =
        typeof args?.date === 'string' && DAY.test(args.date)
          ? args.date
          : await userToday(user);
      const logged = await logPoints(user, points, date);
      return { date, logged };
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
      const now = new Date().toISOString();
      const updated: Task = await db.task.update({
        where: { id: task.id },
        data: {
          status,
          completedAt:
            status === TASK_STATUS.DONE
              ? task.status === TASK_STATUS.DONE
                ? task.completedAt
                : now
              : null,
          updatedAt: now,
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
      'Adds a task to a project, assigned to the person. Use it for follow-up work the person asked you to track.',
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
      },
      required: ['project', 'title'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    run: async (user, args) => {
      const project = await findProject(user, args?.project);
      const title =
        typeof args?.title === 'string' ? args.title.trim().slice(0, 200) : '';
      if (!title) throw new ToolError('Give the task a title.');
      const now = new Date().toISOString();
      const task: Task = await db.task.create({
        data: {
          companyId: project.companyId,
          projectId: project.id,
          title,
          description:
            typeof args?.description === 'string'
              ? args.description.slice(0, 4000)
              : null,
          size: args?.major ? TASK_SIZE.MAJOR : TASK_SIZE.MINOR,
          status: TASK_STATUS.TODO,
          assigneeIds: [user.id],
          dueDate: null,
          completedAt: null,
          goalId: null,
          goalPartId: null,
          createdById: user.id,
          createdAt: now,
          updatedAt: now,
        },
      });
      return {
        task: { id: task.id, title: task.title, project: project.name },
      };
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
