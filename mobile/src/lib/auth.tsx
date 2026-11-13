import * as Device from 'expo-device';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { api, setApiToken, setOnSignedOut } from './api';
import { appleIdentityToken } from './apple';
import { googleFirebaseIdToken, googleSignOut } from './google';
import { clearCache } from './query';
import { KEYS, read, write } from './secure';
import type { Profile } from './types';

type Status = 'loading' | 'signedOut' | 'signedIn';

type AuthValue = {
  status: Status;
  /** True while a sign-in is under way (the Google or Apple sheet is open). */
  signingIn: boolean;
  profile: Profile | null;
  /** Sign-in code + Google. Resolves false when the person closed Google. */
  signIn: (code: string) => Promise<boolean>;
  /** Sign-in code + Apple (iPhone). Resolves false when they closed Apple. */
  signInWithApple: (code: string) => Promise<boolean>;
  /** The test code + an email and password, for App Store and Play reviewers. */
  signInWithPassword: (code: string, email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  /** Signs out without asking the portal (after the account was closed). */
  forget: () => Promise<void>;
  /** Saves a changed profile (name, photo…) on the phone. */
  setProfile: (profile: Profile) => void;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/** Tokens last 180 days; swap for a fresh one once it is a week old. */
const RENEW_WHEN_LEFT_MS = 173 * 86400000;

type SignedIn = { token: string; expiresAt: string | null; user: Profile };

async function remember(session: SignedIn | null) {
  await Promise.all([
    write(KEYS.token, session?.token ?? null),
    write(KEYS.tokenExpiresAt, session?.expiresAt ?? null),
    write(KEYS.profile, session ? JSON.stringify(session.user) : null),
  ]);
}

const device = () => ({
  name: Device.deviceName ?? Device.modelName ?? '',
  platform: Platform.OS,
});

/**
 * Keeps the phone signed in to the portal: the token lives in secure storage,
 * is sent with every API call, and is renewed while the app is in use.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const forget = useCallback(async () => {
    setApiToken(null);
    await remember(null);
    await write(KEYS.companyId, null);
    await clearCache().catch(() => null);
    setProfileState(null);
    setStatus('signedOut');
  }, []);

  // The portal said the token stopped working (signed out in Settings, or
  // the account was deactivated).
  useEffect(() => {
    setOnSignedOut(() => void forget());
    return () => setOnSignedOut(null);
  }, [forget]);

  const setProfile = useCallback((next: Profile) => {
    setProfileState(next);
    void write(KEYS.profile, JSON.stringify(next));
  }, []);

  const refreshProfile = useCallback(async () => {
    const me = await api<{ user: Profile }>('/api/mobile/me');
    setProfile(me.user);
  }, [setProfile]);

  // On launch: pick up the saved sign-in, then refresh it in the background.
  useEffect(() => {
    (async () => {
      const [token, expiresAt, saved] = await Promise.all([
        read(KEYS.token),
        read(KEYS.tokenExpiresAt),
        read(KEYS.profile),
      ]);
      if (!token) {
        setStatus('signedOut');
        return;
      }
      setApiToken(token);
      setProfileState(saved ? (JSON.parse(saved) as Profile) : null);
      setStatus('signedIn');

      try {
        const me = await api<{ user: Profile }>('/api/mobile/me');
        setProfile(me.user);
        const left = expiresAt ? new Date(expiresAt).getTime() - Date.now() : 0;
        if (left < RENEW_WHEN_LEFT_MS) {
          const fresh = await api<{ token: string; expiresAt: string }>('/api/mobile/auth/renew', {
            method: 'POST',
          });
          setApiToken(fresh.token);
          await remember({ ...fresh, user: me.user });
        }
      } catch {
        // Offline: keep the saved sign-in. A 401 already signed out.
      }
    })();
  }, [setProfile]);

  const start = useCallback(async (session: SignedIn) => {
    setApiToken(session.token);
    await remember(session);
    setProfileState(session.user);
    setStatus('signedIn');
  }, []);

  /** Marks a sign-in as under way, so a downloaded update waits for it. */
  const whileSigningIn = useCallback(async (run: () => Promise<boolean>) => {
    setSigningIn(true);
    try {
      return await run();
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signIn = useCallback(
    (code: string) =>
      whileSigningIn(async () => {
        const idToken = await googleFirebaseIdToken();
        if (!idToken) return false;
        const session = await api<SignedIn>('/api/mobile/auth/sign-in', {
          method: 'POST',
          anonymous: true,
          body: { code: code.trim(), idToken, device: device() },
        });
        await start(session);
        return true;
      }),
    [start, whileSigningIn],
  );

  const signInWithApple = useCallback(
    (code: string) =>
      whileSigningIn(async () => {
        const identityToken = await appleIdentityToken();
        if (!identityToken) return false;
        const session = await api<SignedIn>('/api/mobile/auth/sign-in/apple', {
          method: 'POST',
          anonymous: true,
          body: { code: code.trim(), identityToken, device: device() },
        });
        await start(session);
        return true;
      }),
    [start, whileSigningIn],
  );

  const signInWithPassword = useCallback(
    (code: string, email: string, password: string) =>
      whileSigningIn(async () => {
        const session = await api<SignedIn>('/api/mobile/auth/sign-in/password', {
          method: 'POST',
          anonymous: true,
          body: { code: code.trim(), email: email.trim(), password, device: device() },
        });
        await start(session);
        return true;
      }),
    [start, whileSigningIn],
  );

  const signOut = useCallback(async () => {
    await api('/api/mobile/auth/sign-out', { method: 'POST' }).catch(() => null);
    await googleSignOut();
    await forget();
  }, [forget]);

  const value = useMemo(
    () => ({
      status,
      signingIn,
      profile,
      signIn,
      signInWithApple,
      signInWithPassword,
      signOut,
      forget,
      setProfile,
      refreshProfile,
    }),
    [
      status,
      signingIn,
      profile,
      signIn,
      signInWithApple,
      signInWithPassword,
      signOut,
      forget,
      setProfile,
      refreshProfile,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
