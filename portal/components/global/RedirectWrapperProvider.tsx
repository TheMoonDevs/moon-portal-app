'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';

const PUBLIC_ROUTES = ['/', '/login', '/logout', '/api/auth', '/api'];

export default function RedirectWrapperProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (status === 'loading') return;

    let requestedRoute;

    if (pathname && !PUBLIC_ROUTES.includes(pathname))
      requestedRoute = pathname;

    if (!session && requestedRoute) {
      router.replace(`/login?uri=${window.location.origin}${requestedRoute}`);
    }
  }, [session, status]);

  return <>{children}</>;
}
