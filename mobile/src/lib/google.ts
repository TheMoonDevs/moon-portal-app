import { Platform } from 'react-native';

import { FIREBASE_API_KEY, GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from './config';

/** Whether this build has the Google client ids it needs. */
export const googleReady = () =>
  !!GOOGLE_WEB_CLIENT_ID && (Platform.OS !== 'ios' || !!GOOGLE_IOS_CLIENT_ID);

let configured = false;

/**
 * Signs in with Google on the phone and returns a Firebase ID token for that
 * Google account (what the portal's sign-in checks, as on the website), or
 * null when the person closed the Google sheet.
 */
export async function googleFirebaseIdToken(): Promise<string | null> {
  // Loaded here so screens that never sign in don't need the native module.
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = await import(
    '@react-native-google-signin/google-signin'
  );
  if (!configured) {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID ?? undefined,
      iosClientId: GOOGLE_IOS_CLIENT_ID ?? undefined,
    });
    configured = true;
  }

  let googleIdToken: string | null = null;
  try {
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices();
    // Always show the account picker, like the website does.
    await GoogleSignin.signOut().catch(() => null);
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    googleIdToken = response.data.idToken;
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.IN_PROGRESS || error.code === statusCodes.SIGN_IN_CANCELLED) return null;
      // Android's DEVELOPER_ERROR: Google doesn't know the key this copy of
      // the app is signed with (its SHA-1 isn't on the Firebase Android app).
      if (error.code === '10') throw new Error('Google sign-in isn’t set up for this version of the app yet (code 10).');
      throw new Error(`Google sign-in didn’t go through (${error.code}). Please try again.`);
    }
    throw new Error('Google sign-in didn’t go through. Please try again.');
  }
  if (!googleIdToken) throw new Error('Google didn’t return a sign-in token.');
  return firebaseIdTokenFor(googleIdToken);
}

/** Swaps a Google ID token for a Firebase one (Firebase Auth REST API). */
async function firebaseIdTokenFor(googleIdToken: string) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        postBody: `id_token=${encodeURIComponent(googleIdToken)}&providerId=google.com`,
        requestUri: 'http://localhost',
        returnSecureToken: true,
        returnIdpCredential: true,
      }),
    },
  );
  const json = await res.json().catch(() => null);
  if (!res.ok || typeof json?.idToken !== 'string') {
    // Firebase answers like "INVALID_IDP_RESPONSE : …"; its first word is enough.
    const reason = typeof json?.error?.message === 'string' ? json.error.message.split(/[\s:]/)[0] : res.status;
    throw new Error(`Google sign-in didn’t go through (${reason}). Please try again.`);
  }
  return json.idToken as string;
}

/** Forgets the Google account on this phone (on sign-out). */
export async function googleSignOut() {
  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut();
  } catch {
    // Nothing to forget.
  }
}
