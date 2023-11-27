"use client";

import Image from "next/image";
import { MobileBox, LoginButtons, LoginPassCode, LoginState } from "./Login";
import { useEffect, useState } from "react";
import { InstallButton, InstallState } from "./Install";
import { useSession, signIn, signOut } from "next-auth/react";
import { GreyButton } from "@/components/elements/Button";

export const HomePage = () => {
  const [tab, setTab] = useState<InstallState | LoginState>(
    LoginState.SELECT_USER_TYPE
  );
  const [loading, setLoading] = useState(false);

  const { data, status } = useSession();

  useEffect(() => {
    console.log("login status");
    console.log(status);
    console.log(data);
  }, [data, status]);

  const loginWithPassCode = (passCode: string) => {
    setLoading(true);
    console.log("Logging in with passcode", passCode);
    signIn("credentials", {
      username: passCode.substring(0, 3).toUpperCase(),
      password: passCode.substring(3).toUpperCase(),
      redirect: false,
    })
      // fetch("/api/auth/login", {
      //   method: "POST",
      //   body: JSON.stringify({
      //     username: passCode.substring(0, 3),
      //     password: passCode.substring(3),
      //   }),
      // })
      //.then((res) => res.json())
      .then((data) => {
        setLoading(false);
        console.log("signIn callback", data);
        if (data?.ok) {
          console.log("Logged in!", data);
        } else {
          console.log("Failed to login!", data);
        }
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
        console.log("Failed to login!");
      });
  };

  return (
    <div className="flex flex-col items-center justify-center py-2 bg-neutral-700 md:bg-neutral-900 h-screen">
      <MobileBox>
        <div className="flex flex-col grow gap-4 items-center justify-center">
          <div className="bg-neutral-100  p-4 rounded-full">
            <Image
              src="/icon-512x512.png"
              alt="The Moon Devs"
              width={80}
              height={80}
            />
          </div>
          <h4 className="text-3xl font-bold text-neutral-100">TheMoonDevs</h4>
          <p className="text-neutral-400 tracking-[0.5em] uppercase text-xs text-center">
            Welcome to
          </p>
        </div>
        <InstallButton
          onInstallUpdate={(inst) => {
            if (inst) setTab(InstallState.INSTALL_CHECK);
          }}
        />
        {tab === LoginState.LOGIN_CODE && (
          <LoginPassCode
            onPassCodeFilled={(passCode) => {
              loginWithPassCode(passCode);
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
        {status === "authenticated" && (
          <GreyButton
            onClick={() => {
              signOut();
            }}
          >
            Sign out
          </GreyButton>
        )}
      </MobileBox>
    </div>
  );
};
