import type { NextRequest } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { hasPermission } from '@/lib/permissions/matching';
import {
  asStringArray,
  fail,
  getWorkspaceForUser,
  nowIso,
  ok,
  requireCompanyPermission,
  requireUser,
  slugify,
  summarizeTasks,
} from '@/lib/workspace/server';
import type { Project } from '@/models/workspace';
import { PROJECT_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

/**
 * Projects in one company (`?companyId=`), or across every company where the
 * caller can read projects. Each project carries its task progress.
 */
export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId');
  const includeArchived =
    request.nextUrl.searchParams.get('includeArchived') === 'true';

  let companyIds: string[];
  if (companyId) {
    const { response } = await requireCompanyPermission(
      companyId,
      'projects:read',
    );
    if (response) return response;
    companyIds = [companyId];
  } else {
    const { response, user } = await requireUser();
    if (response || !user)
      return response ?? fail(401, 'Authentication required.');
    const workspace = await getWorkspaceForUser(user);
    companyIds = workspace
      .filter((w) => hasPermission(w.permissions, 'projects:read'))
      .map((w) => w.company.id);
  }
  if (!companyIds.length) return ok({ projects: [] });

  const projects: Project[] = await db.project.findMany({
    where: {
      companyId: { in: companyIds },
      ...(!includeArchived && { status: { notIn: [PROJECT_STATUS.ARCHIVED] } }),
    },
    orderBy: { createdAt: 'desc' },
  });
  const tasks = projects.length
    ? await db.task.findMany({
        where: { projectId: { in: projects.map((p) => p.id) } },
        select: { projectId: true, status: true, size: true },
      })
    : [];
  const progress = summarizeTasks(tasks);

  return ok({
    projects: projects.map((p) => ({
      ...p,
      progress: progress[p.id] ?? {
        total: 0,
        done: 0,
        major: 0,
        majorDone: 0,
        percent: 0,
      },
    })),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const companyId = typeof body.companyId === 'string' ? body.companyId : '';
  const { response, user } = await requireCompanyPermission(
    companyId,
    'projects:create',
  );
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return fail(400, 'Project name is required.');

  const status = Object.values(PROJECT_STATUS).includes(body.status)
    ? body.status
    : PROJECT_STATUS.ACTIVE;

  const now = nowIso();
  const project = await db.project.create({
    data: {
      companyId,
      name,
      slug: slugify(name),
      description: body.description ?? null,
      status,
      color: body.color ?? null,
      icon: body.icon ?? null,
      leadIds: asStringArray(body.leadIds),
      memberIds: asStringArray(body.memberIds),
      startDate: body.startDate ?? null,
      dueDate: body.dueDate ?? null,
      createdById: user.id,
      createdAt: now,
      updatedAt: now,
    },
  });
  return ok({ project }, { status: 201 });
}
