"use client";
import { useAuthSession } from "@/utils/hooks/useAuthSession";
import { useUser } from "@/utils/hooks/useUser";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { setGoogleVerificationEmail } from "../../../utils/redux/auth/auth.slice";
import { useAppDispatch } from "../../../utils/redux/store";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useState } from "react";
import { PortalSdk } from "@/utils/services/PortalSdk";

const GoogleVerifyPage = ({ signOutUser, setError, passcode }: any) => {
  const { user } = useUser();
  const router = useRouter();
  const fetchedUserEmail = user?.email;
  const dispatch = useAppDispatch();
  const { signInWithSocial } = useAuthSession();
  const [verificationFailed, setVerificationFailed] = useState<boolean>(false);
  const handleGoogleLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // const storedPasscode = localStorage.getItem("passcode");
    // const isVerifiedOnDevice = localStorage.getItem("isGoogleVerified");
    // if (isVerifiedOnDevice === "true" && storedPasscode === passcode) {
    //   router.push(APP_ROUTES.home);
    //   return;
    // }

    try {
      const user = await signInWithSocial();
      if (!user || !user.email) throw new Error("User email is empty");
      const email = user.email;

      if (email === fetchedUserEmail) {
        handleSuccessfulVerification(email);
      } else {
        handleFailedVerification();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleFailedVerification = () => {
    // dispatch(setGoogleVerificationEmail(false));
    setVerificationFailed(true);
    let counter = 3;
    const intervalId = setInterval(() => {
      setError(`Email not verified!, Signing out in ${counter} seconds!`);
      counter--;
      if (counter < 0) {
        clearInterval(intervalId);
        signOutUser();
      }
    }, 1000);
  };

  const handleSuccessfulVerification = (verifiedEmail: string) => {
    dispatch(setGoogleVerificationEmail(verifiedEmail));

    // TODO: Update the googleData in the backend
    // PortalSdk.putData("/api/user", {

    // })
    // localStorage.setItem("isGoogleVerified", "true");
    // localStorage.setItem("passcode", passcode);
    router.push(APP_ROUTES.home);
  };

  return (
    <div>
      <button
        className="w-full flex flex-row justify-center items-center gap-[0.5rem] px-[1rem] py-[0.5rem] border-[#959595] rounded-[0.5rem] bg-[#fff] color-[#000] capitalize"
        onClick={handleGoogleLogin}
        disabled={verificationFailed}
      >
        <Image src="/icons/google.svg" alt="icon" width={20} height={20} />
        <span>Verify with Google</span>
      </button>
    </div>
  );
};

export default GoogleVerifyPage;
