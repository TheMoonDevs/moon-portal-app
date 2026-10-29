/*
 * Data for the user page. Whoever opens it sees only what they could see
 * elsewhere: points and tasks in companies they belong to, never someone
 * else's private (`p:`) lines, and meetings only on their own page.
 */

import { db } from '@/lib/mongodb/db-client';
import { hasPermission } from '@/lib/permissions/matching';
import type { SessionUser } from '@/lib/permissions/server';
import { latestPerDay } from '@/lib/worklogs/days';
import { dayStartMs, originOf } from '@/lib/worklogs/origin';
import {
  isPersonalLink,
  PERSONAL_COMPANY,
  PERSONAL_COMPANY_ID as PERSONAL_ID,
} from '@/lib/worklogs/personal';
import {
  type PointEvent,
  pointSpan,
  type PointStatus,
  sectionLines,
} from '@/lib/worklogs/timeline';
import { withTasks } from '@/lib/workspace/planServer';
import { addDays, toDay } from '@/lib/workspace/projects';
import { runDueSchedules } from '@/lib/workspace/schedules';
import { getWorkspaceForUser } from '@/lib/workspace/server';
import type { MeetBooking } from '@/models/meet';
import { ACTIVE_MEET_STATUSES } from '@/models/meet';
import type { WorklogLink, WorkLogs } from '@/models/worklogs';
import type {
  Company,
  CompanyMember,
  Plan,
  Project,
  Task,
  TaskSchedule,
  WorkPoint as DayPoint,
} from '@/models/workspace';
import {
  MEMBER_STATUS,
  OPEN_TASK_STATUSES,
  PLAN_STATUS,
  PROJECT_STATUS,
  TASK_STATUS,
} from '@/models/workspace';

import type {
  ActivityData,
  AgendaData,
  PageCompany,
  PagePerson,
  PagePlan,
  PageProject,
  PageStep,
  PageTask,
  WorkData,
  WorkPoint,
} from './types';

/** The longest period one request may cover. */
const MAX_DAYS = 120;
/** How far ahead meetings are listed. */
const MEETING_DAYS_AHEAD = 90;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const iso = (value: unknown) =>
  value ? new Date(value as string).toISOString() : null;

/** A valid `from`/`to` pair, at most MAX_DAYS apart; this week by default. */
export function readRange(from: string | null, to: string | null) {
  const end = to && DAY.test(to) ? to : toDay();
  let start = from && DAY.test(from) ? from : addDays(end, -6);
  if (start > end) start = end;
  if (addDays(start, MAX_DAYS) < end) start = addDays(end, -MAX_DAYS);
  return { from: start, to: end };
}

export async function getPerson(userId: string): Promise<PagePerson | null> {
  const user = await db.user.findFirst({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      positionTitle: true,
    },
  });
  return user ?? null;
}

const companyView = (c: Company): PageCompany => ({
  id: c.id,
  name: c.name,
  color: c.color ?? null,
  logo: c.logo ?? null,
});

/**
 * The companies the viewer may see the person's work in: theirs when it is
 * their own page, otherwise the ones both belong to. `tasks` narrows to the
 * ones where the viewer may also read tasks.
 */
async function sharedCompanies(viewer: SessionUser, personId: string) {
  const workspace = await getWorkspaceForUser(viewer);
  let entries = workspace;
  if (viewer.id !== personId) {
    const memberships: CompanyMember[] = await db.companyMember.findMany({
      where: { userId: personId, status: MEMBER_STATUS.ACTIVE },
      select: { companyId: true },
    });
    const theirs = new Set(memberships.map((m) => m.companyId));
    entries = workspace.filter((w) => theirs.has(w.company.id));
  }
  return {
    companies: entries.map((w) => companyView(w.company)),
    taskCompanyIds: entries
      .filter((w) => hasPermission(w.permissions, 'tasks:read'))
      .map((w) => w.company.id),
    /** Every company the viewer is in, for the names of linked projects. */
    viewerCompanyIds: new Set(workspace.map((w) => w.company.id)),
  };
}

const projectView = (p: Project): PageProject => ({
  id: p.id,
  name: p.name,
  companyId: p.companyId,
  color: p.color ?? null,
  logo: p.logo ?? null,
});

