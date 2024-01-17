"use client";

import { useUser } from "@/utils/hooks/useUser";
import { ActionsSection } from "./ActionsSection";
import { DailySection } from "./DailySection";
import { ProfileSection } from "./ProfileSection";
import { USERTYPE } from "@prisma/client";

export const HomePage = () => {
  const { user } = useUser(true);

  return (
    <div className="home_bg min-h-screen">
      <ProfileSection user={user} />
      {user.userType == USERTYPE.MEMBER && <DailySection user={user} />}
      {user.userType == USERTYPE.MEMBER && <ActionsSection />}
      <div className="h-[300px]"></div>
    </div>
  );
};
