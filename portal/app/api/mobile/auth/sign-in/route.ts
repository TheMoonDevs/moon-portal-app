import { LOGIN_ERROR_MESSAGES, LOGIN_ERRORS } from '@/lib/auth/loginErrors';
import { SignInError, verifyPortalSignIn } from '@/lib/auth/signIn';
import { issueMobileToken } from '@/lib/mobile/auth';
import { mobileProfile } from '@/lib/mobile/server';
import { ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/** A failed sign-in, with the same error codes the website's login uses. */
const refused = (code: string) =>
  Response.json(
    {
      status: 'fail',
      code,
      error: LOGIN_ERROR_MESSAGES[code] ?? 'Sign-in failed.',
    },
    { status: code === LOGIN_ERRORS.INACTIVE ? 403 : 401 },
  );

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
    if (e instanceof SignInError) return refused(e.code);
    throw e;
  }

  const { user, googleEmail } = signedIn;
  const platform = body.device?.platform;
  const { token, expiresAt } = await issueMobileToken(
    String(user.id),
    googleEmail,
    {
      name: typeof body.device?.name === 'string' ? body.device.name : '',
      platform:
        platform === 'ios' || platform === 'android' ? platform : undefined,
    },
  );
  return ok({ token, expiresAt, user: mobileProfile(user) });
}
