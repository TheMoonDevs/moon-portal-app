import { db } from '@/lib/mongodb/db-client';
import {
  asStringArray,
  fail,
  missingForGrant,
  nowIso,
  ok,
  requireCompanyPermission,
  rolesForKeys,
} from '@/lib/workspace/server';
import type { CompanyMember } from '@/models/workspace';
import { MEMBER_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { companyId: string; memberId: string } };

const loadMember = (companyId: string, memberId: string) =>
  db.companyMember.findFirst({
    where: { id: memberId, companyId },
  }) as Promise<CompanyMember | null>;

/** Keeps at least one owner in every company. */
async function wouldRemoveLastOwner(member: CompanyMember, nextKeys: string[]) {
  if (!member.roleKeys?.includes('owner') || nextKeys.includes('owner')) {
    return false;
  }
  const owners = await db.companyMember.count({
    where: {
      companyId: member.companyId,
      status: MEMBER_STATUS.ACTIVE,
      roleKeys: 'owner',
    },
  });
  return owners <= 1;
}

export async function PATCH(request: Request, { params }: Params) {
  const { response, user, access } = await requireCompanyPermission(
    params.companyId,
    'members:edit',
  );
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const member = await loadMember(params.companyId, params.memberId);
  if (!member) return fail(404, 'Member not found.');

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = { updatedAt: nowIso() };

  if ('roleKeys' in body) {
    const roleKeys = asStringArray(body.roleKeys);
    if (!roleKeys.length) return fail(400, 'A member needs at least one role.');
    const roles = await rolesForKeys(params.companyId, roleKeys);
    if (roles.length !== roleKeys.length) return fail(400, 'Unknown role.');

    // Both the roles being added and the ones being taken away must be within
    // the editor's own access.
    const removed = await rolesForKeys(
      params.companyId,
      (member.roleKeys ?? []).filter((k) => !roleKeys.includes(k)),
    );
    const missing = missingForGrant(user, access, [
      ...roles.flatMap((r) => r.permissions),
      ...removed.flatMap((r) => r.permissions),
    ]);
    if (missing.length) {
      return fail(403, 'You cannot change roles above your own access.');
    }
    if (await wouldRemoveLastOwner(member, roleKeys)) {
      return fail(400, 'A company needs at least one owner.');
    }
    data.roleKeys = roleKeys;
  }
  if ('title' in body) data.title = body.title || null;

  const updated = await db.companyMember.update({
    where: { id: member.id },
    data,
  });
  return ok({ member: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { response, user, access } = await requireCompanyPermission(
    params.companyId,
    'members:delete',
  );
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const member = await loadMember(params.companyId, params.memberId);
  if (!member) return fail(404, 'Member not found.');

  const roles = await rolesForKeys(params.companyId, member.roleKeys ?? []);
  if (
    missingForGrant(
      user,
      access,
      roles.flatMap((r) => r.permissions),
    ).length
  ) {
    return fail(403, 'You cannot remove someone with more access than you.');
  }
  if (await wouldRemoveLastOwner(member, [])) {
    return fail(400, 'A company needs at least one owner.');
  }

  const updated = await db.companyMember.update({
    where: { id: member.id },
    data: { status: MEMBER_STATUS.REMOVED, updatedAt: nowIso() },
  });
  return ok({ member: updated });
}
