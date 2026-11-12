import { SignInError, verifyPortalSignIn } from '@/lib/auth/signIn';
import { issueMobileToken } from '@/lib/mobile/auth';
import { deviceFrom, mobileProfile, refusedSignIn } from '@/lib/mobile/server';
import { ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * The mobile app signs in: the person's sign-in code plus a Firebase ID token
 * from a Google sign-in on the phone, checked exactly as on the website.
 * Returns the token the app sends as `Authorization: Bearer` from then on.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  let signedIn;
  try {
    signedIn = await verifyPortalSignIn(
      typeof body.code === 'string' ? body.code : null,
      typeof body.idToken === 'string' ? body.idToken : null,
    );
  } catch (e) {
    if (e instanceof SignInError) return refusedSignIn(e.code);
    throw e;
  }

  const { user, googleEmail } = signedIn;
  const { token, expiresAt } = await issueMobileToken(
    String(user.id),
    googleEmail,
    deviceFrom(body),
  );
  return ok({ token, expiresAt, user: mobileProfile(user) });
}
