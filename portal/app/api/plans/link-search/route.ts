import type { NextRequest } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { projectFamily } from '@/lib/workspace/plans';
import { fail, ok, requireCompanyPermission } from '@/lib/workspace/server';
import type { Project, Task } from '@/models/workspace';
import { PROJECT_STATUS, TASK_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Tasks a plan step can link to, found by title (`?q=`) in a company
 * (`?companyId=`). `?projectId=` keeps to that project and the ones under
 * it, for a project plan. Open tasks first, then the latest.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const companyId = params.get('companyId');
  const { response } = await requireCompanyPermission(companyId, 'tasks:read');
  if (response) return response;

  const q = (params.get('q') ?? '').trim().slice(0, 80);
  const root = params.get('projectId');
  let projectIds: string[] | null = null;
  if (root) {
    const projects: Project[] = await db.project.findMany({
      where: {
        companyId: companyId!,
        status: { notIn: [PROJECT_STATUS.ARCHIVED] },
      },
      select: { parentId: true },
    });
    if (!projects.some((p) => p.id === root))
      return fail(404, 'Project not found.');
    projectIds = Array.from(projectFamily(projects, root));
  }

  const tasks: Task[] = await db.task.findMany({
    where: {
      companyId: companyId!,
      status: { notIn: [TASK_STATUS.ARCHIVED] },
      ...(projectIds && { projectId: { in: projectIds } }),
      ...(q && { title: { contains: escape(q), mode: 'insensitive' } }),
    },
    select: {
      title: true,
      status: true,
      projectId: true,
      assigneeIds: true,
      forDate: true,
      dueDate: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 40,
  });
  const open = (t: Task) => (t.status === TASK_STATUS.DONE ? 1 : 0);
  return ok({
    tasks: tasks
      .sort((a, b) => open(a) - open(b))
      .slice(0, 20)
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        projectId: t.projectId,
        assigneeIds: t.assigneeIds ?? [],
        day: t.forDate ?? t.dueDate ?? null,
      })),
  });
}
