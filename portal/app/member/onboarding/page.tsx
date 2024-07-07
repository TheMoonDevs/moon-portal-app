"use client";

import {OnboardingPage} from "@/components/screens/Members/OnboardingPage";
import { useUser } from "@/utils/hooks/useUser";
import { redirect } from "next/navigation";
import React from "react";

const OnboardingSignup = () => {
  const { user } = useUser();
  console.log("user", user);
  // if (user?.status !== "INACTIVE") redirect("/");
  // else {
  return (
    <main className="flex-col items-center gap-4 mt-10 justify-center">
      <h1 className="text-3xl font-semibold text-center">
        Member Onboarding Page
      </h1>
      <OnboardingPage />;
    </main>
  );
  // }
};

export default OnboardingSignup;
