"use client";

import { useUser } from "@/utils/hooks/useUser";
import { ActionsSection } from "./ActionsSection";
import { DailySection } from "./DailySection";
import { ProfileSection } from "./ProfileSection";
import { USERTYPE } from "@prisma/client";
import { LoaderScreen } from "@/components/elements/Loaders";
import { MoodTabs } from "./MoodTabs";
import { useState } from "react";
import { StartSection } from "./StartSection";
import { HomeTabs } from "@/utils/@types/enums";
import { ButtonBoard } from "./ButtonBoard";

const MemberHomePage = () => {
  const { user } = useUser();
  const [tab, setTab] = useState(HomeTabs.START);

  if (!user) return <LoaderScreen />;
  return (
    <div className="home_bg min-h-screen">
      <ProfileSection user={user} />
      <DailySection user={user} />
      <ButtonBoard />
      <MoodTabs user={user} setTab={setTab} />
      {tab === HomeTabs.START && <StartSection />}
      {tab === HomeTabs.ACTIONS && <ActionsSection />}
      <div className="h-[300px]"></div>
    </div>
  );
};

export const HomePage = () => {
  const { user } = useUser();
  if (!user) return <LoaderScreen />;
  if (user.userType == USERTYPE.MEMBER) {
    return <MemberHomePage />;
  }
  return (
    <div className="home_bg min-h-screen">
      <ProfileSection user={user} />
      <div className="h-[300px]"></div>
    </div>
  );
};
