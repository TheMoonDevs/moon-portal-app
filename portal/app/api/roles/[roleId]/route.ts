import { db } from '@/lib/mongodb/db-client';
import { isAllowed, sanitizePermissions } from '@/lib/permissions/defaults';
import { requireAuthedPermission } from '@/lib/permissions/server';
import { fail, nowIso, ok } from '@/lib/workspace/server';
import type { Role } from '@/models/users';

export const dynamic = 'force-dynamic';

type Params = { params: { roleId: string } };

const loadRole = (id: string) =>
  db.role.findFirst({ where: { id } }) as Promise<Role | null>;

export async function PATCH(request: Request, { params }: Params) {
  const { response, user } = await requireAuthedPermission('permissions:grant');
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const role = await loadRole(params.roleId);
  if (!role) return fail(404, 'Role not found.');

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = { updatedAt: nowIso() };

  if (typeof body.name === 'string') {
    if (!body.name.trim()) return fail(400, 'Role name is required.');
    data.name = body.name.trim();
  }
  if ('description' in body) data.description = body.description || null;

  if ('permissions' in body) {
    const permissions = sanitizePermissions(body.permissions);
    const before = role.permissions ?? [];
    const changed = [
      ...permissions.filter((p) => !before.includes(p)),
      ...before.filter((p) => !permissions.includes(p)),
    ];
    if (changed.some((p) => !isAllowed(user, p))) {
      return fail(403, 'You cannot change permissions you do not have.');
    }
    data.permissions = permissions;
  }

  const updated = await db.role.update({ where: { id: role.id }, data });
  return ok({ role: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { response, user } =
    await requireAuthedPermission('permissions:revoke');
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const role = await loadRole(params.roleId);
  if (!role) return fail(404, 'Role not found.');
  if (role.isSystem) return fail(400, 'Built-in roles cannot be deleted.');
  if ((role.permissions ?? []).some((p) => !isAllowed(user, p))) {
    return fail(403, 'You cannot delete a role with more access than you.');
  }

  const inUse = await db.user.count({ where: { roleKeys: role.key } });
  if (inUse) return fail(400, 'Take this role off everyone who has it first.');

  await db.role.delete({ where: { id: role.id } });
  return ok({ role });
}
