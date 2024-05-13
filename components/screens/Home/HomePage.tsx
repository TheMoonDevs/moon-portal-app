"use client";

import { useUser } from "@/utils/hooks/useUser";
import { ActionsSection } from "./ActionsSection";
import { DailySection } from "./DailySection";
import { ProfileSection } from "./ProfileSection";
import { USERTYPE } from "@prisma/client";
import { LoaderScreen } from "@/components/elements/Loaders";
import { MoodTabs } from "./MoodTabs";
import { useEffect, useState } from "react";
import { StartSection } from "./StartSection";
import { HomeTabs } from "@/utils/@types/enums";
import { ButtonBoard } from "./ButtonBoard";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { useRouter } from "next/navigation";
import { InWorkSection } from "./InWorkSection";
import { InPlanSection } from "./InPlanSection";
import PWAUpdate from "../Login/PWAUpdate";

const MemberHomePage = () => {
  const { user } = useUser();
  const [tab, setTab] = useState(HomeTabs.START);

  if (!user) return <LoaderScreen />;
  return (
    <div className='home_bg min-h-screen flex justify-start max-md:flex-col max-lg:flex-col scroll-smooth'>
      <div className='lg:w-[34%]'>
        <ProfileSection user={user} />
        <DailySection user={user} />
        <ButtonBoard />
        <MoodTabs user={user} setTab={setTab} />
      </div>
      <div className="w-full my-3 max-md:my-0">
        {tab === HomeTabs.START && <StartSection />}
        {tab === HomeTabs.CHARGING && <ActionsSection />}
        <InWorkSection visible={tab === HomeTabs.INWORK} />
        <InPlanSection visible={tab === HomeTabs.PLANUP} />
      </div>
        <div className="h-[300px]"></div>
        <PWAUpdate/>
    </div>
  );
};

const ClientHomePage = () => {
  const { user } = useUser();

  if (!user) return <LoaderScreen />;

  return (
    <div className="home_bg min-h-screen">
      <ProfileSection user={user} />
      <DailySection user={user} />
      <div className="h-[300px]"></div>
    </div>
  );
};

export const HomePage = () => {
  const { user } = useUser();
  const router = useRouter();

  if (!user) return <LoaderScreen />;
  if (user.userType == USERTYPE.MEMBER) {
    return <MemberHomePage />;
  }
  if (user.userType == USERTYPE.CLIENT) {
    return <ClientHomePage />;
  }
  return (
    <div className="home_bg min-h-screen">
      <ProfileSection user={user} />
      <div className="h-[300px]"></div>
    </div>
  );
};
