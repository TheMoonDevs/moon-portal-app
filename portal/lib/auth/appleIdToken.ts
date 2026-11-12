import { createRemoteJWKSet, jwtVerify } from 'jose';

/*
 * Server-side check of a Sign in with Apple identity token from the mobile
 * app (expo-apple-authentication). The token is verified against Apple's
 * public keys and must be meant for the app's bundle id, so the Apple ID in
 * it (`sub`) is one the person really signed in with.
 */

const APPLE_JWKS = createRemoteJWKSet(
  new URL('https://appleid.apple.com/auth/keys'),
);

/** The iOS app's bundle id; Apple puts it in the token's `aud`. */
const APPLE_AUDIENCES = (
  process.env.APPLE_BUNDLE_IDS || 'com.themoondevs.portal'
)
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

export class AppleTokenError extends Error {}

export type AppleIdentity = {
  /** Apple's stable id for this person in this app. */
  sub: string;
  /** Lower-cased; only when Apple shared a verified email. */
  email: string | null;
};

/** The verified Apple ID behind an identity token. */
export async function verifyAppleIdToken(
  identityToken: string,
): Promise<AppleIdentity> {
  let payload;
  try {
    ({ payload } = await jwtVerify(identityToken, APPLE_JWKS, {
      issuer: 'https://appleid.apple.com',
      audience: APPLE_AUDIENCES,
      algorithms: ['RS256'],
    }));
  } catch {
    throw new AppleTokenError('Apple sign-in could not be verified.');
  }
  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  if (!sub) throw new AppleTokenError('Apple sign-in could not be verified.');
  // Apple sends email_verified as a boolean or as "true".
  const verified =
    payload.email_verified === true || payload.email_verified === 'true';
  const email =
    verified && typeof payload.email === 'string'
      ? payload.email.trim().toLowerCase()
      : null;
  return { sub, email };
}
