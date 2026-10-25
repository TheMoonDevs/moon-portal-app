import { createRemoteJWKSet, jwtVerify } from 'jose';

import { firebaseConfig } from '@/utils/services/firebaseConfig';

/*
 * Server-side check of the Google sign-in done in the browser with Firebase.
 * The browser sends the Firebase ID token; we verify its signature against
 * Google's public keys, so the email inside it is one the person really owns.
 * No service-account key is needed for this.
 */

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
);

export class GoogleTokenError extends Error {}

/** Returns the verified, lower-cased Google email for a Firebase ID token. */
export async function verifyGoogleIdToken(idToken: string): Promise<string> {
  const { projectId } = firebaseConfig;
  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
    }));
  } catch {
    throw new GoogleTokenError('Google sign-in could not be verified.');
  }

  const provider = (payload.firebase as { sign_in_provider?: string } | undefined)
    ?.sign_in_provider;
  const email = typeof payload.email === 'string' ? payload.email : '';

  if (provider !== 'google.com' || !email || payload.email_verified !== true) {
    throw new GoogleTokenError('Please sign in with a verified Google account.');
  }
  return email.trim().toLowerCase();
}

/** Every email a user may sign in with: the primary one plus linked ones. */
export function getSignInEmails(user: {
  email?: string | null;
  linkedEmails?: string[] | null;
}): string[] {
  const all = [user.email, ...(user.linkedEmails ?? [])]
    .filter((e): e is string => typeof e === 'string' && e.trim() !== '')
    .map((e) => e.trim().toLowerCase());
  return Array.from(new Set(all));
}
