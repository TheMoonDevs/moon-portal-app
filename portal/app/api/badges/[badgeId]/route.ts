import { db } from '@/lib/mongodb/db-client';
import { requireAuthedPermission } from '@/lib/permissions/server';
import { readBadgeBody } from '@/lib/progress/badgeInput';
import { fail, nowIso, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

type Params = { params: { badgeId: string } };

export async function PATCH(request: Request, { params }: Params) {
  const { response } = await requireAuthedPermission('badges:edit');
  if (response) return response;

  const badge = await db.badge.findFirst({ where: { id: params.badgeId } });
  if (!badge) return fail(404, 'Badge not found.');

  const body = await request.json().catch(() => ({}));
  const { data, error } = readBadgeBody(body, true);
  if (error) return fail(400, error);

  const updated = await db.badge.update({
    where: { id: badge.id },
    data: { ...data, updatedAt: nowIso() },
  });
  return ok({ badge: updated });
}

/** Deletes the badge and takes it back from everyone who earned it. */
export async function DELETE(_request: Request, { params }: Params) {
  const { response } = await requireAuthedPermission('badges:delete');
  if (response) return response;

  const badge = await db.badge.findFirst({ where: { id: params.badgeId } });
  if (!badge) return fail(404, 'Badge not found.');

  await db.userBadge.deleteMany({ where: { badgeId: badge.id } });
  await db.badge.delete({ where: { id: badge.id } });
  return ok({ badge });
}
