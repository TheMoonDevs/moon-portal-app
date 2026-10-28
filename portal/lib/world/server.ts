import { lookOf } from '@/lib/avatar/look';
import { CLAUDE_SECTION_ID, statusOf, todayFor } from '@/lib/mcp/worklog';
import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import { lineKey, normalizeLine, PRIVATE_LINE } from '@/lib/worklogs/lines';
import { isPersonalLink } from '@/lib/worklogs/personal';
import { tallyRowsFor } from '@/lib/workspace/goalTally';
import type { DoneTask } from '@/lib/workspace/projects';
import {
  goalHistory,
  goalProgress,
  isTarget,
  metricLabel,
  metricsWithData,
  periodRange,
  rankProjects,
  toDay,
} from '@/lib/workspace/projects';
import { getWorkspaceForUser } from '@/lib/workspace/server';
import type { PointEntry } from '@/models/progress';
import type { WorklogLink, WorkLogs } from '@/models/worklogs';
import type {
  CompanyMember,
  Project,
  ProjectResult,
  Task,
} from '@/models/workspace';
import {
  MEMBER_STATUS,
  PROJECT_STATUS,
  TASK_SIZE,
  TASK_STATUS,
} from '@/models/workspace';

import type {
  BotPoint,
  LeaderRow,
  World,
  WorldBot,
  WorldHouse,
  WorldPerson,
  WorldProject,
  WorldSite,
  WorldTown,
} from './state';
import {
  botProgress,
  botState,
  brandOf,
  candyOf,
  currentPoint,
  GUIDANCE_WEIGHT,
  HOUSES_PER_LOT,
} from './state';

const LEADERS = 5;
/** Homes lots per project: this week's tasks for no goal. */
const MAX_HOME_LOTS = 4;

type WorldTask = Pick<
  Task,
  | 'id'
  | 'projectId'
  | 'title'
  | 'status'
  | 'size'
  | 'goalId'
  | 'goalPartId'
  | 'forDate'
  | 'completedAt'
  | 'completedByIds'
  | 'assigneeIds'
  | 'createdAt'
  | 'updatedAt'
>;

const dayOf = (v: unknown) => (v ? toDay(new Date(v as string)) : null);

const OPEN_TASK = (t: WorldTask) =>
  t.status !== TASK_STATUS.DONE &&
  t.status !== TASK_STATUS.ARCHIVED &&
  t.status !== TASK_STATUS.IGNORED;

/**
 * A task for no goal that belongs to this week: for a day in it, done in
 * it, or still open and made or worked on in it.
 */
const thisWeek = (t: WorldTask, week: { from: string; to: string }) => {
  const inWeek = (d: string | null) => !!d && d >= week.from && d <= week.to;
  if (t.forDate) return inWeek(t.forDate);
  if (t.status === TASK_STATUS.DONE) return inWeek(dayOf(t.completedAt));
  return (
    OPEN_TASK(t) && (inWeek(dayOf(t.createdAt)) || inWeek(dayOf(t.updatedAt)))
  );
};

/**
 * A project's lots: its repeating goals, its targets, then this week's
 * tasks for no goal as houses, four to a lot.
 */
function sitesOf(
  project: Project,
  tasks: WorldTask[],
  tallies: DoneTask[],
  today: string,
  week: { from: string; to: string },
): WorldSite[] {
  const goals = project.goals ?? [];
  const rows = [...(tasks as DoneTask[]), ...tallies];
  const progress = goalProgress(goals, rows, today);
  const sites: WorldSite[] = [];
  for (const goal of goals) {
    const mine = tasks.filter((t) => t.goalId === goal.id);
    const open = mine.filter(OPEN_TASK).length;
    const p = progress.find((x) => x.goalId === goal.id)!;
    const id = `${project.id}:goal:${goal.id}`;
    if (isTarget(goal)) {
      if (goal.achievedAt && goals.some((g) => g.previousId === goal.id))
        continue; // shown under the target that raised it
      const records: number[] = [];
      for (
        let prev = goals.find((g) => g.id === goal.previousId);
        prev;
        prev = goals.find((g) => g.id === prev!.previousId)
      )
        records.unshift(prev.target);
      sites.push({
        id,
        name: goal.title,
        kind: 'target',
        color: candyOf(goal.id),
        done: p.done,
        open,
        target: goal.target,
        percent: p.percent,
        achieved: !!p.achieved,
        records,
      });
      continue;
    }
    const history = goalHistory(goal, rows, 8, today, goal.since);
    const ended = history.filter((h) => h.met !== null);
    let streak = 0;
    for (let i = ended.length - 1; i >= 0 && ended[i].met; i--) streak += 1;
    sites.push({
      id,
      name: goal.title,
      kind: 'goal',
      color: candyOf(goal.id),
      done: rows
        .filter((r) => r.status === TASK_STATUS.DONE && r.goalId === goal.id)
        .reduce((n, r) => n + (r.amount ?? 1), 0),
      open,
      period: {
        label: PERIOD_NOW[goal.period] ?? 'now',
        done: p.done,
        target: p.target,
        percent: p.percent,
      },
      missed: ended.length > 0 && ended[ended.length - 1].met === false,
      streak,
    });
  }

  // This week's tasks for no goal, newest first, done ones too.
  const goalIds = new Set(goals.map((g) => g.id));
  const houses = tasks
    .filter((t) => !(t.goalId && goalIds.has(t.goalId)) && thisWeek(t, week))
    .sort((a, b) =>
      String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')),
    )
    .slice(0, MAX_HOME_LOTS * HOUSES_PER_LOT)
    .map(
      (t): WorldHouse => ({
        id: t.id,
        title: t.title,
        done: t.status === TASK_STATUS.DONE,
        major: t.size === TASK_SIZE.MAJOR,
      }),
    )
    .reverse();
  for (let i = 0; i < houses.length; i += HOUSES_PER_LOT) {
    const lot = houses.slice(i, i + HOUSES_PER_LOT);
    sites.push({
      id: `${project.id}:homes:${i / HOUSES_PER_LOT}`,
      name: 'This week’s tasks',
      kind: 'homes',
      color: candyOf(`${project.id}${i}`),
      done: lot.filter((h) => h.done).length,
      open: lot.filter((h) => !h.done).length,
      houses: lot,
    });
  }
  return sites;
}

