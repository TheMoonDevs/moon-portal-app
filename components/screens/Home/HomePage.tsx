"use client";

import { useUser } from "@/utils/hooks/useUser";
import { ActionsSection } from "./ActionsSection";
import { DailySection } from "./DailySection";
import { ProfileSection } from "./ProfileSection";

export const HomePage = () => {
  const { user } = useUser(true);

  return (
    <div className="home_bg min-h-screen">
      <ProfileSection user={user} />
      {user.userType == "MEMBER" && <DailySection user={user} />}
      {user.userType == "MEMBER" && <ActionsSection />}
      <div className="h-[300px]"></div>
    </div>
  );
};
