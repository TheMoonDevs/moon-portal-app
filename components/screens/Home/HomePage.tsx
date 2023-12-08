"use client";

import { useUser } from "@/utils/hooks/useUser";
import { USERTYPE } from "@/utils/services/models/User";
import { ActionsSection } from "./ActionsSection";
import { DailySection } from "./DailySection";
import { ProfileSection } from "./ProfileSection";

export const HomePage = () => {
  const { user } = useUser(true);
  return (
    <div className="home_bg min-h-screen">
      <ProfileSection user={user} />
      {user.usertype == USERTYPE.MEMBER && <DailySection user={user} />}
      {user.usertype == USERTYPE.MEMBER && <ActionsSection user={user} />}
      <div className="h-[300px]"></div>
    </div>
  );
};