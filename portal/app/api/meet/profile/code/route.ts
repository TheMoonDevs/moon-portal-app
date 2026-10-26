import { originOf } from '@/lib/mcp/tokens';
import {
  getOrCreateProfile,
  meetLink,
  uniqueMeetCode,
} from '@/lib/meet/server';
import { db } from '@/lib/mongodb/db-client';
import { fail, nowIso, ok, requireUser } from '@/lib/workspace/server';

/**
 * A new invite code. The old link stops working straight away; meetings
 * already booked through it are kept.
 */
export async function POST(request: Request) {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  const current = await getOrCreateProfile(user.id);
  const profile = await db.meetProfile.update({
    where: { id: current.id },
    data: { code: await uniqueMeetCode(), updatedAt: nowIso() },
  });
  return ok({ profile, link: meetLink(originOf(request), profile.code) });
}
