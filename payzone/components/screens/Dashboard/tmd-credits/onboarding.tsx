"use client";
import { useAuthSession } from "@/utils/hooks/useAuthSession";
import { IconButton, Modal } from "@mui/material";
import React, { useEffect, useState } from "react";
import { BlueCreateWalletButton } from "./BlueCreateWalletButton";
import { isValidEthAddress } from "@/utils/helpers/HelperFunctions";
import { toast } from "sonner";
import { MyServerApi, SERVER_API_ENDPOINTS } from "@/utils/service/MyServerApi";
import { JsonObject } from "@prisma/client/runtime/library";
import { setUser } from "@/utils/redux/auth/auth.slice";
import { useDispatch } from "react-redux";
import { useAppSelector } from "@/utils/redux/store";
import { updateWalletAddress } from "@/utils/redux/auth/auth.slice";
import { useAccount } from "wagmi";
import Image from "next/image";

const OnboardingModal = ({
  showOnboarding,
  handleOnboardingClose,
}: {
  showOnboarding: boolean;
  handleOnboardingClose: () => void;
}) => {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const [walletAdd, setWalletAdd] = useState<string>("");
  const payDataTemplate = {
    upiId: "",
    payMethod: "Crypto",
    stipendWalletAddress: "",
    walletAddress: "",
  };

  const [loading, setLoading] = useState<boolean>(false);

  const { connector, address } = useAccount();
  const isCoinbaseConnection = connector?.id === "coinbaseWalletSDK";

  const userWalletAddress = useAppSelector((state) => state.auth.address);

  const handleWalletAdd = async () => {
    if (!walletAdd && !isCoinbaseConnection) {
      toast.error("Please give a wallet address");
      return;
    }
    if (!isValidEthAddress(walletAdd) && !isCoinbaseConnection) {
      toast.error("Wallet Address is invalid");
      return;
    }
    setLoading(true);
    try {
      const userPayData = user?.payData
        ? (user?.payData as JsonObject)
        : payDataTemplate;
      if (!userPayData) {
        toast.error("User PayData is not available !!");
        return;
      }
      if (
        userPayData.walletAddress === walletAdd &&
        isValidEthAddress(walletAdd)
      ) {
        toast.info("This wallet address is already set.");
        return;
      }
      const res: any = await MyServerApi.updateData(
        SERVER_API_ENDPOINTS.updateUser + user?.id,
        {
          payData: {
            ...userPayData,
            walletAddress: isCoinbaseConnection ? address : walletAdd,
          },
          updatedAt: user?.updatedAt,
        }
      );
      // Update the user in Redux store
      dispatch(setUser(res.data.user));
      dispatch(
        updateWalletAddress(
          (isCoinbaseConnection ? address : walletAdd) as string
        )
      );

      toast.success("Wallet address updated successfully!");
      handleOnboardingClose();
    } catch (error) {
      toast.error("Error updating wallet address.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!showOnboarding) return;
    if (!isCoinbaseConnection) return;
    if (userWalletAddress) return;
    if (!address) return;
    setWalletAdd(address);
    handleWalletAdd();
  }, [isCoinbaseConnection, address]);

  return (
    <Modal
      open={showOnboarding}
      onClose={handleOnboardingClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <section className="w-screen h-screen flex justify-center items-center backdrop-blur-sm bg-black/50">
        <div className="text-white bg-black flex flex-col md:w-1/3 w-1/2 px-8 py-12 rounded-[64px] gap-12 relative">
          <span className="self-center">
            <Image
              src={"/logo/onboardingtitle.svg"}
              alt={"Onboarding"}
              height={48}
              width={300}
            />
          </span>
          <span className="absolute right-5 top-10 w-10 h-10 self-center">
            <IconButton onClick={handleOnboardingClose}>
              <CloseIcon width={24} height={24} color="white" />
            </IconButton>
          </span>
          <div className="text-white/50 space-y-4">
            <h1>Hello {user?.name},</h1>
            <p>
              Welcome to The Moon Devs Team, Please take a minute to add your
              wallet address, if this is your first time into blockchain/crypto.
              We suggest you to create a smart wallet.
            </p>
          </div>
          <div className="flex flex-col items-center text-xl gap-4">
            <BlueCreateWalletButton customtailwind="w-full !py-2" />
            <span className="text-white/50 font-light">OR</span>
            <div className="w-full flex border border-white/50 rounded-xl">
              <input
                type="text"
                value={walletAdd}
                onChange={(e) => setWalletAdd(e.target.value)}
                placeholder="Enter Your Wallet Address"
                className="outline-none w-full rounded-xl bg-black px-4 py-2"
              />
              <button
                className="rounded-xl bg-[#FFEA2F] text-black px-8 py-2"
                onClick={handleWalletAdd}
              >
                SAVE
              </button>
            </div>
          </div>
        </div>
      </section>
    </Modal>
  );
};

const CloseIcon = ({ width = 512, height = 512, color = "currentColor" }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M443.6,387.1L312.4,255.4l131.5-130c5.4-5.4,5.4-14.2,0-19.6l-37.4-37.6c-2.6-2.6-6.1-4-9.8-4c-3.7,0-7.2,1.5-9.8,4
          L256,197.8L124.9,68.3c-2.6-2.6-6.1-4-9.8-4c-3.7,0-7.2,1.5-9.8,4L68,105.9c-5.4,5.4-5.4,14.2,0,19.6l131.5,130L68.4,387.1
          c-2.6,2.6-4.1,6.1-4.1,9.8c0,3.7,1.4,7.2,4.1,9.8l37.4,37.6c2.7,2.7,6.2,4.1,9.8,4.1c3.5,0,7.1-1.3,9.8-4.1L256,313.1l130.7,131.1
          c2.7,2.7,6.2,4.1,9.8,4.1c3.5,0,7.1-1.3,9.8-4.1l37.4-37.6c2.6-2.6,4.1-6.1,4.1-9.8C447.7,393.2,446.2,389.7,443.6,387.1z"
        fill={color}
      />
    </svg>
  );
};

export default OnboardingModal;
