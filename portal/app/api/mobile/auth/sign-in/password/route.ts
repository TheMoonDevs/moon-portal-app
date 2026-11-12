import { SignInError } from '@/lib/auth/signIn';
import { clientKeyFor } from '@/lib/hiring/server';
import { issueMobileToken } from '@/lib/mobile/auth';
import { deviceFrom, mobileProfile, refusedSignIn } from '@/lib/mobile/server';
import { verifyTestSignIn } from '@/lib/mobile/testSignIn';
import { ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * The test sign-in for App Store and Google Play reviewers: the code TEST12
 * plus the one email and password set in the server's environment (see
 * lib/mobile/testSignIn.ts). Answers like the Google sign-in.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  let signedIn;
  try {
    signedIn = await verifyTestSignIn({
      code: body.code,
      email: body.email,
      password: body.password,
      clientKey: clientKeyFor(request),
    });
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
