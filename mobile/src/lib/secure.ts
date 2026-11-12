import * as SecureStore from 'expo-secure-store';

/** Small values kept in the phone's keychain / keystore. */
export const KEYS = {
  token: 'portal.token',
  tokenExpiresAt: 'portal.tokenExpiresAt',
  profile: 'portal.profile',
  companyId: 'portal.companyId',
} as const;

export async function read(key: string) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function write(key: string, value: string | null) {
  try {
    if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // A full or locked keychain only costs a sign-in next time.
  }
}
