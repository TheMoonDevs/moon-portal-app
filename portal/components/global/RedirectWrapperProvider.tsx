'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

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
  const currentReduxUser = useAppSelector((state) => state.auth.user);
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // session.user only contains basic fields (name, email, id) from NextAuth —
      // it does NOT include isAdmin or other detailed fields.
      // Merge session fields *under* the existing Redux user so the detailed
      // fields (isAdmin, userType, etc.) are never overwritten, even momentarily.
      const sessionUser = session.user as any;
      const mergedUser =
        currentReduxUser?.id && currentReduxUser.id === sessionUser?.id
          ? { ...sessionUser, ...currentReduxUser } // currentReduxUser wins on all shared keys
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
  }, [session, status, dispatch, pathname, router, currentReduxUser]);

  return <>{children}</>;
}
