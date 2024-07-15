"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { APP_ROUTES, LOCAL_STORAGE } from "@/utils/constants/appInfo";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { Snackbar, Alert } from "@mui/material";
import { JsonObject } from "@prisma/client/runtime/library";
import { useNotifications } from "@/utils/hooks/useNotifications";
import { INotification } from "@/components/screens/notifications/NotificationsList";
import { useUser } from "@/utils/hooks/useUser";
import DownloadCoinbase from "@/components/screens/Members/WalletOnboarding/Steps/DownloadCoinbase";
import CopyWalletAddress from "@/components/screens/Members/WalletOnboarding/Steps/CopyWalletAddress";
import UploadWalletAddress from "@/components/screens/Members/WalletOnboarding/Steps/UploadWalletAddress";
import { isValidEthAddress } from "@/utils/helpers/functions";
import { toast, Toaster } from "sonner";

const CreateWallet = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const router = useRouter();
  const { notifications } = useNotifications();

  const walletNotification = notifications.find(
    (notification) =>
      (notification as INotification).matchId ===
      `${user?.id}_onboard_walletAddress`
  ) as INotification | undefined;

  const handleNextStep = async (walletAddress?: string) => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    if (!walletAddress) return;

    setLoading(true);
    try {
      const userPayData = user?.payData as JsonObject;
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
      ...user,
      payData: { ...userPayData, walletAddress },
    });
    console.log("API response:", response.data.user);
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
      <div className="bg-neutral-900 h-screen flex items-center justify-center">
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
