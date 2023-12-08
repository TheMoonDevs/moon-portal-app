"use client";

import { APP_ROUTES, LOCAL_STORAGE } from "@/utils/constants/appInfo";
import { useUser } from "@/utils/hooks/useUser";
import { DbUser } from "@/utils/services/models/User";
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
    path != APP_ROUTES.login;

  useEffect(() => {
    if (status === "unauthenticated" && path !== APP_ROUTES.login) {
      router.push(APP_ROUTES.login);
    }
    if (status === "loading") {
      let _user: any = localStorage.getItem(LOCAL_STORAGE.user);
      _user = _user ? JSON.parse(_user) : null;
      if (!_user?._id) router.push(APP_ROUTES.login);
    }
    if (path?.startsWith("/admin")) {
      if (status === "loading") return;
      if (status === "authenticated" && user && (user as DbUser).isAdmin)
        return;
      router.push(APP_ROUTES.home);
    }
  }, [path, user, status, router]);

  return (
    <div>
      {/* <Header /> */}
      {/* <Sidebar /> */}
      {isBottomBarVisible && <Bottombar />}
      {children}
    </div>
  );
};
