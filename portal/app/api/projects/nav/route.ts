import { db } from '@/lib/mongodb/db-client';
import { hasPermission } from '@/lib/permissions/matching';
import {
  fail,
  getWorkspaceForUser,
  ok,
  requireUser,
} from '@/lib/workspace/server';
import type { Project } from '@/models/workspace';
import { PROJECT_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

/**
 * What the projects sidebar needs and nothing more: the caller's companies
 * and every project they can read, with names, colours, logos and nesting.
 * No stats, so it answers fast and the sidebar can paint before the rest of
 * the page has loaded.
 */
export async function GET() {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const workspace = await getWorkspaceForUser(user);
  const readable = workspace.filter((w) =>
    hasPermission(w.permissions, 'projects:read'),
  );
  const companies = readable.map(({ company, permissions }) => ({
    id: company.id,
    name: company.name,
    color: company.color ?? null,
    logo: company.logo ?? null,
    ...(company.isPersonal && { isPersonal: true }),
    ...(hasPermission(permissions, 'companies:edit') && { canEdit: true }),
  }));
  if (!companies.length) return ok({ companies, projects: [] });

  const projects: Project[] = await db.project.findMany({
    where: {
      companyId: { in: companies.map((c) => c.id) },
      status: { notIn: [PROJECT_STATUS.ARCHIVED] },
    },
    select: {
      id: true,
      companyId: true,
      name: true,
      color: true,
      logo: true,
      parentId: true,
      isCore: true,
      status: true,
    },
    orderBy: { name: 'asc' },
  });

  return ok({ companies, projects });
}
