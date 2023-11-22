"use client";

import Image from "next/image";
import { LoginBox, LoginButtons, LoginPassCode, LoginState } from "./Login";
import { useState } from "react";
import { InstallState } from "./Install";

export const HomePage = () => {
  const [tab, setTab] = useState<InstallState | LoginState>(
    LoginState.SELECT_USER_TYPE
  );

  return (
    <div className="flex flex-col items-center justify-center py-2 bg-neutral-900 h-screen">
      <LoginBox>
        <div className="flex flex-col grow items-center justify-center">
          <div className="bg-neutral-100  p-4 rounded-full">
            <Image
              src="/icon-512x512.png"
              alt="The Moon Devs"
              width={80}
              height={80}
            />
          </div>
          <h4 className="text-3xl font-bold text-neutral-100">TheMoonDevs</h4>
        </div>
        {tab === LoginState.LOGIN_CODE && (
          <LoginPassCode
            onPassCodeFilled={(passCode) => {
              setTab(InstallState.SPLASH);
            }}
          />
        )}
        {tab === LoginState.SELECT_USER_TYPE && (
          <LoginButtons
            onSelectUserType={(_type) => {
              setTab(LoginState.LOGIN_CODE);
            }}
          />
        )}
      </LoginBox>
    </div>
  );
};
