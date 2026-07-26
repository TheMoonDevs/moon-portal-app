'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

import { setRedirectUri, setReduxUser } from '@/utils/redux/auth/auth.slice';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';

const PUBLIC_ROUTES = ['/', '/login', '/logout', '/api/auth', '/api'];

export default function RedirectWrapperProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();

  // Read current Redux user into a ref so the effect can access the latest
  // value without `currentReduxUser` being a reactive dependency.
  // Making it a dep caused: dispatch → Redux updates → effect re-runs → dispatch → ∞
  const currentReduxUser = useAppSelector((state) => state.auth.user);
  const currentReduxUserRef = useRef(currentReduxUser);
  currentReduxUserRef.current = currentReduxUser; // always keep ref in sync

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // session.user only contains basic fields (name, email, id) from NextAuth —
      // it does NOT include isAdmin or other detailed fields.
      // Merge session fields *under* the existing Redux user so the detailed
      // fields (isAdmin, userType, etc.) are never overwritten, even momentarily.
      const sessionUser = session.user as any;
      const existingUser = currentReduxUserRef.current;
      const mergedUser =
        existingUser?.id && existingUser.id === sessionUser?.id
          ? { ...sessionUser, ...existingUser } // existingUser wins on all shared keys
          : sessionUser;
      dispatch(setReduxUser(mergedUser));
      return;
    }
    if (status === 'loading') return;
    if (status === 'authenticated') return;
    if (session === null) return;

    console.log(
      'RedirectWrapperProvider.tsx',
      'session:',
      session,
      'status:',
      status,
      'pathname:',
      pathname,
      'url',
      window.location.href,
    );

    let requestedRoute;

    if (pathname && !PUBLIC_ROUTES.includes(pathname))
      requestedRoute = pathname;

    const callbackurl = `${window.location.href}`;
    const uri = `${window.location.origin}/login?uri=${callbackurl}`;
    dispatch(setRedirectUri(uri));

    if (!session && requestedRoute) {
      router.replace(`/login?uri=${callbackurl}`);
      console.log('Redirecting to login page');
    }
  // currentReduxUser intentionally excluded — read via ref to avoid the
  // dispatch → Redux update → effect retrigger → dispatch infinite loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, dispatch, pathname, router]);

  return <>{children}</>;
}
