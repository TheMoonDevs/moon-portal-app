import { brandKitDefaults } from '@/lib/brandKit';
import { CLAUDE_SECTION_ID, statusOf, todayFor } from '@/lib/mcp/worklog';
import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import { lineKey, normalizeLine, PRIVATE_LINE } from '@/lib/worklogs/lines';
import {
  metricLabel,
  metricsWithData,
  periodRange,
  rankProjects,
} from '@/lib/workspace/projects';
import { getWorkspaceForUser } from '@/lib/workspace/server';
import type { PointEntry } from '@/models/progress';
import type { WorklogLink, WorkLogs } from '@/models/worklogs';
import type {
  CompanyMember,
  Project,
  ProjectResult,
  Task,
  TaskSchedule,
} from '@/models/workspace';
import { MEMBER_STATUS, PROJECT_STATUS, TASK_STATUS } from '@/models/workspace';

import type {
  BotPoint,
  LeaderRow,
  World,
  WorldBot,
  WorldBrand,
  WorldPerson,
  WorldProject,
  WorldSite,
  WorldTown,
} from './state';
import { botProgress, botState, currentPoint, GUIDANCE_WEIGHT } from './state';

const LEADERS = 5;
/** Task buildings shown per project, the most done first. */
const MAX_SITES = 36;

/**
 * Which kind of task this is: tasks from the same schedule or for the same
 * goal are one kind, and otherwise tasks with the same title once numbers
 * are left out ("Lyric video 12" and "Lyric video 13").
 */
const kindOf = (
  t: Pick<Task, 'scheduleId' | 'goalId' | 'goalPartId' | 'title'>,
) =>
  t.scheduleId
    ? `s-${t.scheduleId}`
    : t.goalId
      ? `g-${t.goalId}-${t.goalPartId ?? ''}`
      : `t-${(t.title ?? '')
          .toLowerCase()
          .replace(/[^\p{L}]+/gu, ' ')
          .trim()}`;