const taskView = (t: Task): PageTask => ({
  id: t.id,
  title: t.title,
  status: t.status,
  size: t.size,
  projectId: t.projectId,
  companyId: t.companyId,
  dueDate: t.dueDate ?? null,
  forDate: t.forDate ?? null,
  completedAt: iso(t.completedAt),
  planId: t.planId ?? null,
});

async function loadProjects(ids: string[]): Promise<PageProject[]> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return [];
  const projects: Project[] = await db.project.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true, companyId: true, color: true, logo: true },
  });
  return projects.map(projectView);
}

async function dayLogs(personId: string, from: string, to: string) {
  const logs: WorkLogs[] = await db.workLogs.findMany({
    where: {
      userId: personId,
      logType: 'dayLog',
      date: { gte: from, lte: to },
    },
    select: {
      date: true,
      works: true,
      links: true,
      timeline: true,
      updatedAt: true,
    },
    orderBy: { date: 'asc' },
  });
  return latestPerDay(logs);
}

const POINT_STATUS_OF: Record<string, PointStatus> = {
  [TASK_STATUS.DONE]: 'done',
  [TASK_STATUS.IN_PROGRESS]: 'doing',
  [TASK_STATUS.IN_REVIEW]: 'doing',
};

/** A task's status as a point's: blocked or waiting when flagged. */
const statusOfTask = (task: Task, points: DayPoint[]): PointStatus | null => {
  if (task.status !== TASK_STATUS.DONE && task.flag) return task.flag;
  const status = POINT_STATUS_OF[task.status];
  if (status) return status;
  return points.at(-1)?.status === 'not_done' ? 'not_done' : null;
};

/**
 * The person's work from `from` to `to`: each task they planned, worked on
 * or finished in the period is one point, its work points (theirs and their
 * bots') its events, with the projects, tasks and companies it is in.
 */
