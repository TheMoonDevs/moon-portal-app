"use client";
import Image from "next/image";
import { MobileBox } from "./Login";
import { useUser } from "@/utils/hooks/useUser";
import { Logout } from "./Logout";
import { usePassphrase } from "@/utils/hooks/usePassphrase"; // Assuming you have this hook

export const LogoutPage = () => {
  const { status, user, signOutUser } = useUser(false);
  const { localPassphrase } = usePassphrase(); // Get the passphrase from your hook

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
        </div>
        {status === "authenticated" && (
          <Logout
            user={user}
            signOut={signOutUser}
            passphrase={localPassphrase}
          />
        )}
      </MobileBox>
    </div>
  );
};
