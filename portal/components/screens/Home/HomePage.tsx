'use client';

import { useMediaQuery } from '@mui/material';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

import { LoaderScreen } from '@/components/elements/Loaders';
import media from '@/styles/media';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { CompaniesSection } from './CompaniesSection';
import { DailySection } from './DailySection';
import { InWorkSection } from './InWorkSection';
import { LeaderboardSection } from './LeaderboardSection';
import { ProfileSection } from './ProfileSection';
import { ProjectsSection } from './ProjectsSection';
import { StartSection } from './StartSection';
import { TasksSection } from './TasksSection';

const today = () => new Date().toISOString().split('T')[0];

// On mobile the focus button deep-links into today's worklog, which needs its id.
const useTodaysWorklogLink = () => {
  const { user } = useUser();
  const isMobile = useMediaQuery(media.largeMobile);
  const [workLogId, setWorkLogId] = useState<string | null>(null);

  useEffect(() => {
    if (!isMobile || !user?.id || workLogId) return;

    PortalSdk.getData(
      `/api/user/worklogs?date=${today()}&userId=${user.id}`,
      null,
    )
      .then((data) => setWorkLogId(data?.data?.workLogs?.[0]?.id ?? null))
      .catch((error) => console.error('Error fetching worklogs:', error));
  }, [isMobile, user?.id, workLogId]);

  if (!isMobile || !workLogId) return APP_ROUTES.userWorklogs;
  return `${APP_ROUTES.userWorklogs}/${workLogId}?logType=dayLog&date=${today()}`;
};

const FocusMode = () => {
  const link = useTodaysWorklogLink();

  return (
    <div className="mt-4 flex w-full flex-col-reverse gap-6 md:mt-0 md:flex-col">
      <div>
        <h4 className="px-4 text-lg font-bold">In Progress Today </h4>
        <InWorkSection visible={true} />
      </div>
      <Link
        className="mx-4 self-stretch rounded-md bg-green-500 px-[30px] py-3 text-center text-sm font-bold uppercase tracking-[4px] text-white hover:bg-green-400"
        href={link}
      >
        <span className="select-none md:mb-0">
          Enter &nbsp; Focus &nbsp; Mode
        </span>
      </Link>
    </div>
  );
};

export const HomePage = () => {
  const { user } = useUser();
  const isTabletOrMore = useMediaQuery(media.moreTablet);

  if (!user) return <LoaderScreen />;

  return (
    <div className="home_bg flex min-h-screen justify-start scroll-smooth bg-white max-lg:flex-col max-md:flex-col md:pl-4">
      <div className="lg:w-[34%]">
        <ProfileSection user={user} />
        <DailySection user={user} />
        <div className="flex w-full flex-col pb-2 pt-3 md:py-0">
          {!isTabletOrMore && <FocusMode />}
        </div>
        <StartSection />
      </div>
      <div className="grid w-full grid-cols-3 max-sm:grid-cols-1">
        <div className="pt-8">
          <CompaniesSection />
          <ProjectsSection />
          <TasksSection />
        </div>
        <div className="flex w-full flex-col pt-8">
          {isTabletOrMore && <FocusMode />}
        </div>
        <div className="pt-8">
          <LeaderboardSection />
        </div>
      </div>
      <div className="h-24 md:h-[300px]"></div>
      <Toaster />
    </div>
  );
};
