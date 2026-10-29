import type { NextRequest } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { hasPermission } from '@/lib/permissions/matching';
import { sanitizeAliases } from '@/lib/worklogs/aliases';
import {
  canCreateDirectly,
  createProject,
  requestProject,
} from '@/lib/workspace/projectRequests';
import { withProjectStats } from '@/lib/workspace/projectStats';
import { runDueSchedules } from '@/lib/workspace/schedules';
import {
  asEffort,
  asStringArray,
  checkParent,
  fail,
  getWorkspaceForUser,
  ok,
  requireCompanyPermission,
  requireUser,
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
  await runDueSchedules({ projectId: { in: projects.map((p) => p.id) } });
  return ok({ projects: await withProjectStats(projects) });
}

/**
 * Creates a project, or sends a request for it when the caller may not
 * create it themselves (see projectRequests): 201 with `project`, or 202
 * with `request`.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const companyId = typeof body.companyId === 'string' ? body.companyId : '';
  const { response, user, access } = await requireCompanyPermission(
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

  const input = {
    companyId,
    name: name.slice(0, 120),
    description: typeof body.description === 'string' ? body.description : null,
    aliases: sanitizeAliases(body.aliases),
    status,
    color: typeof body.color === 'string' ? body.color : null,
    icon: typeof body.icon === 'string' ? body.icon : null,
    logo: typeof body.logo === 'string' ? body.logo : null,
    // Whoever makes it leads it, unless they named the leads.
    leadIds: asStringArray(body.leadIds).length ? body.leadIds : [user.id],
    memberIds: body.memberIds,
    goals: body.goals,
    effort,
    parentId: parent.parentId,
  };

  if (!(await canCreateDirectly(user, access, companyId, parent.parentId))) {
    const sent = await requestProject(
      {
        ...input,
        note:
          typeof body.note === 'string'
            ? body.note.trim().slice(0, 1000)
            : null,
      },
      user,
    );
    return ok({ request: sent }, { status: 202 });
  }
  const project = await createProject(input, user.id);
  return ok({ project }, { status: 201 });
}
