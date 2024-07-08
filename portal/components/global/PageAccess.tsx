"use client";

import { APP_ROUTES, AppRoutesHelper } from "@/utils/constants/appInfo";
import { useUser } from "@/utils/hooks/useUser";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

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
  const bottomBarShown = AppRoutesHelper.bottomBarShown(path);

  useEffect(() => {
    if (status === "unauthenticated" && isAuthRequired) {
      router.push(APP_ROUTES.login);
      return;
    }
    if (status === "authenticated" && isAdminRequired && !user?.isAdmin) {
      router.push(APP_ROUTES.home);
      return;
    }

    if (status === "authenticated" && verifiedUserEmail !== user?.email) {
      router.push(APP_ROUTES.login);
      return;
    }
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

  if (status === "loading") {
    if (isAuthRequired || isAdminRequired)
      return (
        <div className="flex flex-col items-center justify-center py-2 bg-neutral-700 md:bg-neutral-900 h-screen">
          <div className="flex flex-row items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-neutral-100"></div>
            <p className="text-neutral-100">Verifying Connection...</p>
          </div>
        </div>
      );
    else return children;
  }

  if (isAuthRequired && verifiedUserEmail !== user?.email) {
    return (
      <div className="flex flex-col items-center justify-center py-2 bg-neutral-700 md:bg-neutral-900 h-screen">
        <div className="flex flex-row items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-neutral-100"></div>
          <p className="text-neutral-100">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (isAdminRequired && !user?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-2 bg-neutral-700 md:bg-neutral-900 h-screen">
        <div className="flex flex-row items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-neutral-100"></div>
          <p className="text-neutral-100">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${bottomBarShown ? "md:pl-20" : ""}`}>{children}</div>
  );
};
