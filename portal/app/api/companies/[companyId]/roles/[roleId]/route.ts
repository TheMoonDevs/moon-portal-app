import { db } from '@/lib/mongodb/db-client';
import { sanitizeRolePermissions } from '@/lib/permissions/company';
import {
  fail,
  missingForGrant,
  nowIso,
  ok,
  requireCompanyPermission,
} from '@/lib/workspace/server';
import type { CompanyRole } from '@/models/workspace';
import { MEMBER_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { companyId: string; roleId: string } };

const loadRole = (companyId: string, roleId: string) =>
  db.companyRole.findFirst({
    where: { id: roleId, companyId },
  }) as Promise<CompanyRole | null>;

export async function PATCH(request: Request, { params }: Params) {
  const { response, user, access } = await requireCompanyPermission(
    params.companyId,
    'roles:edit',
  );
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const role = await loadRole(params.companyId, params.roleId);
  if (!role) return fail(404, 'Role not found.');

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = { updatedAt: nowIso() };

  if (typeof body.name === 'string') {
    if (!body.name.trim()) return fail(400, 'Role name is required.');
    data.name = body.name.trim();
  }
  if ('description' in body) data.description = body.description || null;

  if ('permissions' in body) {
    if (role.key === 'owner') {
      return fail(400, 'The Owner role always has full access.');
    }
    const permissions = sanitizeRolePermissions(body.permissions);
    const changed = [
      ...permissions.filter((p) => !role.permissions.includes(p)),
      ...role.permissions.filter((p) => !permissions.includes(p)),
    ];
    if (missingForGrant(user, access, changed).length) {
      return fail(403, 'You cannot change permissions you do not have.');
    }
    data.permissions = permissions;
  }

  const updated = await db.companyRole.update({ where: { id: role.id }, data });
  return ok({ role: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { response, user, access } = await requireCompanyPermission(
    params.companyId,
    'roles:delete',
  );
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const role = await loadRole(params.companyId, params.roleId);
  if (!role) return fail(404, 'Role not found.');
  if (role.isSystem) return fail(400, 'Built-in roles cannot be deleted.');
  if (missingForGrant(user, access, role.permissions).length) {
    return fail(403, 'You cannot delete a role with more access than you.');
  }

  const inUse = await db.companyMember.count({
    where: {
      companyId: params.companyId,
      status: MEMBER_STATUS.ACTIVE,
      roleKeys: role.key,
    },
  });
  if (inUse) {
    return fail(400, 'Move the members on this role to another role first.');
  }

  await db.companyRole.delete({ where: { id: role.id } });
  return ok({ role });
}
