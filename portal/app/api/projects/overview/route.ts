import { projectWork } from '@/lib/daywork/server';
import { db } from '@/lib/mongodb/db-client';
import { hasPermission } from '@/lib/permissions/matching';
import { addDays, toDay } from '@/lib/workspace/projects';
import { withProjectStats } from '@/lib/workspace/projectStats';
import { runDueSchedules } from '@/lib/workspace/schedules';
import {
  fail,
  getPublicUsers,
  getWorkspaceForUser,
  ok,
  requireUser,
} from '@/lib/workspace/server';
import type { CompanyMember, Project, Task } from '@/models/workspace';
import { MEMBER_STATUS, PROJECT_STATUS, TASK_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

/** Days of work activity each project shows. */
const DAYS = 7;

const CLOSED = [TASK_STATUS.DONE, TASK_STATUS.ARCHIVED, TASK_STATUS.IGNORED];

/**
 * Every project the caller can read, across their companies, with what is
 * going on in each: how much was logged on each of the last 7 days and by
 * whom, today's scheduled tasks, open and overdue tasks, and goal progress.
 * Each project also carries this month: work logged per day, tasks finished
 * and who did it, which the page adds up into each company's month. Each
 * company carries its active members.
 * It sends counts only, never the words of a line, and private lines never
 * count.
 */
export async function GET() {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const workspace = await getWorkspaceForUser(user);
  const readable = workspace.filter((w) =>
    hasPermission(w.permissions, 'projects:read'),
  );
  const companies = readable.map(({ company }) => ({
    id: company.id,
    name: company.name,
    color: company.color ?? null,
    logo: company.logo ?? null,
    description: company.description ?? null,
  }));
  if (!companies.length) return ok({ companies, projects: [], users: [] });

  const members: CompanyMember[] = await db.companyMember.findMany({
    where: {
      companyId: { in: companies.map((c) => c.id) },
      status: MEMBER_STATUS.ACTIVE,
    },
    select: { companyId: true, userId: true },
  });
  const withMembers = companies.map((c) => ({
    ...c,
    memberIds: Array.from(
      new Set(members.filter((m) => m.companyId === c.id).map((m) => m.userId)),
    ),
  }));

  const projects: Project[] = await db.project.findMany({
    where: {
      companyId: { in: companies.map((c) => c.id) },
      status: { notIn: [PROJECT_STATUS.ARCHIVED] },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!projects.length)
    return ok({
      companies: withMembers,
      projects: [],
      users: await getPublicUsers(withMembers.flatMap((c) => c.memberIds)),
    });

  const ids = projects.map((p) => p.id);
  await runDueSchedules({ projectId: { in: ids } });

  const today = toDay();
  const from = addDays(today, -(DAYS - 1));
  const monthFrom = `${today.slice(0, 8)}01`;
  const [withStats, work, openTasks, doneTasks] = await Promise.all([
    withProjectStats(projects),
    projectWork(ids, monthFrom < from ? monthFrom : from),
    db.task.findMany({
      where: { projectId: { in: ids }, status: { notIn: CLOSED } },
      select: { projectId: true, dueDate: true, forDate: true },
    }) as Promise<Task[]>,
    db.task.findMany({
      where: { projectId: { in: ids }, status: TASK_STATUS.DONE },
      select: {
        projectId: true,
        size: true,
        completedAt: true,
        completedByIds: true,
        assigneeIds: true,
      },
    }) as Promise<Task[]>,
  ]);
  const doneThisMonth = doneTasks.filter((t) => {
    if (!t.completedAt) return false;
    const day = toDay(new Date(t.completedAt as string));
    return day >= monthFrom && day <= today;
  });
  const monthDays = Number(today.slice(8, 10));
  // Tasks a schedule made for today, done or not.
  const todaysRuns = (
    (await db.task.findMany({
      where: { projectId: { in: ids }, forDate: today },
      select: { projectId: true, status: true, scheduleId: true },
    })) as Task[]
  ).filter((t) => t.scheduleId);

  const days = Array.from({ length: DAYS }, (_, i) => addDays(from, i));
  const userIds = new Set<string>();

  const overview = withStats.map((project) => {
    const perDay = days.map(() => 0);
    const people: string[] = [];
    let lastDate: string | null = null;
    // This month, per day from the 1st to today, and per person.
    const monthPerDay = Array.from({ length: monthDays }, () => 0);
    const monthPeople = new Map<string, { logged: number; done: number }>();
    const person = (id: string) => {
      const row = monthPeople.get(id) ?? { logged: 0, done: 0 };
      monthPeople.set(id, row);
      userIds.add(id);
      return row;
    };
    // Work comes newest first, so people are in that order too.
    for (const line of work) {
      if (line.projectId !== project.id) continue;
      if (line.date >= monthFrom) {
        monthPerDay[Number(line.date.slice(8, 10)) - 1] += 1;
        person(line.userId).logged += 1;
      }
      lastDate ??= line.date;
      if (line.date < from) continue;
      const dayIndex = days.indexOf(line.date);
      if (dayIndex >= 0) perDay[dayIndex] += 1;
      if (!people.includes(line.userId)) people.push(line.userId);
    }
    const finished = doneThisMonth.filter((t) => t.projectId === project.id);
    for (const task of finished) {
      // Older tasks name no finisher; their assignees count instead.
      const by = task.completedByIds?.length
        ? task.completedByIds
        : (task.assigneeIds ?? []);
      by.forEach((id) => (person(id).done += 1));
    }

    const open = openTasks.filter((t) => t.projectId === project.id);
    const runs = todaysRuns.filter((t) => t.projectId === project.id);
    people.forEach((id) => userIds.add(id));
    [...(project.leadIds ?? []), ...(project.memberIds ?? [])].forEach((id) =>
      userIds.add(id),
    );

    return {
      ...project,
      activity: { from, days: perDay, people, lastDate },
      month: {
        from: monthFrom,
        days: monthPerDay,
        done: finished.length,
        major: finished.filter((t) => t.size === 'MAJOR').length,
        people: Array.from(monthPeople, ([userId, row]) => ({
          userId,
          ...row,
        })),
      },
      tasks: {
        open: open.length,
        overdue: open.filter((t) => t.dueDate && t.dueDate.slice(0, 10) < today)
          .length,
      },
      today: {
        total: runs.length,
        done: runs.filter((t) => t.status === TASK_STATUS.DONE).length,
      },
    };
  });

  withMembers.forEach((c) => c.memberIds.forEach((id) => userIds.add(id)));
  const users = await getPublicUsers(Array.from(userIds));
  return ok({ companies: withMembers, projects: overview, users });
}
