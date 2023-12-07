"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { GreyButton } from "@/components/elements/Button";
import { ProfileSection } from "./ProfileSection";
import { DailySection } from "./DailySection";

export const HomePage = () => {
  return (
    <div className="home_bg min-h-screen">
      <ProfileSection />
      <DailySection />
    </div>
  );
};