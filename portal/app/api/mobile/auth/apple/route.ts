import { AppleTokenError, verifyAppleIdToken } from '@/lib/auth/appleIdToken';
import { mobileProfile, requireMobileToken } from '@/lib/mobile/server';
import { db } from '@/lib/mongodb/db-client';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * Links the signed-in person's Apple ID (`{ identityToken }` from Sign in
 * with Apple on their iPhone), so the app can sign them in with Apple next
 * time. One Apple ID belongs to one person.
 */
export async function POST(request: Request) {
  const { response, found } = await requireMobileToken(request);
  if (response || !found) return response;
  const body = await request.json().catch(() => ({}));
  if (typeof body.identityToken !== 'string')
    return fail(400, 'Sign in with Apple first.');

  let apple;
  try {
    apple = await verifyAppleIdToken(body.identityToken);
  } catch (e) {
    if (e instanceof AppleTokenError) return fail(401, e.message);
    throw e;
  }
  const taken = await db.user.findFirst({
    where: { appleSub: apple.sub, id: { notIn: [found.user.id] } },
    select: { id: true },
  });
  if (taken)
    return fail(409, 'This Apple ID is already linked to someone else.');

  const user = await db.user.update({
    where: { id: found.user.id },
    data: { appleSub: apple.sub, updatedAt: new Date() },
  });
  return ok({ user: mobileProfile(user) });
}

/** Unlinks their Apple ID: the app signs in with Google only again. */
export async function DELETE(request: Request) {
  const { response, found } = await requireMobileToken(request);
  if (response || !found) return response;
  const user = await db.user.update({
    where: { id: found.user.id },
    data: { appleSub: null, updatedAt: new Date() },
  });
  return ok({ user: mobileProfile(user) });
}
