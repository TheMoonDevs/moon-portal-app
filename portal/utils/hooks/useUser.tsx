'use client';

import type { User } from '@db/client';
import { signOut, useSession } from 'next-auth/react';
import { useCallback, useEffect } from 'react';

import { APP_ROUTES } from '@/utils/constants/appInfo';
import { clearReduxUser, setReduxUser } from '@/utils/redux/auth/auth.slice';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { PortalSdk } from '@/utils/services/PortalSdk';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

// Client-side caches holding one user's data. Left behind, they leak to the
// next person who signs in on the same browser.
const PER_USER_CACHE_KEYS = ['notifications', 'passcode'];

const clearPerUserCaches = () => {
  if (typeof window === 'undefined') return;
  PER_USER_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
};

/**
 * NextAuth is the single source of truth for whether someone is signed in.
 * Redux/localStorage only cache the full user record, which the session does
 * not carry — they can never make an expired session look valid.
 */
export const useUser = () => {
  const { data: session, status } = useSession();
  const dispatch = useAppDispatch();
  const cachedUser = useAppSelector((state) => state.auth.user);
  const verifiedUserEmail = useAppSelector(
    (state) => state.auth.verifiedUserEmail,
  );

  const sessionUser = session?.user as (User & { id?: string }) | undefined;
  const sessionUserId = sessionUser?.id;

  const isCacheForSession = !!sessionUserId && cachedUser?.id === sessionUserId;

  const fetchProfile = useCallback(
    async (userId: string) => {
      const res = await PortalSdk.getData(`/api/user?id=${userId}`, null);
      const profile: User | undefined = res?.data?.user?.[0];

      if (!profile) {
        await signOut({ callbackUrl: APP_ROUTES.login });
        return;
      }
      dispatch(setReduxUser(profile));
    },
    [dispatch],
  );

  useEffect(() => {
    if (status !== 'authenticated' || !sessionUserId) return;
    if (isCacheForSession && cachedUser?.userType) return;

    fetchProfile(sessionUserId).catch((err) =>
      console.error('Failed to load user profile', err),
    );
  }, [
    status,
    sessionUserId,
    isCacheForSession,
    cachedUser?.userType,
    fetchProfile,
  ]);

  useEffect(() => {
    if (status !== 'unauthenticated' || !cachedUser) return;
    dispatch(clearReduxUser());
    clearPerUserCaches();
  }, [status, cachedUser, dispatch]);

  const user =
    status === 'authenticated'
      ? ((isCacheForSession ? cachedUser : sessionUser) ?? null)
      : null;

  return {
    user,
    status: status as AuthStatus,
    verifiedUserEmail,
    refetchUser: () => sessionUserId && fetchProfile(sessionUserId),
    signOutUser: () => {
      dispatch(clearReduxUser());
      clearPerUserCaches();
      return signOut({ callbackUrl: APP_ROUTES.login });
    },
  };
};
