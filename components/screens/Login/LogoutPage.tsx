/* eslint-disable @next/next/no-img-element */
"use client";

import Image from "next/image";
import { MobileBox, LoginButtons, LoginPassCode, LoginState } from "./Login";
import { useEffect, useState } from "react";
import { InstallButton, InstallState } from "./Install";
import { GreyButton } from "@/components/elements/Button";
import { useRouter } from "next/navigation";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useUser } from "@/utils/hooks/useUser";
import { Logout } from "./Logout";

export const LogoutPage = () => {
  const { data, status, user, signOutUser } = useUser(false);

  return (
    <div className="flex flex-col items-center justify-center py-2 bg-neutral-700 md:bg-neutral-900 h-screen">
      <MobileBox>
        <div className="flex flex-col grow gap-4 items-center justify-center">
          <div className="  p-4 rounded-full">
            <Image
              src="/logo/logo_white.png"
              alt="The Moon Devs"
              width={80}
              height={80}
            />
          </div>
          <p className="text-neutral-400 tracking-[0.5em] uppercase text-xs text-center">
            Sign out ?
          </p>
          {/* <h4 className="text-3xl font-bold text-neutral-100">TheMoonDevs</h4> */}
        </div>
        {status === "authenticated" && (
          <Logout user={user} signOut={signOutUser} />
        )}
      </MobileBox>
    </div>
  );
};
