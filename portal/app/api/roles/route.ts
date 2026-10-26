import { db } from '@/lib/mongodb/db-client';
import {
  DEFAULT_PORTAL_ROLES,
  isAllowed,
  sanitizePermissions,
} from '@/lib/permissions/defaults';
import { requireAuthedPermission } from '@/lib/permissions/server';
import { fail, nowIso, ok, slugify } from '@/lib/workspace/server';
import type { Role } from '@/models/users';

export const dynamic = 'force-dynamic';

/** Creates any built-in portal role that does not exist yet. */
async function ensureDefaultRoles(existing: Role[]) {
  const missing = DEFAULT_PORTAL_ROLES.filter(
    (d) => !existing.some((r) => r.key === d.key),
  );
  if (!missing.length) return false;
  const now = nowIso();
  await db.role.createMany({
    data: missing.map((role) => ({
      ...role,
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    })),
  });
  return true;
}

/** Portal-wide roles, with how many people hold each. */
export async function GET() {
  const { response } = await requireAuthedPermission('permissions:read');
  if (response) return response;

  let roles: Role[] = await db.role.findMany({ orderBy: { createdAt: 'asc' } });
  if (await ensureDefaultRoles(roles)) {
    roles = await db.role.findMany({ orderBy: { createdAt: 'asc' } });
  }

  const holders = await Promise.all(
    roles.map((role) => db.user.count({ where: { roleKeys: role.key } })),
  );
  return ok({
    roles: roles.map((role, i) => ({ ...role, memberCount: holders[i] })),
  });
}

export async function POST(request: Request) {
  const { response, user } = await requireAuthedPermission('permissions:grant');
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return fail(400, 'Role name is required.');

  const permissions = sanitizePermissions(body.permissions);
  if (permissions.some((p) => !isAllowed(user, p))) {
    return fail(403, 'A role cannot have more access than you have.');
  }

  const key = slugify(body.key || name);
  if (await db.role.findFirst({ where: { key } })) {
    return fail(409, 'A role with that name already exists.');
  }

  const now = nowIso();
  const role = await db.role.create({
    data: {
      key,
      name,
      description: body.description ?? null,
      permissions,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    },
  });
  return ok({ role }, { status: 201 });
}
