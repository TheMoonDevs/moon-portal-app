"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { APP_ROUTES, LOCAL_STORAGE } from "@/utils/constants/appInfo";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { JsonObject } from "@prisma/client/runtime/library";
import { INotification } from "@/components/screens/notifications/NotificationsList";
import { useUser } from "@/utils/hooks/useUser";
import DownloadCoinbase from "@/components/screens/Members/WalletOnboarding/Steps/DownloadCoinbase";
import CopyWalletAddress from "@/components/screens/Members/WalletOnboarding/Steps/CopyWalletAddress";
import UploadWalletAddress from "@/components/screens/Members/WalletOnboarding/Steps/UploadWalletAddress";
import { isValidEthAddress } from "@/utils/helpers/functions";
import { toast, Toaster } from "sonner";
import { useAppSelector } from "@/utils/redux/store";

const CreateWallet = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { user, refetchUser } = useUser();
  const router = useRouter();
  const notifications = useAppSelector(
    (state) => state.notifications.notifications
  );
  useEffect(() => {
    if (!user?.payData) refetchUser();
  }, []);
  const walletNotification = notifications.find(
    (notification) =>
      (notification as INotification).matchId ===
      `${user?.id}_onboard_walletAddress`
  ) as INotification | undefined;

  const payDataTemplate = {
    upiId: "",
    payMethod: "Crypto",
    stipendWalletAddress: "",
    walletAddress: "",
  };

  const handleNextStep = async (walletAddress?: string) => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    if (!walletAddress) return;
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
        userPayData.walletAddress === walletAddress &&
        isValidEthAddress(walletAddress)
      ) {
        toast.info("This wallet address is already set.");
        return;
      }

      const updatedUser = await updateUserWalletAddress(
        walletAddress,
        userPayData
      );
      localStorage.setItem(LOCAL_STORAGE.user, JSON.stringify(updatedUser));

      await updateWalletNotification();
      toast.success(
        "Wallet address updated successfully! Redirecting to home..."
      );
      setTimeout(() => router.push(APP_ROUTES.home), 3000);
    } catch (error) {
      toast.error("Error updating wallet address.");
    } finally {
      setLoading(false);
    }
  };

  async function updateUserWalletAddress(
    walletAddress: string,
    userPayData: JsonObject
  ) {
    const response = await PortalSdk.putData("/api/user", {
      id: user?.id,
      payData: { ...userPayData, walletAddress },
    });
    // console.log("API response:", response.data.user);
    return response.data.user;
  }

  async function updateWalletNotification() {
    if (walletNotification && !walletNotification.notificationData.actionDone) {
      await PortalSdk.putData("/api/notifications/update", {
        ...walletNotification,
        description: "Wallet address successfully updated.",
        notificationData: {
          ...walletNotification.notificationData,
          actionDone: true,
        },
      });
    }
  }

  return (
    <>
      <div className="bg-neutral-900 h-screen flex flex-col items-center justify-center relative">
        <div className="absolute top-10 left-10 max-sm:top-5 max-sm:left-5 z-20 flex items-center gap-2">
          <div
            onClick={() => {
              if (step > 1) {
                setStep(step - 1);
              } else router.back();
            }}
            className=" bg-gray-700 text-white px-2 py-2 rounded-full  cursor-pointer flex justify-center items-center "
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </div>
          <span className="text-white">Step {step}/3</span>
        </div>
        {step === 1 && (
          <DownloadCoinbase onNext={() => handleNextStep()} step={step} />
        )}
        {step === 2 && (
          <CopyWalletAddress onNext={() => handleNextStep()} step={step} />
        )}
        {step === 3 && (
          <UploadWalletAddress
            onNext={(walletAddress) => handleNextStep(walletAddress)}
            loading={loading}
            step={step}
          />
        )}
      </div>
      <Toaster richColors duration={3000} closeButton position="bottom-left" />
    </>
  );
};

export default CreateWallet;
