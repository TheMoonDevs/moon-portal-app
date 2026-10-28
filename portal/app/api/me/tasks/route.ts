import { db } from '@/lib/mongodb/db-client';
import { hasPermission } from '@/lib/permissions/matching';
import { runDueSchedules } from '@/lib/workspace/schedules';
import {
  fail,
  getWorkspaceForUser,
  ok,
  requireUser,
} from '@/lib/workspace/server';
import type { Project, Task } from '@/models/workspace';
import { OPEN_TASK_STATUSES, PROJECT_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

/**
 * Open tasks assigned to the caller, across their companies, with the tasks
 * they follow on from.
 */
export async function GET() {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const workspace = await getWorkspaceForUser(user);
  const companyIds = workspace
    .filter((w) => hasPermission(w.permissions, 'tasks:read'))
    .map((w) => w.company.id);
  if (!companyIds.length) return ok({ tasks: [], projects: [] });

  await runDueSchedules({ companyId: { in: companyIds } });
  const tasks: Task[] = await db.task.findMany({
    where: {
      companyId: { in: companyIds },
      assigneeIds: user.id,
      status: { in: OPEN_TASK_STATUSES },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const projectIds = Array.from(new Set(tasks.map((t) => t.projectId)));
  const projects: Project[] = projectIds.length
    ? await db.project.findMany({
        where: {
          id: { in: projectIds },
          status: { notIn: [PROJECT_STATUS.ARCHIVED] },
        },
        select: {
          id: true,
          name: true,
          color: true,
          logo: true,
          companyId: true,
        },
      })
    : [];
  const live = new Set(projects.map((p) => p.id));
  // The tasks these follow on from, for their "after" line.
  const followIds = Array.from(
    new Set(tasks.map((t) => t.followsId).filter((id): id is string => !!id)),
  );
  const previous: Pick<Task, 'id' | 'title' | 'status'>[] = followIds.length
    ? await db.task.findMany({
        where: { id: { in: followIds } },
        select: { id: true, title: true, status: true },
      })
    : [];
  return ok({
    tasks: tasks.filter((t) => live.has(t.projectId)),
    projects,
    previous,
  });
}
