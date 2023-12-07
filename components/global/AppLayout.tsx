"use client";

import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { data, status } = useSession();
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated" && path !== APP_ROUTES.login) {
      router.push(APP_ROUTES.login);
    }
  }, [path, data, status, router]);

  return (
    <div>
      {/* <Header /> */}
      {/* <Sidebar /> */}
      {children}
    </div>
  );
};
