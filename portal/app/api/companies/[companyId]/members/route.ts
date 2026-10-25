import { db } from '@/lib/mongodb/db-client';
import { DEFAULT_MEMBER_ROLE_KEY } from '@/lib/permissions/company';
import {
  asStringArray,
  fail,
  getPublicUsers,
  missingForGrant,
  nowIso,
  ok,
  requireCompanyPermission,
  rolesForKeys,
} from '@/lib/workspace/server';
import type { CompanyMember } from '@/models/workspace';
import { MEMBER_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { companyId: string } };

export async function GET(_request: Request, { params }: Params) {
  const { response } = await requireCompanyPermission(
    params.companyId,
    'members:read',
  );
  if (response) return response;

  const members: CompanyMember[] = await db.companyMember.findMany({
    where: { companyId: params.companyId, status: MEMBER_STATUS.ACTIVE },
  });
  const users = await getPublicUsers(members.map((m) => m.userId));
  return ok({
    members: members.map((m) => ({
      ...m,
      user: users.find((u: { id: string }) => u.id === m.userId) ?? null,
    })),
  });
}

/** Add a user to the company (or re-activate them) with the given roles. */
export async function POST(request: Request, { params }: Params) {
  const { response, user, access } = await requireCompanyPermission(
    params.companyId,
    'members:create',
  );
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === 'string' ? body.userId : '';
  if (!userId) return fail(400, 'userId is required.');
  const target = await db.user.findFirst({ where: { id: userId } });
  if (!target) return fail(404, 'User not found.');

  const roleKeys = asStringArray(body.roleKeys);
  if (!roleKeys.length) roleKeys.push(DEFAULT_MEMBER_ROLE_KEY);
  const roles = await rolesForKeys(params.companyId, roleKeys);
  if (roles.length !== roleKeys.length) return fail(400, 'Unknown role.');

  const missing = missingForGrant(
    user,
    access,
    roles.flatMap((r) => r.permissions),
  );
  if (missing.length) {
    return fail(403, 'You cannot give a role with more access than you have.');
  }

  const now = nowIso();
  const existing = await db.companyMember.findFirst({
    where: { companyId: params.companyId, userId },
  });
  const member = existing
    ? await db.companyMember.update({
        where: { id: existing.id },
        data: {
          roleKeys,
          title: body.title ?? existing.title ?? null,
          status: MEMBER_STATUS.ACTIVE,
          updatedAt: now,
        },
      })
    : await db.companyMember.create({
        data: {
          companyId: params.companyId,
          userId,
          roleKeys,
          title: body.title ?? null,
          status: MEMBER_STATUS.ACTIVE,
          joinedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      });
  return ok({ member }, { status: existing ? 200 : 201 });
}
