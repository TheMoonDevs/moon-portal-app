'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppDispatch } from '@/utils/redux/store';
import { setRedirectUri } from '@/utils/redux/auth/auth.slice';

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
  useEffect(() => {

    if (status === 'loading') return;
    if (status === 'authenticated') return;
    //if (session === null) return;

    console.log('RedirectWrapperProvider.tsx', 'session:', session, 'status:', status, 'pathname:', pathname, 'url', window.location.href);

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
  }, [session, status]);

  return <>{children}</>;
}
