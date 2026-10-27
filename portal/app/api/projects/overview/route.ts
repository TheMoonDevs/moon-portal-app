import { db } from '@/lib/mongodb/db-client';
import { hasPermission } from '@/lib/permissions/matching';
import { lineKey } from '@/lib/worklogs/lines';
import { isPersonalLink } from '@/lib/worklogs/personal';
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
import type { WorklogLink, WorkLogs } from '@/models/worklogs';
import type { Project, Task } from '@/models/workspace';
import { PROJECT_STATUS, TASK_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

/** Days of worklog activity each project shows. */
const DAYS = 7;

const CLOSED = [TASK_STATUS.DONE, TASK_STATUS.ARCHIVED, TASK_STATUS.IGNORED];

/** Keys of the lines ticked off (✅) in a worklog's sections. */
const doneKeys = (works: unknown) => {
  const keys = new Set<string>();
  if (!Array.isArray(works)) return keys;
  for (const work of works) {
    const content = typeof work?.content === 'string' ? work.content : '';
    for (const raw of content.split('\n'))
      if (raw.includes('✅')) keys.add(lineKey(raw));
  }
  return keys;
};

/**
 * Every project the caller can read, across their companies, with what is
 * going on in each: the last week of worklog lines, who wrote them, today's
 * scheduled tasks, open and overdue tasks, and goal progress. Private lines
 * never count.
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
  }));
  if (!companies.length) return ok({ companies, projects: [], users: [] });

  const projects: Project[] = await db.project.findMany({
    where: {
      companyId: { in: companies.map((c) => c.id) },
      status: { notIn: [PROJECT_STATUS.ARCHIVED] },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!projects.length) return ok({ companies, projects: [], users: [] });

  const ids = projects.map((p) => p.id);
  await runDueSchedules({ projectId: { in: ids } });

  const today = toDay();
  const from = addDays(today, -(DAYS - 1));
  const [withStats, logs, openTasks] = await Promise.all([
    withProjectStats(projects),
    db.workLogs.findMany({
      where: {
        'links.projectId': { in: ids },
        logType: 'dayLog',
        date: { gte: from },
      },
      select: { userId: true, date: true, works: true, links: true },
      orderBy: { date: 'desc' },
    }) as Promise<WorkLogs[]>,
    db.task.findMany({
      where: { projectId: { in: ids }, status: { notIn: CLOSED } },
      select: { projectId: true, dueDate: true, forDate: true },
    }) as Promise<Task[]>,
  ]);
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
    const latest: {
      text: string;
      userId: string;
      date: string;
      done: boolean;
    }[] = [];
    let lines = 0;
    let done = 0;
    let lastDate: string | null = null;
    // Logs come newest first, so people and latest lines are in that order.
    for (const log of logs) {
      const ticked = doneKeys(log.works);
      const mine = ((log.links ?? []) as WorklogLink[]).filter(
        (l) => l.projectId === project.id && !isPersonalLink(l),
      );
      if (!mine.length) continue;
      const userId = log.userId as string;
      lastDate ??= log.date as string;
      const dayIndex = days.indexOf(log.date as string);
      if (dayIndex >= 0) perDay[dayIndex] += mine.length;
      lines += mine.length;
      if (!people.includes(userId)) people.push(userId);
      for (const link of mine) {
        const isDone = ticked.has(link.key);
        if (isDone) done += 1;
        if (latest.length < 2)
          latest.push({
            text: link.text ?? '',
            userId,
            date: log.date as string,
            done: isDone,
          });
      }
    }

    const open = openTasks.filter((t) => t.projectId === project.id);
    const runs = todaysRuns.filter((t) => t.projectId === project.id);
    people.forEach((id) => userIds.add(id));
    [...(project.leadIds ?? []), ...(project.memberIds ?? [])].forEach((id) =>
      userIds.add(id),
    );

    return {
      ...project,
      activity: {
        from,
        days: perDay,
        lines,
        done,
        people,
        lastDate,
        latest,
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

  const users = await getPublicUsers(Array.from(userIds));
  return ok({ companies, projects: overview, users });
}
