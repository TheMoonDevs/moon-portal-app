"use client";

import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Bottombar } from "./Bottombar";
import { DbUser } from "@/utils/services/models/User";

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { data, status } = useSession();
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated" && path !== APP_ROUTES.login) {
      router.push(APP_ROUTES.login);
    }
    if (path?.startsWith("/admin")) {
      if (status === "loading") return;
      if (
        status === "authenticated" &&
        data?.user &&
        (data.user as DbUser).isAdmin
      )
        return;
      router.push(APP_ROUTES.home);
    }
  }, [path, data, status, router]);

  return (
    <div>
      {/* <Header /> */}
      {/* <Sidebar /> */}
      {status === "authenticated" && data && <Bottombar />}
      {children}
    </div>
  );
};
