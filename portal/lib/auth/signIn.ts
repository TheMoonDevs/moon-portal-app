import {
  getSignInEmails,
  GoogleTokenError,
  verifyGoogleIdToken,
} from '@/lib/auth/googleIdToken';
import { LOGIN_ERRORS } from '@/lib/auth/loginErrors';
import { findUserBySignInCode } from '@/lib/users/server';

/** A sign-in that failed; `code` is one of LOGIN_ERRORS. */
export class SignInError extends Error {
  constructor(public code: keyof typeof LOGIN_ERRORS) {
    super(code);
  }
}

/*
 * Sign-in needs two things together:
 *   1. the person's six-character sign-in code (e.g. ABC123), and
 *   2. a Google sign-in with ANY Google account linked to that user
 *      (their primary email or one of `linkedEmails`).
 * The Google token is verified on the server, so a code alone never signs
 * anyone in. The website (NextAuth) and the mobile app both sign in here.
 */
export async function verifyPortalSignIn(
  code: string | null | undefined,
  idToken: string | null | undefined,
) {
  if (!code) throw new SignInError(LOGIN_ERRORS.INVALID_CODE);
  if (!idToken) throw new SignInError(LOGIN_ERRORS.GOOGLE_FAILED);

  const user = await findUserBySignInCode(code);
  if (!user) throw new SignInError(LOGIN_ERRORS.INVALID_CODE);
  if (user.status && user.status !== 'ACTIVE') {
    throw new SignInError(LOGIN_ERRORS.INACTIVE);
  }

  let googleEmail: string;
  try {
    googleEmail = await verifyGoogleIdToken(idToken);
  } catch (e) {
    if (e instanceof GoogleTokenError) {
      throw new SignInError(LOGIN_ERRORS.GOOGLE_FAILED);
    }
    throw e;
  }

  if (!getSignInEmails(user).includes(googleEmail)) {
    throw new SignInError(LOGIN_ERRORS.EMAIL_NOT_LINKED);
  }
  return { user, googleEmail };
}
