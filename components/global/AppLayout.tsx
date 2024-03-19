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

export interface PageReactFC extends React.FC {
  isAuthRequired: boolean;
}

export const AppLayout = (props: { children: any }) => {
  const { user, status } = useUser();
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") {
      let _user: any = localStorage.getItem(LOCAL_STORAGE.user);
      _user = _user ? JSON.parse(_user) : null;
      console.log("stored in local", _user);
      //if (!_user?._id) router.push(APP_ROUTES.login);
    }
  }, [path, user, status, router]);

  return (
    <div>
      {/* <Header /> */}
      {/* <Sidebar /> */}
      {props.children}
    </div>
  );
};
