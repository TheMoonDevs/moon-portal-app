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
import { Drawer, useMediaQuery } from '@mui/material';
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
      <span className="select-none">Enter &nbsp; Focus &nbsp; Mode</span>
    </Link>
  </div>
);
const CoreTeamAsSection = ({
  hasTrialCandidates,
}: {
  hasTrialCandidates: boolean;
}) => (
  <div>
    <h4 className="px-4 text-lg font-bold">Core Team Leaderboard</h4>
    <CoreTeamSection key="coreteam" userRoles={USERROLE.CORETEAM} />
    {hasTrialCandidates && (
      <>
        <h4 className="px-4 text-lg font-bold">In Trial Members Leaderboard</h4>
        <CoreTeamSection key="trialteam" userRoles={USERROLE.TRIAL_CANDIDATE} />
      </>
    )}
  </div>
);

export const CoreTeamSectionInDrawer = ({
  hasTrialCandidates,
  open,
  onClose,
}: {
  hasTrialCandidates: boolean;
  open: boolean;
  onClose: () => void;
}) => {
  const isMobile = useMediaQuery(media.largeMobile);
  return (
    <Drawer
      onClose={onClose}
      open={open}
      anchor="right"
      className="!w-full md:!w-1/2"
      sx={{
        '& .MuiDrawer-paper': {
          height: '100%',
          overflow: 'hidden',
          width: isMobile ? '100%' : '40%',
        },
      }}
    >
      <div className="group absolute right-3 top-4 w-10 cursor-pointer text-neutral-900 hover:text-neutral-700">
        <span
          className="material-icons !text-3xl group-hover:opacity-20 md:!text-2xl"
          onClick={onClose}
        >
          close_icon
        </span>
      </div>
      <CoreTeamAsSection hasTrialCandidates={hasTrialCandidates} />
    </Drawer>
  );
};
const MemberHomePage = () => {
  const { user } = useUser();
  const [tab, setTab] = useState(HomeTabs.START);
  const isTabletOrMore = useMediaQuery(media.moreTablet);
  const coreTeam = useAppSelector(
    (state: RootState) => state.coreTeam.trialCandidates,
  );
  const hasTrialCandidates = coreTeam?.length > 0;
  const [isCoreTeamDrawerOpen, setCoreTeamDrawerOpen] = useState(false);
  if (!user) return <LoaderScreen />;
  return (
    <div className="home_bg flex min-h-screen justify-start scroll-smooth bg-white max-lg:flex-col max-md:flex-col md:pl-4">
      <div className="lg:w-[34%]">
        <ProfileSection user={user} />
        <DailySection user={user} />
        <ButtonBoard
          isCoreTeamDrawerOpen={isCoreTeamDrawerOpen}
          setCoreTeamDrawerOpen={setCoreTeamDrawerOpen}
        />
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
        <div className="hidden pt-8 md:block">
          <CoreTeamAsSection hasTrialCandidates={hasTrialCandidates} />
        </div>
      </div>
      <div className="h-24 md:h-[300px]"></div>
      <Toaster />
      <CoreTeamSectionInDrawer
        onClose={() => setCoreTeamDrawerOpen(false)}
        hasTrialCandidates={hasTrialCandidates}
        open={isCoreTeamDrawerOpen}
      />
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
