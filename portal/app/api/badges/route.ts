import { db } from '@/lib/mongodb/db-client';
import { isAllowed } from '@/lib/permissions/defaults';
import { requireAuthedPermission } from '@/lib/permissions/server';
import { readBadgeBody } from '@/lib/progress/badgeInput';
import { fail, nowIso, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/** Badge definitions, with how many people hold each. Editors also see inactive ones. */
export async function GET() {
  const { response, user } = await requireAuthedPermission('badges:read');
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const editor = isAllowed(user, 'badges:edit');
  const badges = await db.badge.findMany({
    where: editor ? {} : { isActive: true },
    orderBy: [{ metric: 'asc' }, { threshold: 'asc' }],
  });
  const holders = await Promise.all(
    badges.map((b: { id: string }) =>
      db.userBadge.count({ where: { badgeId: b.id } }),
    ),
  );
  return ok({
    badges: badges.map((b: Record<string, unknown>, i: number) => ({
      ...b,
      holderCount: holders[i],
    })),
  });
}

export async function POST(request: Request) {
  const { response, user } = await requireAuthedPermission('badges:create');
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const body = await request.json().catch(() => ({}));
  const { data, error } = readBadgeBody(body);
  if (error) return fail(400, error);

  const now = nowIso();
  const badge = await db.badge.create({
    data: {
      isActive: true,
      description: null,
      imageUrl: null,
      ...data,
      createdById: user.id,
      createdAt: now,
      updatedAt: now,
    },
  });
  return ok({ badge }, { status: 201 });
}
