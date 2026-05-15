'use client';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { PortalSdk } from '../services/PortalSdk';
import { APP_ROUTES, LOCAL_STORAGE } from '../constants/appInfo';
import { User } from '@db/client';
import { useAppDispatch, useAppSelector } from '../redux/store';
import { setReduxUser } from '../redux/auth/auth.slice';

export const useUser = (newfetch?: boolean) => {
  const { data, status } = useSession();
  const dispatch = useAppDispatch();
  const sessionUser = useMemo(() => (data?.user as User) || {}, [data]);
  const fetchedUser = useAppSelector((state) => state.auth.user);
  const [localUser, setLocalUser] = useState<User | null>(null);
  const verifiedUserEmail = useAppSelector(
    (state) => state.auth.verifiedUserEmail,
  );

  const getParsedLocalUser = (): User | null => {
    const rawUser = localStorage.getItem(LOCAL_STORAGE.user);
    if (!rawUser) return null;
    try {
      const parsed = JSON.parse(rawUser) as User;
      return parsed?.id ? parsed : null;
    } catch {
      localStorage.removeItem(LOCAL_STORAGE.user);
      return null;
    }
  };

  const refetchUser = () => {
    try {
      PortalSdk.getData('/api/user?id=' + sessionUser.id, null)
        .then((data) => {
          if (data?.users?.length === 0) {
            if (sessionUser.id) {
              console.log('No user found');
              localStorage.removeItem(LOCAL_STORAGE.user);
              signOut({
                callbackUrl: APP_ROUTES.login,
              });
            }
            return;
          }
          if (data?.data?.user?.[0]) {
            dispatch(setReduxUser(data?.data?.user?.[0]));
          }
        })
        .catch((err) => {
          console.log(err);
        });
      console.log('User data updated successfully');
    } catch (err) {
      console.log('Error fetching or updating user', err);
    }
  };

  // fetch from local storage
  useEffect(() => {
    const localStorageUser = getParsedLocalUser();
    if (localStorageUser?.id) {
      setLocalUser(localStorageUser);
      // only promote to Redux if it's a full user record (has userType)
      if (localStorageUser?.userType) {
        dispatch(setReduxUser(localStorageUser));
      }
    }
  }, [dispatch]);

  useEffect(() => {
    if (fetchedUser?.userType) return;
    const _local_user = getParsedLocalUser();
    if (!sessionUser?.id) return;
    // use cached local user only if it has full data (userType present)
    if (_local_user?.userType) {
      dispatch(setReduxUser(_local_user));
      return;
    }
    refetchUser();
  }, [newfetch, sessionUser, fetchedUser, dispatch]);

  return {
    user: fetchedUser?.id
      ? fetchedUser
      : localUser?.id
        ? localUser
        : sessionUser?.id
          ? sessionUser
          : null,
    verifiedUserEmail: verifiedUserEmail,
    status: fetchedUser?.id != null ? 'authenticated' : status,
    data,
    signOutUser: () => {
      signOut({
        callbackUrl: APP_ROUTES.login,
      })
        .then(() => {
          localStorage.removeItem(LOCAL_STORAGE.user);
        })
        .catch((err: any) => {
          console.log('signout error', err);
        });
    },
    refetchUser,
  };
};