export async function loadWork(
  viewer: SessionUser,
  person: PagePerson,
  from: string,
  to: string,
): Promise<WorkData> {
  const isSelf = viewer.id === person.id;
  const [dayPoints, shared] = await Promise.all([
    db.workPoint.findMany({
      where: { userId: person.id, date: { gte: from, lte: to } },
      orderBy: { at: 'asc' },
      take: 5000,
    }) as Promise<DayPoint[]>,
    sharedCompanies(viewer, person.id),
  ]);
  const workedIds = Array.from(new Set(dayPoints.map((p) => p.taskId)));
  const mine = { OR: [{ ownerId: person.id }, { assigneeIds: person.id }] };
  const [worked, planned]: [Task[], Task[]] = await Promise.all([
    workedIds.length
      ? db.task.findMany({ where: { id: { in: workedIds } } })
      : [],
    db.task.findMany({
      where: { AND: [mine, { forDate: { gte: from, lte: to } }] },
      take: 1000,
    }),
  ]);
  const tasks = new Map<string, Task>();
  for (const t of [...worked, ...planned]) tasks.set(t.id, t);

  const visible = (companyId: string | null) =>
    !companyId || isSelf || shared.viewerCompanyIds.has(companyId);
  const owner = await db.user.findFirst({
    where: { id: person.id },
    select: { timezone: true },
  });

  const all: WorkPoint[] = [];
  let hidden = 0;
  for (const task of Array.from(tasks.values())) {
    const ownerOnly =
      !task.projectId && (!task.companyId || task.companyId === PERSONAL_ID);
    if (ownerOnly && !isSelf) continue;
    // Archived without any work in the period: put away, not worked on.
    const points = dayPoints.filter((p) => p.taskId === task.id);
    if (
      (task.status === TASK_STATUS.ARCHIVED ||
        task.status === TASK_STATUS.IGNORED) &&
      !points.length
    )
      continue;
    const companyId = ownerOnly ? PERSONAL_ID : (task.companyId ?? null);
    if (!visible(companyId)) {
      hidden += 1;
      continue;
    }
    const events: PointEvent[] = points
      .filter((p) => !p.isPrivate || isSelf)
      .map((p) => ({
        key: task.id,
        at: p.at,
        status: p.status ?? null,
        ...(p.text && { note: p.text }),
        by: p.by === 'person' ? ('person' as const) : ('claude' as const),
      }));
    const dates = Array.from(
      new Set([
        ...points.map((p) => p.date),
        ...(task.forDate && task.forDate >= from && task.forDate <= to
          ? [task.forDate]
          : []),
      ]),
    ).sort();
    if (!dates.length) continue;
    const span = pointSpan(events);
    all.push({
      key: task.id,
      text: task.title,
      status: statusOfTask(task, points),
      isPrivate: ownerOnly,
      byClaude: !!task.madeBy && task.madeBy !== 'person',
      companyId,
      projectId: task.projectId || null,
      taskId: task.id,
      dates,
      startedAt: iso(task.startedAt) ?? span?.startedAt ?? null,
      finishedAt:
        task.status === TASK_STATUS.DONE
          ? (iso(task.completedAt) ?? span?.finishedAt ?? null)
          : null,
      createdAt: iso(task.createdAt),
      events,
      parentKey: null,
      origin: originOf({
        day: dates[0],
        startMs: dayStartMs(dates[0], owner?.timezone),
        events,
        task,
        days: dates,
      }),
    });
  }

  // Their finished tasks in companies the viewer shares, done in the period.
  const doneTasks: Task[] = shared.taskCompanyIds.length
    ? await db.task.findMany({
        where: {
          companyId: { in: shared.taskCompanyIds },
          assigneeIds: person.id,
          status: TASK_STATUS.DONE,
          // Stored as ISO strings, though older records may hold dates.
          OR: [
            {
              completedAt: {
                gte: `${from}T00:00:00`,
                lte: `${to}T23:59:59.999Z`,
              },
            },
            {
              completedAt: {
                gte: new Date(`${from}T00:00:00Z`),
                lte: new Date(`${to}T23:59:59.999Z`),
              },
            },
          ],
        },
        orderBy: { completedAt: 'desc' },
        take: 300,
      })
    : [];

  const linkedTasks = all
    .map((p) => tasks.get(p.key))
    .filter((t): t is Task => !!t && !!t.projectId);
  const projects = await loadProjects([
    ...all.map((p) => p.projectId as string),
    ...doneTasks.map((t) => t.projectId),
  ]);

  const companies = [...shared.companies];
  if (isSelf && all.some((p) => p.isPrivate))
    companies.push({
      id: PERSONAL_COMPANY.id,
      name: 'Personal',
      isPersonal: true,
    });
  // Companies the viewer is in that the person no longer is, but has work in.
  const missing = [
    ...projects.map((p) => p.companyId),
    ...all.map((p) => p.companyId),
  ].filter(
    (id): id is string =>
      !!id && id !== PERSONAL_COMPANY.id && !companies.some((c) => c.id === id),
  );
  if (missing.length) {
    const extra: Company[] = await db.company.findMany({
      where: { id: { in: Array.from(new Set(missing)) } },
    });
    companies.push(...extra.map(companyView));
  }

  return {
    person,
    isSelf,
    from,
    to,
    points: all,
    doneTasks: doneTasks.map(taskView),
    tasks: linkedTasks.map(taskView),
    projects,
    companies,
    hiddenCount: hidden,
  };
}

/** Points logged per day over the last `days`, for the activity grid. */
export async function loadActivity(
  viewer: SessionUser,
  personId: string,
  days = 182,
): Promise<ActivityData> {
  const to = toDay();
  const from = addDays(to, -(days - 1));
  const logs = await dayLogs(personId, from, to);
  const isSelf = viewer.id === personId;
  const out: Record<string, number> = {};
  for (const log of logs) {
    const links = new Map(
      ((log.links ?? []) as WorklogLink[]).map((l) => [l.key, l]),
    );
    const count = sectionLines(log.works).filter((line) => {
      if (isSelf) return true;
      const link = links.get(line.key);
      return !line.isPrivate && !(link && isPersonalLink(link));
    }).length;
    if (count) out[log.date as string] = count;
  }
  return { from, to, days: out };
}

/**
 * What is ahead for the person: open tasks, plan steps and plans, their
 * repeating tasks and, on their own page, meetings.
 */
