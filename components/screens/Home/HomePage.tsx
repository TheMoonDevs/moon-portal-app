"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { GreyButton } from "@/components/elements/Button";
import { ProfileSection } from "./ProfileSection";
import { DailySection } from "./DailySection";
import { useUser } from "@/utils/hooks/useUser";
import { USERTYPE } from "@/utils/services/models/User";

export const HomePage = () => {
  const { user } = useUser(true);
  return (
    <div className="home_bg min-h-screen">
      <ProfileSection user={user} />
      {user.usertype == USERTYPE.MEMBER && <DailySection user={user} />}
    </div>
  );
};