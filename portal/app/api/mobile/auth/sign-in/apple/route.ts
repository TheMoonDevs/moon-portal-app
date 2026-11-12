import { SignInError, verifyPortalAppleSignIn } from '@/lib/auth/signIn';
import { issueMobileToken } from '@/lib/mobile/auth';
import { deviceFrom, mobileProfile, refusedSignIn } from '@/lib/mobile/server';
import { ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * Sign in with Apple, on iPhones: the sign-in code plus an Apple identity
 * token for an Apple ID linked to that person (see verifyPortalAppleSignIn).
 * Answers like the Google sign-in.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  let signedIn;
  try {
    signedIn = await verifyPortalAppleSignIn(
      typeof body.code === 'string' ? body.code : null,
      typeof body.identityToken === 'string' ? body.identityToken : null,
    );
  } catch (e) {
    if (e instanceof SignInError) return refusedSignIn(e.code);
    throw e;
  }

  const { user } = signedIn;
  const { token, expiresAt } = await issueMobileToken(
    String(user.id),
    null,
    deviceFrom(body),
  );
  return ok({ token, expiresAt, user: mobileProfile(user) });
}
