'use client';

import { APP_ROUTES, AppRoutesHelper } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { useAppSelector } from '@/utils/redux/store';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export const usePageAccess = () => {};
export const PageAccess = ({
  isAuthRequired,
  isAdminRequired,
  children,
}: {
  children: any;
  isAuthRequired?: boolean;
  isAdminRequired?: boolean;
}) => {
  const { user, status, verifiedUserEmail } = useUser();
  const router = useRouter();
  const path = usePathname();
  const [bottomBarShown, setBottomBarShown] = useState(false);
  const { redirectUri } = useAppSelector((state) => state.auth);
  useEffect(() => {
    if (status === 'unauthenticated' && isAuthRequired) {
      router.push(APP_ROUTES.login);
      return;
    }
    if (status === 'authenticated' && isAdminRequired && !user?.isAdmin) {
      router.push(redirectUri || APP_ROUTES.home);
      return;
    }

    if (status === 'authenticated' && verifiedUserEmail !== user?.email) {
      router.push(APP_ROUTES.login);
      return;
    }

    setBottomBarShown(document.getElementById('home-bottombar') != null);
  }, [
    user,
    status,
    isAuthRequired,
    isAdminRequired,
    router,
    verifiedUserEmail,
  ]);

  // useEffect(() => {
  //   if(typeof window !== undefined){
  //     document?.querySelector('html')?.classList.remove('dark')
  //   }
  // },[])

  if (status === 'loading') {
    if (isAuthRequired || isAdminRequired)
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-neutral-700 py-2 md:bg-neutral-900">
          <div className="flex flex-row items-center justify-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-neutral-100"></div>
            <p className="text-neutral-100">Verifying Connection...</p>
          </div>
        </div>
      );
    else return children;
  }

  if (isAuthRequired && verifiedUserEmail !== user?.email) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-neutral-700 py-2 md:bg-neutral-900">
        <div className="flex flex-row items-center justify-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-neutral-100"></div>
          <p className="text-neutral-100">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (isAdminRequired && !user?.isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-neutral-700 py-2 md:bg-neutral-900">
        <div className="flex flex-row items-center justify-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-neutral-100"></div>
          <p className="text-neutral-100">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${bottomBarShown ? 'md:pl-24' : ''}`}>{children}</div>
  );
};
