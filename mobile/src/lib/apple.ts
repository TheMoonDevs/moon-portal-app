import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

/** Whether this phone offers Sign in with Apple (iPhones only). */
export async function appleAvailable() {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Signs in with Apple and returns the identity token the portal checks, or
 * null when the person closed the Apple sheet.
 */
export async function appleIdentityToken(): Promise<string | null> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      ],
    });
    if (!credential.identityToken) throw new Error('no token');
    return credential.identityToken;
  } catch (error) {
    if ((error as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return null;
    throw new Error('Apple sign-in didn’t go through. Please try again.');
  }
}
