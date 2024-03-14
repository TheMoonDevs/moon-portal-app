"use client";

import {
  APP_ROUTES,
  GLOBAL_ROUTES,
  LOCAL_STORAGE,
} from "@/utils/constants/appInfo";
import { useUser } from "@/utils/hooks/useUser";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Bottombar } from "./Bottombar";

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, status } = useUser();
  const path = usePathname();
  const router = useRouter();
  const isBottomBarVisible =
    status === "authenticated" &&
    user &&
    path != APP_ROUTES.logout &&
    path != APP_ROUTES.login &&
    !path?.startsWith(GLOBAL_ROUTES.applicationForm);

  useEffect(() => {
    if (status === "unauthenticated" && path !== APP_ROUTES.login) {
      router.push(APP_ROUTES.login);
    }
    if (status === "loading") {
      let _user: any = localStorage.getItem(LOCAL_STORAGE.user);
      _user = _user ? JSON.parse(_user) : null;
      //if (!_user?._id) router.push(APP_ROUTES.login);
    }
    if (path?.startsWith("/admin")) {
      if (status === "loading") return;
      if (status === "authenticated" && user && user.isAdmin) return;
      router.push(APP_ROUTES.home);
    }
    if (
      path?.startsWith(GLOBAL_ROUTES.applicationForm) &&
      path !== GLOBAL_ROUTES.applicationForm
    ) {
      router.push(path);
    }
  }, [path, user, status, router]);

  return (
    <div>
      {/* <Header /> */}
      {/* <Sidebar /> */}
      {children}
    </div>
  );
};
