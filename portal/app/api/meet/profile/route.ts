import { originOf } from '@/lib/mcp/tokens';
import { parseProfileInput } from '@/lib/meet/rules';
import { getOrCreateProfile, meetLink } from '@/lib/meet/server';
import { db } from '@/lib/mongodb/db-client';
import { fail, nowIso, ok, requireUser } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/** The signed-in user's booking link and its settings. */
export async function GET(request: Request) {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  const profile = await getOrCreateProfile(user.id);
  return ok({ profile, link: meetLink(originOf(request), profile.code) });
}

/** Changes any of the settings. */
export async function PUT(request: Request) {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object')
    return fail(400, 'The settings could not be read.');
  const { data, error } = parseProfileInput(body);
  if (error) return fail(400, error);

  const current = await getOrCreateProfile(user.id);
  const profile = await db.meetProfile.update({
    where: { id: current.id },
    data: { ...data, updatedAt: nowIso() },
  });
  return ok({ profile, link: meetLink(originOf(request), profile.code) });
}
