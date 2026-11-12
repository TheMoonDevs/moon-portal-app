import { useQueryClient } from '@tanstack/react-query';
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
import { googleFirebaseIdToken, googleSignOut } from './google';
import { KEYS, read, write } from './secure';
import type { Profile } from './types';

type Status = 'loading' | 'signedOut' | 'signedIn';

type AuthValue = {
  status: Status;
  profile: Profile | null;
  /** Sign-in code + Google. Resolves false when the person closed Google. */
  signIn: (code: string) => Promise<boolean>;
  signOut: () => Promise<void>;
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

/**
 * Keeps the phone signed in to the portal: the token lives in secure storage,
 * is sent with every API call, and is renewed while the app is in use.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);

  const forget = useCallback(async () => {
    setApiToken(null);
    await remember(null);
    await write(KEYS.companyId, null);
    queryClient.clear();
    setProfile(null);
    setStatus('signedOut');
  }, [queryClient]);

  // The portal said the token stopped working (signed out in Settings, or
  // the account was deactivated).
  useEffect(() => {
    setOnSignedOut(() => void forget());
    return () => setOnSignedOut(null);
  }, [forget]);

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
      setProfile(saved ? (JSON.parse(saved) as Profile) : null);
      setStatus('signedIn');

      try {
        const me = await api<{ user: Profile }>('/api/mobile/me');
        setProfile(me.user);
        await write(KEYS.profile, JSON.stringify(me.user));
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
  }, []);

  const signIn = useCallback(async (code: string) => {
    const idToken = await googleFirebaseIdToken();
    if (!idToken) return false;
    const session = await api<SignedIn>('/api/mobile/auth/sign-in', {
      method: 'POST',
      anonymous: true,
      body: {
        code: code.trim(),
        idToken,
        device: { name: Device.deviceName ?? Device.modelName ?? '', platform: Platform.OS },
      },
    });
    setApiToken(session.token);
    await remember(session);
    setProfile(session.user);
    setStatus('signedIn');
    return true;
  }, []);

  const signOut = useCallback(async () => {
    await api('/api/mobile/auth/sign-out', { method: 'POST' }).catch(() => null);
    await googleSignOut();
    await forget();
  }, [forget]);

  const value = useMemo(
    () => ({ status, profile, signIn, signOut }),
    [status, profile, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
