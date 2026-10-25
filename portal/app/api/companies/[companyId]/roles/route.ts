import { db } from '@/lib/mongodb/db-client';
import { sanitizeRolePermissions } from '@/lib/permissions/company';
import {
  fail,
  missingForGrant,
  nowIso,
  ok,
  requireCompanyPermission,
  slugify,
} from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

type Params = { params: { companyId: string } };

export async function GET(_request: Request, { params }: Params) {
  const { response } = await requireCompanyPermission(
    params.companyId,
    'roles:read',
  );
  if (response) return response;
  const roles = await db.companyRole.findMany({
    where: { companyId: params.companyId },
    orderBy: { createdAt: 'asc' },
  });
  return ok({ roles });
}

export async function POST(request: Request, { params }: Params) {
  const { response, user, access } = await requireCompanyPermission(
    params.companyId,
    'roles:create',
  );
  if (response || !user) return response;

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return fail(400, 'Role name is required.');

  const permissions = sanitizeRolePermissions(body.permissions);
  if (missingForGrant(user, access, permissions).length) {
    return fail(403, 'A role cannot have more access than you have.');
  }

  const key = slugify(body.key || name);
  if (
    await db.companyRole.findFirst({
      where: { companyId: params.companyId, key },
    })
  ) {
    return fail(409, 'A role with that name already exists.');
  }

  const now = nowIso();
  const role = await db.companyRole.create({
    data: {
      companyId: params.companyId,
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