export async function loadAgenda(
  viewer: SessionUser,
  person: PagePerson,
): Promise<AgendaData> {
  const isSelf = viewer.id === person.id;
  const shared = await sharedCompanies(viewer, person.id);
  const companyIds = shared.taskCompanyIds;
  const today = toDay();
  if (companyIds.length)
    await runDueSchedules({ companyId: { in: companyIds } });

  const [tasks, plans, schedules, bookings]: [
    Task[],
    Plan[],
    TaskSchedule[],
    MeetBooking[],
  ] = await Promise.all([
    companyIds.length
      ? db.task.findMany({
          where: {
            companyId: { in: companyIds },
            assigneeIds: person.id,
            status: { in: OPEN_TASK_STATUSES },
          },
          orderBy: { createdAt: 'desc' },
          take: 300,
        })
      : [],
    companyIds.length
      ? db.plan.findMany({
          where: {
            companyId: { in: companyIds },
            status: { in: [PLAN_STATUS.IDEA, PLAN_STATUS.ACTIVE] },
          },
          orderBy: { updatedAt: 'desc' },
          take: 200,
        })
      : [],
    companyIds.length
      ? db.taskSchedule.findMany({
          where: {
            companyId: { in: companyIds },
            assigneeIds: person.id,
            active: true,
          },
        })
      : [],
    isSelf
      ? db.meetBooking.findMany({
          where: {
            hostId: person.id,
            status: { in: ACTIVE_MEET_STATUSES },
            end: { gt: new Date(`${today}T00:00:00Z`).toISOString() },
            start: {
              lt: new Date(
                `${addDays(today, MEETING_DAYS_AHEAD)}T00:00:00Z`,
              ).toISOString(),
            },
          },
          orderBy: { start: 'asc' },
          take: 200,
        })
      : [],
  ]);

  const involved = plans.filter(
    (p) =>
      p.ownerId === person.id ||
      (p.memberIds ?? []).includes(person.id) ||
      (p.steps ?? []).some((s) => s.assigneeIds?.includes(person.id)),
  );
  const views = await withTasks(involved);

  const steps: PageStep[] = [];
  const planViews: PagePlan[] = views.map((p) => {
    const mine = p.steps.filter(
      (s) => !s.done && s.assigneeIds?.includes(person.id),
    );
    for (const s of mine) {
      // A step made into a task shows as that task.
      if (s.taskId) continue;
      steps.push({
        planId: p.id,
        stepId: s.id,
        text: s.text,
        dueOn: s.dueOn ?? null,
        projectId: s.projectId ?? null,
        companyId: p.companyId,
      });
    }
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      companyId: p.companyId,
      startOn: p.startOn ?? null,
      endOn: p.endOn ?? null,
      total: p.steps.length,
      done: p.steps.filter((s) => s.done).length,
      mine: mine.length,
      role:
        p.ownerId === person.id
          ? 'owner'
          : (p.memberIds ?? []).includes(person.id)
            ? 'member'
            : 'steps',
    };
  });

  const projects = await loadProjects([
    ...tasks.map((t) => t.projectId),
    ...steps.map((s) => s.projectId as string),
    ...schedules.map((s) => s.projectId),
  ]);
  // Tasks of archived projects no longer count anywhere.
  const archived = new Set<string>(
    projects.length
      ? (
          await db.project.findMany({
            where: {
              id: { in: projects.map((p) => p.id) },
              status: PROJECT_STATUS.ARCHIVED,
            },
            select: { id: true },
          })
        ).map((p: { id: string }) => p.id)
      : [],
  );

  return {
    isSelf,
    tasks: tasks.filter((t) => !archived.has(t.projectId)).map(taskView),
    steps,
    plans: planViews,
    schedules: schedules
      .filter((s) => !archived.has(s.projectId))
      .map((s) => ({
        id: s.id,
        title: s.title,
        projectId: s.projectId,
        companyId: s.companyId,
        every: s.every,
        weekdays: s.weekdays ?? [],
        monthDay: s.monthDay ?? null,
        count: s.count || 1,
        nextRunOn: s.nextRunOn,
      })),
    meetings: isSelf
      ? bookings.map((b) => ({
          id: b.id,
          guestName: b.guestName,
          guestNote: b.guestNote ?? null,
          start: b.start,
          end: b.end,
          status: b.status,
          meetingUrl: b.meetingUrl ?? null,
        }))
      : null,
    projects: projects.filter((p) => !archived.has(p.id)),
    companies: shared.companies,
  };
}
