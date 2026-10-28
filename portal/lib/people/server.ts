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
import { isPersonalLink, PERSONAL_COMPANY } from '@/lib/worklogs/personal';
import {
  eventsFor,
  type PointEvent,
  pointSpan,
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

/** Most events sent for one point: its start and the latest ones. */
const MAX_EVENTS = 24;

function mergeEvents(a: PointEvent[], b: PointEvent[]): PointEvent[] {
  const seen = new Set<string>();
  const all = [...a, ...b]
    .filter((e) => {
      const id = `${e.at}|${e.status}|${e.note ?? ''}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((x, y) => x.at.localeCompare(y.at));
  return all.length > MAX_EVENTS
    ? [all[0], ...all.slice(-(MAX_EVENTS - 1))]
    : all;
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

/**
 * The person's work points from `from` to `to`, grouped by line across
 * days, with the projects, tasks and companies they are linked to.
 */
export async function loadWork(
  viewer: SessionUser,
  person: PagePerson,
  from: string,
  to: string,
): Promise<WorkData> {
  const isSelf = viewer.id === person.id;
  const [logs, shared] = await Promise.all([
    dayLogs(person.id, from, to),
    sharedCompanies(viewer, person.id),
  ]);
  const visible = (companyId: string | null) =>
    !companyId || isSelf || shared.viewerCompanyIds.has(companyId);

  const points = new Map<string, WorkPoint>();
  let hidden = new Set<string>();
  for (const log of logs) {
    const links = new Map(
      ((log.links ?? []) as WorklogLink[]).map((l) => [l.key, l]),
    );
    const lines = sectionLines(log.works);
    // The person's point each of the assistant's lines is a sub-log of: the
    // one picked for it, the typed line linked to it, or the one on its task.
    const parentOf = (key: string, taskId?: string | null) => {
      const own = links.get(key)?.parentKey;
      if (own && lines.some((l) => l.key === own && !l.claude)) return own;
      const typed = lines.find(
        (l) =>
          !l.claude &&
          (links.get(l.key)?.sameAs === key ||
            (!!taskId && links.get(l.key)?.taskId === taskId)),
      );
      return typed?.key ?? null;
    };
    for (const line of lines) {
      const link = links.get(line.key);
      const personal = line.isPrivate || (link ? isPersonalLink(link) : false);
      if (personal && !isSelf) continue;
      const companyId = personal
        ? PERSONAL_COMPANY.id
        : (link?.companyId ?? null);
      if (!visible(companyId)) {
        hidden.add(line.key);
        continue;
      }
      const seen = points.get(line.key);
      // A point carried into a later day brings its earlier events along.
      const events = mergeEvents(
        seen?.events ?? [],
        eventsFor(log.timeline, line.key),
      );
      const span = pointSpan(events);
      points.set(line.key, {
        key: line.key,
        text: line.text,
        status: line.status,
        isPrivate: personal,
        byClaude: line.claude,
        companyId,
        projectId: personal ? null : (link?.projectId ?? null),
        taskId: personal ? null : (link?.taskId ?? null),
        dates: [...(seen?.dates ?? []), log.date as string],
        startedAt: span?.startedAt ?? null,
        finishedAt: span?.finishedAt ?? null,
        events,
        parentKey: line.claude
          ? parentOf(line.key, personal ? null : link?.taskId)
          : null,
        origin: null,
      });
    }
  }
  // A line seen in a shared company on one day is not "hidden" on another.
  hidden = new Set(Array.from(hidden).filter((k) => !points.has(k)));

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

  const all = Array.from(points.values());
  const taskIds = Array.from(
    new Set(all.map((p) => p.taskId).filter(Boolean)),
  ) as string[];
  const linkedTasks: Task[] = taskIds.length
    ? await db.task.findMany({ where: { id: { in: taskIds } } })
    : [];

  // Planned, unexpected or delayed, by the person's own days.
  const owner = await db.user.findFirst({
    where: { id: person.id },
    select: { timezone: true },
  });
  const taskById = new Map(linkedTasks.map((t) => [t.id, t]));
  for (const point of all) {
    const day = point.dates[0];
    point.origin = originOf({
      day,
      startMs: dayStartMs(day, owner?.timezone),
      events: point.events,
      task: point.taskId ? taskById.get(point.taskId) : null,
      days: point.dates,
    });
  }
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
    hiddenCount: hidden.size,
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
