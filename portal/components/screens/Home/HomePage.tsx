'use client';

import { useUser } from '@/utils/hooks/useUser';
import { ActionsSection } from './ActionsSection';
import { DailySection } from './DailySection';
import { ProfileSection } from './ProfileSection';
import { USERTYPE } from '@prisma/client';
import { LoaderScreen } from '@/components/elements/Loaders';
import { MoodTabs } from './MoodTabs';
import { useEffect, useState } from 'react';
import { StartSection } from './StartSection';
import { HomeTabs } from '@/utils/@types/enums';
import { ButtonBoard } from './ButtonBoard';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useRouter } from 'next/navigation';
import { InWorkSection } from './InWorkSection';
import { InPlanSection } from './InPlanSection';
import { USERROLE } from '@prisma/client';
import media from '@/styles/media';
import { useMediaQuery } from '@mui/material';
import { CoreTeamSection } from './CoreTeamSection';
import { RootState, useAppDispatch, useAppSelector } from '@/utils/redux/store';
import Link from 'next/link';
import Events from './Events';

import { Toaster } from 'sonner';

const FocusMode = () => (
  <div className="flex w-full flex-col">
    <h4 className="px-4 text-lg font-bold">In Progress Today </h4>
    <InWorkSection visible={true} />
    <Link
      className="mx-4 mt-3 self-stretch rounded-md bg-green-500 px-[30px] py-3 text-center text-sm font-bold uppercase tracking-[4px] text-white hover:bg-green-400"
      href={APP_ROUTES.userWorklogs}
    >
      <span>Enter &nbsp; Focus &nbsp; Mode</span>
    </Link>
  </div>
);
const MemberHomePage = () => {
  const { user } = useUser();
  const [tab, setTab] = useState(HomeTabs.START);
  const isTabletOrMore = useMediaQuery(media.moreTablet);
  const coreTeam = useAppSelector(
    (state: RootState) => state.coreTeam.trialCandidates,
  );
  const hasTrialCandidates = coreTeam?.length > 0;
  if (!user) return <LoaderScreen />;
  return (
    <div className="home_bg flex min-h-screen justify-start scroll-smooth bg-white max-lg:flex-col max-md:flex-col md:pl-4">
      <div className="lg:w-[34%]">
        <ProfileSection user={user} />
        <DailySection user={user} />
        <ButtonBoard />
        <div className="flex w-full flex-col pb-8 pt-3 md:pb-0 md:pt-0">
          {!isTabletOrMore && <FocusMode />}
        </div>
        <StartSection />
      </div>
      <div className="grid w-full grid-cols-3 max-sm:grid-cols-1">
        <div className="pt-8">
          <h4 className="px-4 text-lg font-bold">Shortcuts & Utils</h4>
          <ActionsSection />
        </div>
        <div className="flex w-full flex-col pt-8">
          {isTabletOrMore && <FocusMode />}
          {/* <h4 className="text-lg font-bold mt-8 px-4">
              Todo&apos;s for Tomorrow{" "}
            </h4>
            <InPlanSection visible={true} /> */}
          <div className="">
            <Events />
          </div>
        </div>
        <div className="pt-8">
          <h4 className="px-4 text-lg font-bold">Core Team Leaderboard</h4>
          <CoreTeamSection key="coreteam" userRoles={USERROLE.CORETEAM} />
          {hasTrialCandidates && (
            <>
              <h4 className="px-4 text-lg font-bold">
                In Trial Members Leaderboard
              </h4>
              <CoreTeamSection
                key="trialteam"
                userRoles={USERROLE.TRIAL_CANDIDATE}
              />
            </>
          )}
        </div>
      </div>
      <div className="h-[300px]"></div>
      <Toaster />
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
function usePassphrase(): {
  showModal: any;
  setShowModal: any;
  modalMode: any;
  handleSetPassphrase: any;
  handleVerifyPassphrase: any;
} {
  throw new Error('Function not implemented.');
}
