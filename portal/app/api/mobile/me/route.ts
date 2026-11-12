import { mobileProfile, requireMobileToken } from '@/lib/mobile/server';
import { db } from '@/lib/mongodb/db-client';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/** The signed-in person, for the app's header and settings. */
export async function GET(request: Request) {
  const { response, found } = await requireMobileToken(request);
  if (response || !found) return response;
  const record = await db.user.findFirst({ where: { id: found.user.id } });
  if (!record) return fail(404, 'Account not found.');
  return ok({
    user: mobileProfile(record),
    isSuperAdmin: !!found.user.isSuperAdmin,
    tokenExpiresAt: found.token.expiresAt ?? null,
  });
}
