'use client';

import { useUser } from '@/utils/hooks/useUser';
import { ActionsSection } from './ActionsSection';
import { DailySection } from './DailySection';
import { ProfileSection } from './ProfileSection';
import {
  ClientUtilityLink,
  Engagement,
  User,
  USERTYPE,
  WorkLogs,
} from '@prisma/client';
import { LoaderScreen, Spinner } from '@/components/elements/Loaders';
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
import { PortalSdk } from '@/utils/services/PortalSdk';
import dayjs from 'dayjs';
import { MdxAppEditor } from '@/utils/configure/MdxAppEditor';
import ToolTip from '@/components/elements/ToolTip';

const FocusMode = () => (
  <div className="mt-4 flex w-full flex-col-reverse gap-6 md:mt-0 md:flex-col">
    <div>
      <h4 className="px-4 text-lg font-bold">In Progress Today </h4>
      <InWorkSection visible={true} />
    </div>
    <Link
      className="mx-4 self-stretch rounded-md bg-green-500 px-[30px] py-3 text-center text-sm font-bold uppercase tracking-[4px] text-white hover:bg-green-400"
      href={APP_ROUTES.userWorklogs}
    >
      <span className="select-none md:mb-0">
        Enter &nbsp; Focus &nbsp; Mode
      </span>
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
        <div className="flex w-full flex-col pb-2 pt-3 md:pb-0 md:pt-0">
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
  const [shortcuts, setShortcuts] = useState<ClientUtilityLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [engagementDevelopers, setEngagementDevelopers] = useState<User[]>([]);
  const [isDevTeamLoading, setIsDevTeamLoading] = useState(true);
  const [isEngagementLoading, setIsEngagementLoading] = useState(true);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [expandedEngagement, setExpandedEngagement] = useState<Engagement>();
  const [worklogs, setWorklogs] = useState<WorkLogs[]>([]);
  const [isWorklogsLoading, setIsWorklogsLoading] = useState(true);
  const date = dayjs().format('YYYY-MM-DD');

  const fetchWorklogs = async () => {
    setIsWorklogsLoading(true);
    try {
      const res = await PortalSdk.getData(
        `/api/engagement/worklogs?engagementId=${expandedEngagement?.id}&date=${date}`,
        null,
      );
      setWorklogs(res.data.workLogs);
    } catch (error) {
      console.log(error);
    }
    setIsWorklogsLoading(false);
  };
  useEffect(() => {
    if (engagements.length !== 0) {
      setExpandedEngagement(engagements[0]);
    }
  }, [engagements]);

  useEffect(() => {
    if (expandedEngagement) {
      fetchWorklogs();
    }
  }, [expandedEngagement]);

  const fetchActiveEngageements = async () => {
    setIsEngagementLoading(true);
    try {
      const res = await PortalSdk.getData(
        `/api/engagement?clientId=${user?.id}&isActive=true`,
        null,
      );
      setEngagements(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setIsEngagementLoading(false);
    }
  };

  const fetchEngagementDevelopers = async () => {
    setIsDevTeamLoading(true);
    try {
      const res = await PortalSdk.getData(
        `/api/engagement/developers?clientId=${user?.id}`,
        null,
      );
      setEngagementDevelopers(res.data);
    } catch (error) {
      console.error('Error fetching developers:', error);
    } finally {
      setIsDevTeamLoading(false);
    }
  };

  const fetchShortcuts = async () => {
    try {
      const res = await PortalSdk.getData(
        `/api/client-shortcuts/${user?.id}`,
        null,
      );
      setShortcuts(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShortcuts();
    fetchEngagementDevelopers();
    fetchActiveEngageements();
  }, []);

  if (!user) return <LoaderScreen />;

  const handleEngagementClick = (eng: Engagement) => {
    setExpandedEngagement((prev) => (prev?.id === eng.id ? undefined : eng));
  };

  return (
    <div className="home_bg flex min-h-screen justify-start scroll-smooth bg-white max-lg:flex-col max-md:flex-col md:pl-4">
      <div className="w-1/2">
        <ProfileSection user={user} />
        <DailySection user={user} />
        <div className="h-[300px]"></div>
      </div>
      <div className="flex w-1/2 flex-col pt-8">
        <h4 className="px-4 text-lg font-bold">Shortcuts & Utils</h4>
        <div className="">
          {loading ? (
            <div className="mt-6 flex h-[350px] w-full items-center justify-center rounded-[1.15em] border border-neutral-200">
              <Spinner />
            </div>
          ) : (
            <div className="mx-3 mt-6 flex flex-col gap-3 overflow-hidden rounded-[1.15em] border border-neutral-400">
              <div className="flex flex-col">
                {/* Hardcoded links */}
                <Link
                  href="https://www.example.com"
                  target="_blank"
                  className=""
                >
                  <div className="flex flex-row items-center gap-4 border-b border-neutral-200 bg-white px-5 py-3 text-xl hover:bg-white/70">
                    <span className="material-symbols-outlined ml-[-5px] mr-[-5px] rounded-full object-contain object-center">
                      link
                    </span>
                    <p className="font-regular mb-0 text-[0.75em]">
                      Example Hardcoded Link
                    </p>
                    <span className="icon_size material-symbols-outlined ml-auto text-neutral-800">
                      chevron_right
                    </span>
                  </div>
                </Link>

                {/* fetched links */}
                {shortcuts.map((shortcut) => {
                  return (
                    <Link key={shortcut.id} href={shortcut.url} target="_blank">
                      <div className="flex flex-row items-center gap-4 border-b border-neutral-200 bg-white px-5 py-3 text-xl hover:bg-white/70">
                        {!shortcut.icon ? (
                          <span className="material-symbols-outlined ml-[-5px] mr-[-5px] rounded-full object-contain object-center">
                            link
                          </span>
                        ) : (
                          <p className="ml-[-5px] mr-[-5px] rounded-full object-contain object-center text-2xl">
                            {shortcut.icon}
                          </p>
                        )}
                        <p className="font-regular mb-0 text-[0.75em]">
                          {shortcut.title}
                        </p>
                        <span className="icon_size material-symbols-outlined ml-auto text-neutral-800">
                          {shortcut.url
                            ? 'chevron_right'
                            : 'history_toggle_off'}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex w-1/2 flex-col pt-8">
        <div className="flex w-full flex-col">
          <h4 className="px-4 text-lg font-bold">In Progress Today </h4>
          {isEngagementLoading ? (
            <div className="flex h-[350px] items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="m-4 mt-6 flex max-h-[90vh] flex-col gap-1 rounded-xl">
                {engagements.map((eng) => {
                  return (
                    <div>
                      <div
                        onClick={() => handleEngagementClick(eng)}
                        key={eng.id}
                        className={`flex cursor-pointer flex-col items-center justify-between rounded-lg shadow-sm ${
                          expandedEngagement?.id === eng.id
                            ? 'bg-gray-50'
                            : 'bg-white'
                        }`}
                      >
                        <div
                          className={`flex w-full cursor-pointer flex-row items-center justify-between rounded-lg ${expandedEngagement ? 'border-t' : 'border'} border-neutral-300 p-4 shadow-sm`}
                        >
                          <p className="text-sm font-medium text-neutral-900">
                            {eng.title}
                          </p>
                          <span className="material-symbols-outlined">
                            {expandedEngagement?.id === eng.id
                              ? 'keyboard_arrow_up'
                              : 'keyboard_arrow_down'}
                          </span>
                        </div>
                        {expandedEngagement?.id === eng.id && (
                          <div
                            className={`max-h-[300px] w-full overflow-y-auto rounded-lg p-4 shadow-sm transition-all duration-300 ease-in-out ${
                              expandedEngagement?.id === eng.id
                                ? 'max-h-[300px] opacity-100'
                                : 'max-h-0 opacity-0'
                            }`}
                          >
                            <div className="flex flex-col">
                              <h5 className="text-md my-1 font-semibold">
                                {expandedEngagement.title} Worklogs
                              </h5>
                              {isWorklogsLoading ? (
                                <div className="mt-2 text-sm font-normal text-neutral-400">
                                  Loading Worklogs...
                                </div>
                              ) : worklogs.length > 0 ? (
                                <div className="mt-2 text-sm font-normal text-neutral-400">
                                  {worklogs.map((workLog) => {
                                    return (
                                      <div key={workLog.id}>
                                        {workLog.works?.map((work) => {
                                          return (
                                            <div
                                              key={workLog.id}
                                              className="rounded-lg bg-transparent px-0"
                                            >
                                              <h1 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[1.5px] text-gray-800">
                                                {engagementDevelopers
                                                  .filter(
                                                    (user) =>
                                                      user.id ===
                                                      workLog.userId,
                                                  )
                                                  .map((user) => (
                                                    <div
                                                      key={user.id}
                                                      className="flex items-center gap-2"
                                                    >
                                                      <img
                                                        src={
                                                          user.avatar ||
                                                          '/images/avatar.png'
                                                        }
                                                        alt={user.name || ''}
                                                        className="h-7 w-7 cursor-pointer rounded-full object-cover"
                                                      />
                                                      <span>{user.name}</span>
                                                    </div>
                                                  ))}
                                              </h1>

                                              <MdxAppEditor
                                                readOnly
                                                markdown={
                                                  typeof work === 'object' &&
                                                  work !== null &&
                                                  'content' in work
                                                    ? ((work.content as string) ??
                                                      '')
                                                    : ''
                                                }
                                                contentEditableClassName="summary_mdx flex flex-col gap-4 z-1 mb-[-20px] !py-0 ml-3"
                                                editorKey={'engagement-mdx'}
                                                className="z-1"
                                              />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="flex h-full items-center justify-center py-6">
                                  <p className="text-neutral-500">
                                    {isWorklogsLoading
                                      ? 'Loading work logs...'
                                      : loading
                                        ? 'Loading engagements...'
                                        : worklogs.length === 0 &&
                                          'No work logs found'}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className=""></div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link
                className="mx-4 mt-3 self-stretch rounded-md bg-green-500 px-[30px] py-3 text-center text-sm font-bold uppercase tracking-[4px] text-white hover:bg-green-400"
                href={'/'}
              >
                <span className="select-none">Engagement &nbsp; Details</span>
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="flex w-1/2 flex-col pt-8">
        <h4 className="text-lg font-bold">Your Team</h4>

        {isDevTeamLoading ? (
          <div className="mt-6 flex h-[350px] w-full items-center justify-center rounded-[1.15em] border border-neutral-200">
            <Spinner />
          </div>
        ) : (
          <div className="flex w-full flex-col">
            <section className="m-4 mt-6 overflow-hidden rounded-xl border-neutral-400 bg-white px-0 shadow-md">
              <div className="flex flex-col items-stretch justify-center">
                {engagementDevelopers.map((dev) => {
                  return (
                    <div
                      key={dev.id}
                      className="flex cursor-pointer flex-row items-center justify-between gap-1 border-b border-neutral-200 px-2 py-3 hover:bg-black/5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="rounded-full bg-neutral-400">
                          <img
                            src={
                              dev?.avatar ||
                              `https://via.placeholder.com/150?text=${
                                dev?.name?.charAt(0) || 'U'
                              }`
                            }
                            alt={dev?.name?.charAt(0) || ''}
                            className="h-8 w-8 rounded-full object-cover object-center"
                          />
                        </div>
                        <div className="text-left">
                          <p className="line-clamp-1 text-sm font-semibold text-neutral-900">
                            {dev.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <span className="rounded-lg border p-2 text-[8px]">
                          {dev.vertical && dev.vertical?.length > 2
                            ? dev.vertical?.substring(0, 3).toUpperCase()
                            : dev.vertical}
                        </span>
                      </div>
                    </div>
                  );
                })}{' '}
              </div>
            </section>
          </div>
        )}
      </div>
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
