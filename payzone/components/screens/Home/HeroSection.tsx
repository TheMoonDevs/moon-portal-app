"use client";

import Image from "next/image";
import { useAuthSession } from "@/utils/hooks/useAuthSession";
import { CircularProgress } from "@mui/material";
import useAsyncState from "@/utils/hooks/useAsyncState";
import { MyServerApi } from "@/utils/service/MyServerApi";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { setUser } from "@/utils/redux/auth/auth.slice";
import { User } from "@prisma/client";
import { Backdrop } from "./Backdrop/Backdrop";
import useMousePosition from "@/utils/hooks/useMousePosition";
import gsap from "gsap";
import { useEffect } from "react";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useState } from "react";

interface UserData {
  data: {
    user: User;
  };
}
export const HeroSection = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const {  signInWithSocial, authStatus, user } = useAuthSession();
  const { loading } = useAppSelector(
    (state) => state.auth
  );

  return (
    <section className="overflow-hidden mt-28 text-white">
      <div className=" flex flex-col items-center justify-center">
        <HeroText />
        <button
          className="flex items-center justify-center gap-5 mt-28 px-14 py-3 border-borderGrey border-[1px]"
          onClick={signInWithSocial}
          disabled={loading}
        >
          {loading ? (
            <CircularProgress size={30} color="inherit" />
          ) : (
            <Image src="/logo/google.png" alt="" width={30} height={30} />
          )}
          <span>Login with Google</span>
        </button>
        <div className="w-full flex items-center justify-end mt-14">
          <div className="bg-black border border-1 border-amber-300 text-amber-300 w-fit font-black text-sm p-2">
            1 TMD === 1 INR
          </div>
        </div>
      </div>
      <Backdrop />
    </section>
  );
};

const HeroText = () => {
  const mousePosition = useMousePosition();

  // useEffect(() => {
  //   gsap.to(".hero_text", {
  //     x: mousePosition.xfromcenter / 100,
  //     y: -mousePosition.yfromcenter / 100,
  //     duration: 2.5,
  //     ease: "back.out(1.7)",
  //   });
  // }, [mousePosition]);

  return (
    <>
      <div className="flex flex-col text-center mb-12 gap-3">
        <p className="hero_text font-unica text-8xl">Ad Astra per Aspera</p>
        <pre className="hero_text text-3xl opacity-50 font-light tracking-[0.2em]">
          through hardships to the stars
        </pre>
      </div>
      <p className="hero_text text-md w-[55%] text-center">
        TheMoonDevs is, was and will always be a meritocracy. Welcome to the the
        Payments Zone, where you can access all your Payments, Merits,
        Certificates, Rewards, Perks, and Benefits all in one place.
      </p>
    </>
  );
};