/** A project's kinds of task as buildings, most done first. */
function sitesOf(
  project: Project,
  tasks: Task[],
  schedules: Map<string, string>,
): WorldSite[] {
  const sites = new Map<string, WorldSite>();
  for (const t of tasks) {
    const id = `${project.id}:${kindOf(t)}`;
    let site = sites.get(id);
    if (!site) {
      const goal = project.goals?.find((g) => g.id === t.goalId);
      const part = goal?.parts?.find((p) => p.id === t.goalPartId);
      site = {
        id,
        name:
          (t.scheduleId && schedules.get(t.scheduleId)) ||
          (goal ? `${goal.title}${part ? ` · ${part.label}` : ''}` : '') ||
          t.title.replace(/\s*#?\d+\s*$/, '') ||
          'Task',
        done: 0,
        open: 0,
      };
      sites.set(id, site);
    }
    if (t.status === TASK_STATUS.DONE) site.done += 1;
    else site.open += 1;
  }
  return Array.from(sites.values())
    .sort((a, b) => b.done - a.done || b.open - a.open)
    .slice(0, MAX_SITES);
}

const PALETTE = [
  '#2563eb',
  '#dc2626',
  '#7c3aed',
  '#059669',
  '#ea580c',
  '#0891b2',
  '#db2777',
];

/** A town's or building's look, from its brand kit with sensible fallbacks. */
function brandOf(
  item: {
    id: string;
    color?: string | null;
    logo?: string | null;
    brandKit?: any;
  },
  fallback?: WorldBrand,
): WorldBrand {
  const kit = item.brandKit;
  const defaults = brandKitDefaults(kit);
  const hex = (v?: string | null) =>
    v && /^#[0-9a-f]{6}/i.test(v) ? v.slice(0, 7) : '';
  const primary =
    hex(defaults.color) ||
    hex(item.color) ||
    fallback?.primary ||
    PALETTE[
      Array.from(item.id).reduce((n, c) => n + c.charCodeAt(0), 0) %
        PALETTE.length
    ];
  const secondary =
    hex(
      kit?.colors?.find(
        (c: any) =>
          hex(c.hex) && hex(c.hex).toLowerCase() !== primary.toLowerCase(),
      )?.hex,
    ) ||
    fallback?.secondary ||
    '#111827';
  return {
    primary,
    secondary,
    logo: item.logo || defaults.logo || null,
    font: kit?.fonts?.[0]?.family || fallback?.font || null,
  };
}

const meaningful = (line: string) =>
  normalizeLine(line).replace(/[^\p{L}\p{N}]/gu, '').length >= 3;

const sectionLines = (content: unknown) =>
  (typeof content === 'string' ? content : '').split('\n').filter(meaningful);

/** Adds `n` to `map[a][b]`. */
const bump = (
  map: Map<string, Map<string, number>>,
  a: string,
  b: string,
  n: number,
) => {
  const inner = map.get(a) ?? new Map<string, number>();
  inner.set(b, (inner.get(b) ?? 0) + n);
  map.set(a, inner);
};

const top = (
  scores: Map<string, number> | undefined,
  names: Map<string, string>,
  avatars: Map<string, string | null>,
) =>
  Array.from(scores?.entries() ?? [])
    .filter(([id, points]) => points > 0 && names.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, LEADERS)
    .map(
      ([id, points]): LeaderRow => ({
        id,
        name: names.get(id)!,
        avatar: avatars.get(id) ?? null,
        points,
      }),
    );

/**
 * The world as the viewer sees it: the companies they belong to as towns,
 * their projects as squares of task buildings, everyone in them, and today's
 * bots. Private lines are never included, and other people's own lines are
 * only counted.
 */
export async function buildWorld(viewer: SessionUser): Promise<World> {
  const workspace = await getWorkspaceForUser(viewer);
  const mine = workspace.filter((w) => w.member);
  const companies = (mine.length ? mine : workspace).map((w) => w.company);
  const companyIds = companies.map((c) => c.id);
  const empty = { towns: [], projects: [], people: [], bots: [] };
  if (!companyIds.length) return { date: todayFor(null), ...empty };

  const [projects, members]: [Project[], CompanyMember[]] = await Promise.all([
    db.project.findMany({
      where: {
        companyId: { in: companyIds },
        status: { notIn: [PROJECT_STATUS.ARCHIVED] },
      },
    }),
    db.companyMember.findMany({
      where: { companyId: { in: companyIds }, status: MEMBER_STATUS.ACTIVE },
    }),
  ]);
  const users = await db.user.findMany({
    where: {
      id: {
        in: Array.from(new Set([viewer.id, ...members.map((m) => m.userId)])),
      },
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      positionTitle: true,
      timezone: true,
    },
  });
  const names = new Map<string, string>(
    users.map((u: any) => [u.id, u.name || u.username]),
  );
  const avatars = new Map<string, string | null>(
    users.map((u: any) => [u.id, u.avatar ?? null]),
  );
  const userIds = Array.from(names.keys());
  const today = todayFor(users.find((u: any) => u.id === viewer.id)?.timezone);
  const week = periodRange('week', today);

  const projectIds = projects.map((p) => p.id);
  const [logs, entries, results, tasks, schedules]: [
    WorkLogs[],
    PointEntry[],
    ProjectResult[],
    Task[],
    TaskSchedule[],
  ] = await Promise.all([
    db.workLogs.findMany({
      where: {
        userId: { in: userIds },
        logType: 'dayLog',
        date: { gte: week.from, lte: today },
      },
    }),
    db.pointEntry.findMany({
      where: {
        userId: { in: userIds },
        projectId: { in: projects.map((p) => p.id) },
        date: { gte: week.from, lte: today },
      },
    }),
    projects.length
      ? db.projectResult.findMany({
          where: { projectId: { in: projects.map((p) => p.id) } },
        })
      : [],
    projectIds.length
      ? db.task.findMany({
          where: {
            projectId: { in: projectIds },
            status: {
              notIn: [TASK_STATUS.ARCHIVED, TASK_STATUS.IGNORED],
            },
          },
          select: {
            projectId: true,
            title: true,
            status: true,
            scheduleId: true,
            goalId: true,
            goalPartId: true,
          },
        })
      : [],
    projectIds.length
      ? db.taskSchedule.findMany({
          where: { projectId: { in: projectIds } },
          select: { title: true },
        })
      : [],
  ]);

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const scheduleTitles = new Map(schedules.map((s) => [s.id, s.title]));
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const townsOf = (userId: string) =>
    companyIds.filter((id) =>
      members.some((m) => m.userId === userId && m.companyId === id),
    );

  // This week's points: worklog lines linked to a project, and task points.
  const byProject = new Map<string, Map<string, number>>();
  const guidanceByUser = new Map<string, number>();
  for (const log of logs) {
    const userId = log.userId as string;
    guidanceByUser.set(
      userId,
      (guidanceByUser.get(userId) ?? 0) + (log.guidance ?? 0),
    );
    for (const link of (log.links ?? []) as WorklogLink[]) {
      if (link.isPrivate || !link.projectId || !projectById.has(link.projectId))
        continue;
      bump(byProject, link.projectId, userId, 1);
    }
  }
  for (const e of entries)
    if (e.projectId) bump(byProject, e.projectId, e.userId, e.points);

  const total = (scores?: Map<string, number>) =>
    Array.from(scores?.values() ?? []).reduce((n, v) => n + v, 0);

  // Projects, ranked in their town on their latest result if any project
  // has one, else on this week's points.
  const townBrand = new Map(companies.map((c) => [c.id, brandOf(c as any)]));
  const worldProjects: WorldProject[] = [];
  for (const town of companies) {
    const inTown = projects.filter((p) => p.companyId === town.id);
    const townResults = results.filter((r) => r.companyId === town.id);
    const metric = metricsWithData(townResults)[0];
    const standings = metric ? rankProjects(townResults, metric) : [];
    const ordered = [...inTown].sort((a, b) => {
      const ra = standings.find((s) => s.projectId === a.id)?.rank ?? 1e9;
      const rb = standings.find((s) => s.projectId === b.id)?.rank ?? 1e9;
      return ra - rb || total(byProject.get(b.id)) - total(byProject.get(a.id));
    });
    ordered.forEach((p, i) =>
      worldProjects.push({
        id: p.id,
        name: p.name,
        color: p.color ?? null,
        logo: p.logo ?? null,
        brand: brandOf(p as any, {
          ...townBrand.get(town.id)!,
          logo: null,
        }),
        townId: town.id,
        rank: i + 1,
        weekPoints: total(byProject.get(p.id)),
        rankedBy: metric ? metricLabel(metric) : 'Points this week',
        leaderboard: top(byProject.get(p.id), names, avatars),
        sites: sitesOf(
          p,
          tasks.filter((t) => t.projectId === p.id),
          scheduleTitles,
        ),
      }),
    );
  }

  // Towns: people ranked on their points across the town's projects, plus
  // guidance (which counts for more).
  const towns: WorldTown[] = companies.map((c) => {
    const scores = new Map<string, number>();
    for (const p of projects.filter((x) => x.companyId === c.id))
      for (const [userId, n] of Array.from(
        byProject.get(p.id)?.entries() ?? [],
      ))
        scores.set(userId, (scores.get(userId) ?? 0) + n);
    for (const [userId, g] of Array.from(guidanceByUser.entries()))
      if (townsOf(userId).includes(c.id))
        scores.set(userId, (scores.get(userId) ?? 0) + g * GUIDANCE_WEIGHT);
    return {
      id: c.id,
      name: c.name,
      color: c.color ?? null,
      logo: c.logo ?? null,
      brand: townBrand.get(c.id)!,
      weekPoints: total(scores),
      leaderboard: top(scores, names, avatars),
    };
  });

  // Today: people, and one bot per person per project their Claude worked on.
  const people: WorldPerson[] = [];
  const bots: WorldBot[] = [];
  for (const u of users as any[]) {
    const towns = townsOf(u.id);
    const homes = towns.length
      ? towns
      : u.id === viewer.id
        ? [companyIds[0]]
        : [];
    if (!homes.length) continue;
    const log = logs.find((l) => l.userId === u.id && l.date === today);
    const works = Array.isArray(log?.works) ? (log!.works as any[]) : [];
    people.push({
      id: u.id,
      name: names.get(u.id)!,
      avatar: u.avatar ?? null,
      title: u.positionTitle ?? null,
      isMe: u.id === viewer.id,
      townIds: homes,
      ownPoints: works
        .filter((w) => w?.link_id !== CLAUDE_SECTION_ID)
        .reduce((n, w) => n + sectionLines(w?.content).length, 0),
      guidance: log?.guidance ?? 0,
    });

    const links = (log?.links ?? []) as WorklogLink[];
    const groups = new Map<string, BotPoint[]>();
    const siteOfLine = new Map<BotPoint, string>();
    for (const raw of sectionLines(
      works.find((w) => w?.link_id === CLAUDE_SECTION_ID)?.content,
    )) {
      if (PRIVATE_LINE.test(raw)) continue;
      const link = links.find((l) => l.key === lineKey(raw));
      const projectId = link?.projectId;
      const key = projectId && projectById.has(projectId) ? projectId : '';
      const point: BotPoint = {
        text: normalizeLine(raw),
        status: statusOf(raw),
      };
      const task = link?.taskId ? taskById.get(link.taskId) : undefined;
      if (task && task.projectId === key)
        siteOfLine.set(point, `${key}:${kindOf(task)}`);
      groups.set(key, [...(groups.get(key) ?? []), point]);
    }
    for (const [projectId, points] of Array.from(groups.entries())) {
      const project = projectById.get(projectId);
      const state = botState(points);
      const current = currentPoint(points, state);
      // Its building: the one its current step is for, else its latest.
      const linked = points.filter((pt) => siteOfLine.has(pt));
      const at =
        linked.find((pt) => pt.text === current) ?? linked[linked.length - 1];
      bots.push({
        id: `${u.id}:${projectId || 'town'}`,
        ownerId: u.id,
        ownerName: names.get(u.id)!,
        ownerAvatar: u.avatar ?? null,
        townId: project?.companyId ?? homes[0],
        projectId: project?.id ?? null,
        siteId: at ? siteOfLine.get(at)! : null,
        state,
        current,
        points,
        progress: botProgress(points),
      });
    }
  }

  return { date: today, towns, projects: worldProjects, people, bots };
}
