"use client";

import { IconFilter, MoonIcon } from "@/components/elements/Icon";
import media from "@/styles/media";
import { useMediaQuery } from "@mui/material";
import { useEffect, useRef, useState } from "react";

export enum InstallState {
  SPLASH = "SPLASH",
  INSTALL_CHECK = "INSTALL_CHECK",
}

export const usePWAInstall = () => {
  const deferredPrompt = useRef<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const isTabletAndMobile = useMediaQuery(
    media.tablet.replaceAll("@media ", "")
  );

  useEffect(() => {
    if (!isTabletAndMobile) return;
    const beforeInstallPromptListener = (e: any) => {
      // Prevents the default mini-infobar or install dialog from appearing on mobile
      e.preventDefault();
      // Save the event because you'll need to trigger it later.
      deferredPrompt.current = e;
      // Show your customized install prompt for your PWA
      // Your own UI doesn't have to be a single element, you
      // can have buttons in different locations, or wait to prompt
      // as part of a critical journey.
      //showInAppInstallPromotion();
      console.log("before install prompt", e);
      setIsInstallable(true);
    };
    const appInstalled = (e: any) => {
      console.log("app installed", e);
      setIsInstallable(false);
    };
    window.addEventListener("beforeinstallprompt", beforeInstallPromptListener);
    window.addEventListener("appinstalled", appInstalled);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        beforeInstallPromptListener
      );
      window.removeEventListener("appinstalled", appInstalled);
    };
  }, [isTabletAndMobile]);

  const installApp = async () => {
    deferredPrompt.current.prompt();
    // Find out whether the user confirmed the installation or not
    const { outcome } = await deferredPrompt.current.userChoice;
    // The deferredPrompt can only be used once.
    deferredPrompt.current = null;
    // Act on the user's choice
    if (outcome === "accepted") {
      return true;
      setIsInstallable(false);
      console.log("User accepted the install prompt.");
    } else if (outcome === "dismissed") {
      console.log("User dismissed the install prompt");
      setIsInstallable(false);
      return false;
    }
  };

  return {
    isInstallable: isInstallable && isTabletAndMobile,
    deferredPrompt,
    installApp,
  };
};

export const InstallButton = ({
  onInstallUpdate,
}: {
  onInstallUpdate: (isInstallable: boolean) => void;
}) => {
  const { installApp, isInstallable } = usePWAInstall();

  useEffect(() => {
    onInstallUpdate(isInstallable);
  }, [isInstallable, onInstallUpdate]);

  if (!isInstallable) return null;
  return (
    <div className="flex flex-col mb-5">
      <p className="mt-4 text-neutral-400 text-xs text-center mt-4">
        The Moon Devs Portal supports Progressive Web App, one of the latest
        trends in web development. Click quick install to experience the portal
        as an offline Mobile App.
      </p>
      <button
        onClick={installApp}
        className="text-lg text-white py-3 gap-4 flex flex-row items-center justify-center mt-4 bg-neutral-800 hover:bg-neutral-700 py-2 px-10 rounded-lg shadow-md"
      >
        <span className="material-icons text-yellow-500">bolt</span>
        Quick Install App
      </button>
      {/* <div className="mt-4 text-neutral-400 text-xs text-center mt-4">
        <a
          href="https://themooondevs.com"
          className="text-neutral-300 underline"
        >
          Ignore & Continue to web page
        </a>
      </div> */}
    </div>
  );
};