const PERIOD_NOW: Record<string, string> = {
  day: 'Today',
  week: 'This week',
  month: 'This month',
};

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
      look: true,
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
  const [logs, entries, results, tasks, tallies]: [
    WorkLogs[],
    PointEntry[],
    ProjectResult[],
    WorldTask[],
    DoneTask[],
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
            id: true,
            projectId: true,
            title: true,
            status: true,
            size: true,
            goalId: true,
            goalPartId: true,
            forDate: true,
            completedAt: true,
            completedByIds: true,
            assigneeIds: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : [],
    projectIds.length ? tallyRowsFor(projectIds) : [],
  ]);

  const projectById = new Map(projects.map((p) => [p.id, p]));
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
      if (
        isPersonalLink(link) ||
        !link.projectId ||
        !projectById.has(link.projectId)
      )
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
          tallies.filter(
            (r) => !!r.goalId && p.goals?.some((g) => g.id === r.goalId),
          ),
          today,
          week,
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

  // Where each task is in the world: its goal's lot, or its house.
  const placeOf = new Map<string, { siteId: string; houseId: string | null }>();
  for (const p of worldProjects)
    for (const site of p.sites) {
      for (const h of site.houses ?? [])
        placeOf.set(h.id, { siteId: site.id, houseId: h.id });
      if (site.kind !== 'homes') {
        const goalId = site.id.split(':goal:')[1];
        for (const t of tasks)
          if (t.projectId === p.id && t.goalId === goalId)
            placeOf.set(t.id, { siteId: site.id, houseId: null });
      }
    }
  // A raised target's tasks go to the target that raised it.
  for (const p of projects)
    for (const g of p.goals ?? []) {
      const next = p.goals?.find((x) => x.previousId === g.id);
      if (!next) continue;
      for (const t of tasks)
        if (t.goalId === g.id && !placeOf.has(t.id))
          placeOf.set(t.id, {
            siteId: `${p.id}:goal:${next.id}`,
            houseId: null,
          });
    }

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
      look: lookOf(u.id, u.look),
      isMe: u.id === viewer.id,
      townIds: homes,
      // Private (p:) lines count only for their writer.
      ownPoints: works
        .filter((w) => w?.link_id !== CLAUDE_SECTION_ID)
        .reduce(
          (n, w) =>
            n +
            sectionLines(w?.content).filter(
              (line) => u.id === viewer.id || !PRIVATE_LINE.test(line),
            ).length,
          0,
        ),
      guidance: log?.guidance ?? 0,
    });

    const links = (log?.links ?? []) as WorklogLink[];
    const groups = new Map<string, BotPoint[]>();
    // Each point's task.
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
      if (task && task.projectId === key) siteOfLine.set(point, task.id);
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
      const task = at ? taskById.get(siteOfLine.get(at)!) : undefined;
      const place = task ? placeOf.get(task.id) : undefined;
      bots.push({
        id: `${u.id}:${projectId || 'town'}`,
        ownerId: u.id,
        ownerName: names.get(u.id)!,
        ownerAvatar: u.avatar ?? null,
        townId: project?.companyId ?? homes[0],
        projectId: project?.id ?? null,
        siteId: place?.siteId ?? null,
        houseId: place?.houseId ?? null,
        tool: !task
          ? 'laptop'
          : task.size === TASK_SIZE.MAJOR
            ? 'crane'
            : 'hammer',
        state,
        current,
        points,
        progress: botProgress(points),
      });
    }
  }

  return { date: today, towns, projects: worldProjects, people, bots };
}
