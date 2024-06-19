"use client";

import Image from "next/image";
import { useAuthSession } from "@/utils/hooks/useAuthSession";
import { Button, CircularProgress } from "@mui/material";
import useAsyncState from "@/utils/hooks/useAsyncState";
import { MyServerApi } from "@/utils/service/MyServerApi";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { setUser } from "@/utils/redux/auth/auth.slice";
import { User } from "@prisma/client";
import { Backdrop } from "./Backdrop/Backdrop";
import useMousePosition from "@/utils/hooks/useMousePosition";
import gsap from "gsap";
import { useEffect, useState } from "react";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useSyncBalances } from "@/utils/hooks/useSyncBalances";
import CurrencySelectPopover from "@/components/global/CurrencySelectPopover";
import { setReduxSelectedCurrency, setReduxSelectedCurrencyValue } from "@/utils/redux/balances/balances.slice";

interface UserData {
  data: {
    user: User;
  };
}
export const HeroSection = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  const handleCurrencySelect = (currency: string, value: number) => {
    dispatch(setReduxSelectedCurrency(currency));
    dispatch(setReduxSelectedCurrencyValue(value));
    handlePopoverClose();
  };


  const { signInWithSocial, authStatus, user, loading } = useAuthSession();

  const { exchange, multiplicationFactor } = useSyncBalances();

  const currency = useAppSelector((state) => state.balances.selectedCurrency);
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
          <Button
            className="bg-black border border-1 border-amber-300 text-amber-300 w-fit font-black text-sm p-2 cursor-pointer hover:bg-amber-300 hover:text-black"
            variant="outlined"
            aria-describedby={id}
            onClick={handleClick}
          >
            1 TMD === {multiplicationFactor} {currency}
          </Button>
        </div>
      </div>
      <CurrencySelectPopover
        popoverProps={{ id, open, anchorEl, onClose: handlePopoverClose }}
        handleCurrencySelect={handleCurrencySelect}
      />
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
