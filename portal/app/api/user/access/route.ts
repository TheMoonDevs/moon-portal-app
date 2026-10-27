import type { NextRequest } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import {
  getEffectiveCompanyPermissions,
  isOnProjectTeam,
} from '@/lib/permissions/company';
import {
  requireAuthedPermission,
  rolePermissionsFor,
} from '@/lib/permissions/server';
import { fail, memberPermissions, ok } from '@/lib/workspace/server';
import type {
  Company,
  CompanyMember,
  CompanyRole,
  Plan,
  Project,
  Task,
} from '@/models/workspace';
import {
  MEMBER_STATUS,
  OPEN_TASK_STATUSES,
  PROJECT_STATUS,
} from '@/models/workspace';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/access?userId=: what a person can reach. Their companies,
 * with roles and what those allow; the projects they lead or are on, with
 * their open tasks; and their plans. Only companies the viewer is also in
 * are shown, as only members see a company. Requires `permissions:read`.
 */
export async function GET(request: NextRequest) {
  const { response, user: viewer } =
    await requireAuthedPermission('permissions:read');
  if (response || !viewer)
    return response ?? fail(401, 'Authentication required.');

  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return fail(400, 'userId is required.');
  const person = await db.user.findFirst({ where: { id: userId } });
  if (!person) return fail(404, 'User not found.');
  const asUser = {
    ...person,
    rolePermissions: await rolePermissionsFor(person.roleKeys),
  };

  const [theirs, viewers]: [CompanyMember[], CompanyMember[]] =
    await Promise.all([
      db.companyMember.findMany({
        where: { userId, status: MEMBER_STATUS.ACTIVE },
      }),
      db.companyMember.findMany({
        where: { userId: viewer.id, status: MEMBER_STATUS.ACTIVE },
        select: { companyId: true },
      }),
    ]);
  const shared = theirs.filter((m) =>
    viewers.some((v) => v.companyId === m.companyId),
  );
  const ids = shared.map((m) => m.companyId);
  if (!ids.length) return ok({ companies: [], hiddenCompanies: theirs.length });

  const [companies, roles, projects, tasks, plans]: [
    Company[],
    CompanyRole[],
    Project[],
    Task[],
    Plan[],
  ] = await Promise.all([
    db.company.findMany({
      where: { id: { in: ids } },
      orderBy: { name: 'asc' },
    }),
    db.companyRole.findMany({ where: { companyId: { in: ids } } }),
    db.project.findMany({
      where: {
        companyId: { in: ids },
        status: { notIn: [PROJECT_STATUS.ARCHIVED] },
      },
      orderBy: { name: 'asc' },
    }),
    db.task.findMany({
      where: {
        companyId: { in: ids },
        assigneeIds: userId,
        status: { in: OPEN_TASK_STATUSES },
      },
      select: { projectId: true },
    }),
    db.plan.findMany({
      where: { companyId: { in: ids } },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  return ok({
    hiddenCompanies: theirs.length - shared.length,
    companies: companies.map((company) => {
      const member = shared.find((m) => m.companyId === company.id)!;
      const held = roles.filter(
        (r) => r.companyId === company.id && member.roleKeys?.includes(r.key),
      );
      const inCompany = projects.filter((p) => p.companyId === company.id);
      const team = inCompany.filter((p) => isOnProjectTeam(p, userId));
      const teamIds = team.map((p) => p.id);
      return {
        id: company.id,
        name: company.name,
        color: company.color ?? null,
        logo: company.logo ?? null,
        roles: held.map((r) => r.name),
        owner: held.some((r) => r.key === 'owner'),
        permissions: getEffectiveCompanyPermissions(asUser, {
          rolePermissions: memberPermissions(held),
        }),
        projectCount: inCompany.length,
        projects: team.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color ?? null,
          lead: (p.leadIds ?? []).includes(userId),
          openTasks: tasks.filter((t) => t.projectId === p.id).length,
        })),
        openTasks: tasks.filter((t) =>
          inCompany.some((p) => p.id === t.projectId),
        ).length,
        plans: plans
          .filter((p) => p.companyId === company.id)
          .filter(
            (p) =>
              p.ownerId === userId ||
              (p.memberIds ?? []).includes(userId) ||
              (p.steps ?? []).some(
                (s) => !!s.projectId && teamIds.includes(s.projectId),
              ),
          )
          .map((p) => ({
            id: p.id,
            title: p.title,
            owner: p.ownerId === userId,
          })),
      };
    }),
  });
}
