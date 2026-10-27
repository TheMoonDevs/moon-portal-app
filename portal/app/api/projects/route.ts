import type { NextRequest } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { hasPermission } from '@/lib/permissions/matching';
import { syncGoalSchedules } from '@/lib/workspace/goalSchedules';
import { sanitizeGoals } from '@/lib/workspace/projects';
import { withProjectStats } from '@/lib/workspace/projectStats';
import { runDueSchedules } from '@/lib/workspace/schedules';
import {
  asEffort,
  asStringArray,
  checkParent,
  fail,
  getWorkspaceForUser,
  nowIso,
  ok,
  requireCompanyPermission,
  requireUser,
  slugify,
} from '@/lib/workspace/server';
import type { Project } from '@/models/workspace';
import { PROJECT_EFFORT, PROJECT_STATUS } from '@/models/workspace';

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
  await runDueSchedules({ projectId: { in: projects.map((p) => p.id) } });
  return ok({ projects: await withProjectStats(projects) });
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
  const effort = asEffort(body.effort);
  if (effort === undefined) return fail(400, 'Effort is LOW, MEDIUM or HIGH.');
  const parent = await checkParent(companyId, null, body.parentId);
  if (parent.error) return fail(400, parent.error);

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
      logo: typeof body.logo === 'string' && body.logo ? body.logo : null,
      leadIds: asStringArray(body.leadIds),
      memberIds: asStringArray(body.memberIds),
      goals: sanitizeGoals(body.goals),
      effort: effort ?? PROJECT_EFFORT.MEDIUM,
      parentId: parent.parentId,
      createdById: user.id,
      createdAt: now,
      updatedAt: now,
    },
  });
  await syncGoalSchedules(project, [], user.id);
  return ok({ project }, { status: 201 });
}
