"use client";
import "./HeroSection.style.css";
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
import { useEffect, useState } from "react";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useSyncBalances } from "@/utils/hooks/useSyncBalances";
import CurrencyModal from "@/components/global/CurrencyModal";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
interface UserData {
  data: {
    user: User;
  };
}
export const HeroSection = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] =
    useState<boolean>(false);

  const { signInWithSocial, authStatus, user, loading } = useAuthSession();

  const { exchange, multiplicationFactor } = useSyncBalances();

  const currency = useAppSelector((state) => state.balances.selectedCurrency);
  const [setMember, isSetMember] = useState<boolean>(false);
  const [setClient, isSetClient] = useState<boolean>(false);
  const handleClickMember = () => {
    isSetMember(true);
    isSetClient(false);
  };
  const handleClickClient = () => {
    isSetMember(false);
    isSetClient(true);
  };
  return (
    <section
      className={`overflow-hidden text-white/50 ${
        setMember || setClient ? "mt-28" : "mt-2"
      } `}
    >
      {setMember || setClient ? (
        <div className="w-full flex items-center justify-center">
          {setMember && (
            <div
              className={`flex flex-col items-center justify-center ${
                setMember === true ? " opacity-100 " : " opacity-0 "
              } `}
            >
              <HeroText title="Ad Astra per Aspera" />
              <button
                className="button_Animation flex items-center justify-center gap-5 mt-28 px-14 py-3 border-borderGrey border-[1px]"
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
                <div
                  className="bg-black border border-1 border-amber-300 text-amber-300 w-fit font-black text-sm p-2 cursor-pointer hover:bg-amber-300 hover:text-black"
                  onClick={() => setIsCurrencyModalOpen(true)}
                >
                  1 TMD === {multiplicationFactor} {currency}
                </div>
              </div>
            </div>
          )}
          {setClient && (
            <div
              className={`flex flex-col items-center justify-center ${
                setClient === true ? " opacity-100 " : " opacity-0 "
              } `}
            >
              <HeroText title="Ad Astra per Client" />
              <button
                className="button_Animation flex items-center justify-center gap-5 mt-28 px-14 py-3 border-borderGrey border-[1px]"
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
                <div
                  className="bg-black border border-1 border-amber-300 text-amber-300 w-fit font-black text-sm p-2 cursor-pointer hover:bg-amber-300 hover:text-black"
                  onClick={() => setIsCurrencyModalOpen(true)}
                >
                  1 TMD === {multiplicationFactor} {currency}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full lg:h-screen flex flex-col lg:flex-row items-center sm:items-start justify-center cursor-pointer opacity-100  ">
          {/* Member Tab section */}
          <div
            className="w-full h-full flex flex-col items-end justify-start pr-0 sm:pr-8 pt-20 sm:pt-40 lg:pt-56 group "
            onClick={handleClickMember}
          >
            <div className="w-96 max-w-xl space-y-16 flex flex-col items-end">
              <div className="w-max flex items-center justify-center gap-x-6 sm:gap-x-12">
                <span>
                  <ArrowBackIcon className="text-5xl duration-200 group-hover:text-white" />
                </span>
                <span className=" tracking-widest sm:tracking-[1.2rem] text-5xl font-roboto normal-case group-hover:tracking-[1.45rem] group-hover:text-white duration-200 ease-in">
                  Member
                </span>
              </div>
              <p className="pl-12 text-lg font-roboto normal-case text-right leading-tight duration-200 group-hover:text-white">
                Welcome to the Pay Zone, where you can access all your Payments,
                Merits, Certificates, Rewards, Perks, and Benefits all in one
                place,
              </p>
            </div>
          </div>
          <div className="w-[2px] h-72 bg-white mt-52 hidden lg:block "></div>
          {/* Client Tab section */}
          <div
            className="w-full h-full flex flex-col items-start justify-start pl-0 sm:pl-8 pt-20 sm:pt-40 lg:pt-56 group "
            onClick={handleClickClient}
          >
            <div className="w-96 max-w-xl space-y-16 flex flex-col items-start">
              <div className="w-max flex items-start justify-start gap-x-6 sm:gap-x-12">
                <span className=" tracking-widest sm:tracking-[1.2rem] group-hover:tracking-[1.45rem] text-5xl font-roboto normal-case duration-200 group-hover:text-white">
                  Client
                </span>
                <span>
                  <ArrowBackIcon className="text-5xl rotate-180 duration-200 group-hover:text-white" />
                </span>
              </div>
              <p className="text-lg font-roboto normal-case text-left leading-tight pr-10 duration-200 group-hover:text-white">
                Welcome to the Pay Zone, where you can access all your Invoices,
                Discounts, Credits, Contract Agreements, and Payment History all
                in one place,
              </p>
            </div>
          </div>
        </div>
      )}

      <CurrencyModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
      />
      <Backdrop />
    </section>
  );
};

const HeroText = ({ title }: { title: string }) => {
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
        <p className="hero_text font-unica text-8xl typewritter ">
          {/* Ad Astra per Aspera */}
          {title}
        </p>
        <pre className="hero_text bottom_to_top delay-1s text-3xl opacity-50 font-light tracking-[0.2em]">
          through hardships to the stars
        </pre>
      </div>
      <p className="hero_text bottom_to_top delay-2s text-md w-[55%] text-center">
        TheMoonDevs is, was and will always be a meritocracy. Welcome to the the
        Payments Zone, where you can access all your Payments, Merits,
        Certificates, Rewards, Perks, and Benefits all in one place.
      </p>
    </>
  );
};
