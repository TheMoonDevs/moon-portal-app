import { db } from '@/lib/mongodb/db-client';
import { awardAndListBadges, getUserMetrics } from '@/lib/progress/server';
import { fail, ok, requireUser } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * The signed-in user's badges and progress. Opening this is also when new
 * badges are awarded, so nothing has to run on a schedule.
 */
export async function GET() {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const record = await db.user.findFirst({
    where: { id: user.id },
    select: { id: true, createdAt: true },
  });
  if (!record) return fail(404, 'User not found.');

  const [badges, metrics] = await Promise.all([
    awardAndListBadges(record),
    getUserMetrics(record),
  ]);
  return ok({ badges, metrics });
}
