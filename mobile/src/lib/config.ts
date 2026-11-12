import Constants from 'expo-constants';

/** Settings baked into the build by app.config.ts. */
type Extra = {
  portalUrl?: string;
  googleWebClientId?: string | null;
  googleIosClientId?: string | null;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** The portal the app talks to, e.g. https://portal.themoondevs.com. */
export const PORTAL_URL = (extra.portalUrl || 'https://portal.themoondevs.com').replace(/\/$/, '');

export const GOOGLE_WEB_CLIENT_ID = extra.googleWebClientId ?? null;
export const GOOGLE_IOS_CLIENT_ID = extra.googleIosClientId ?? null;

/**
 * The portal's public Firebase web key (also in
 * portal/utils/services/firebaseConfig.ts). The app swaps a Google sign-in
 * for a Firebase ID token with it, which is what the portal checks.
 */
export const FIREBASE_API_KEY = 'AIzaSyBBKvCt63eKFwHrFx6iOT2Dbj70Atz7lIc';

export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';
