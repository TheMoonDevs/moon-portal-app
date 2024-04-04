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
  const { user, status } = useUser(true);
  const path = usePathname();
  const router = useRouter();

  return (
    <div>
      {/* <Header /> */}
      {/* <Sidebar /> */}
      {props.children}
    </div>
  );
};
