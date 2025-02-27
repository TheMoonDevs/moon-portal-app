/* eslint-disable @next/next/no-img-element */
'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Drawer,
  Box,
  Fab,
  IconButton,
  useMediaQuery,
  Divider,
} from '@mui/material';
import { RootState, useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { useUser } from '@/utils/hooks/useUser';
import { User, USERROLE, USERVERTICAL, WorkLogs } from '@prisma/client';
import Link from 'next/link';
import { updateAvatarUrl } from '@/utils/redux/onboarding/onboarding.slice';
import {
  closeDrawer,
  updateMember,
  setEditModalOpen,
} from '@/utils/redux/coreTeam/coreTeam.slice';
import {
  addFilesToPreview,
  setUploadedFiles,
} from '@/utils/redux/filesUpload/fileUpload.slice';
import { FileWithPath } from '@mantine/dropzone';
import { WorklogSummaryView } from '../Worklogs/WorklogSummary/WorklogSummaryView';
import { PortalSdk } from '@/utils/services/PortalSdk';
import useAsyncState from '@/utils/hooks/useAsyncState';
import { LoadingSkeleton } from '@/components/elements/LoadingSkeleton';
import { APP_ROUTES, TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';
import { setReduxUser } from '@/utils/redux/auth/auth.slice';
import media from '@/styles/media';
import DrawerComponent from '@/components/elements/DrawerComponent';
import dayjs from 'dayjs';
import { ArrayHelper } from '@/utils/helpers/array';
import Image from 'next/image';
import ToolTip from '@/components/elements/ToolTip';
import ReactActivityCalendar from './ActivityCalendar';
import EditUser from './EditUser';
import { useTasks } from '@/utils/hooks/useTasks';
import { filterTasksByPerson } from '@/utils/clickup/helper';
import ClickupTask from '../Worklogs/WorklogTabs/ClickupTasks';
import EarnedBadges from './profile-drawer-components/EarnedBadges';
import { PayDataUI } from './profile-drawer-components/PayDataUI';
import { getBuffLevelAndTitle } from '@/utils/helpers/badges';

export interface LoggedInUser {
  user: User;
}

export interface PayData {
  walletAddress?: string;
  upiId?: string;
  stipendAmount?: string;
  stipendCurrency?: string;
  payMethod?: string;
  stipendWalletAddress?: string;
}

const roleImageMap: Record<USERROLE, string> = {
  CORETEAM: '/images/status/coreteam.jpeg',
  ASSOCIATE: '/images/status/associate.jpeg',
  FREELANCER: '/images/status/freelancer.jpeg',
  INTERN: '/images/status/intern.jpeg',
  TRIAL_CANDIDATE: '/images/status/trial.jpeg',
};

const verticalImageMap: Record<USERVERTICAL, string> = {
  DEV: '/images/roles/developer.jpeg',
  DESIGN: '/images/roles/Designer.jpeg',
  MARKETING: '/images/roles/marketing.jpeg',
  COMMUNITY: '/images/roles/community.jpeg',
  FINANCE: '/images/roles/finance.jpeg',
  LEGAL: '/images/roles/legal.jpeg',
  HR: '/images/roles/hr.jpeg',
  OPERATIONS: '/images/roles/operations.jpeg',
};

const getUserRoleImage = (role: USERROLE | null) =>
  role ? roleImageMap[role] || '/images/default.jpeg' : '/images/default.jpeg';

const getUserVerticalImage = (vertical: USERVERTICAL | null) =>
  vertical
    ? verticalImageMap[vertical] || '/images/default.jpeg'
    : '/images/default.jpeg';

const translateUserVertical = (vertical: string): string => {
  const verticalMap: { [key: string]: string } = {
    DEV: 'Developer',
    DESIGN: 'Designer',
    MARKETING: 'Marketing',
    COMMUNITY: 'Community Manager',
    FINANCE: 'Finance Specialist',
    LEGAL: 'Legal Specialist',
    HR: 'Human Resources',
    OPERATIONS: 'Operations',
  };
  return verticalMap[vertical] || 'Unknown Vertical';
};

const truncateAddress = (
  address: string | undefined,
  visibleChars: number = 4,
): string => {
  if (!address) return 'Not Available';
  if (address.length <= visibleChars * 2) return address;
  return `${address.slice(0, visibleChars)}...${address.slice(-visibleChars)}`;
};

export const UserProfileDrawer: React.FC = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(
    (state: RootState) => state.coreTeam.isDrawerOpen,
  );
  const selectedUser = useAppSelector(
    (state: RootState) => state.coreTeam.selectedMember,
  );
  const [avatarLoading, setAvatarLoading] = useState<boolean>(false);
  const [bannerLoading, setBannerLoading] = useState<boolean>(false);
  const loggedinUser = useUser() as LoggedInUser;
  const payData = loggedinUser?.user?.payData as PayData;
  const [worklogSummary, setWorklogSummary] = useState<WorkLogs[]>([]);
  const { loading, setLoading } = useAsyncState();
  const handleClose = () => {
    dispatch(closeDrawer());
  };

  const fetchWorklogData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await PortalSdk.getData(
        `/api/user/worklogs/summary?userId=${selectedUser?.id
        }&year=${dayjs().year()}&month=${dayjs()
          .month(dayjs().month())
          .format('MM')}`,
        null,
      );
      setWorklogSummary(response.data.workLogs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [setLoading, selectedUser?.id]);

  useEffect(() => {
    if (isOpen && selectedUser) {
      fetchWorklogData();
    }
  }, [fetchWorklogData, isOpen, selectedUser]);

  if (!selectedUser) return null;

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    fileType: 'avatar' | 'banner',
  ) => {
    const fileList = event.target.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      dispatch(addFilesToPreview([file as FileWithPath]));
      uploadFile(file as FileWithPath, fileType);
    }
  };

  const uploadFile = async (
    file: FileWithPath,
    fileType: 'avatar' | 'banner',
  ) => {
    fileType === 'avatar' ? setAvatarLoading(true) : setBannerLoading(true);
    const formData = new FormData();
    formData.append('file', file, file.path);
    if (loggedinUser) {
      formData.append('userId', loggedinUser.user.id);
    }
    formData.append(
      'folderName',
      fileType === 'avatar' ? 'userAvatars' : 'userBanners',
    );

    try {
      const response = await fetch('/api/upload/file-upload', {
        method: 'POST',
        body: formData,
        headers: {
          tmd_portal_api_key: TMD_PORTAL_API_KEY,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userResponse = await PortalSdk.putData('/api/user', {
          id: loggedinUser.user.id,
          [fileType]: data.fileInfo[0].fileUrl,
          updatedAt: loggedinUser?.user?.updatedAt,
        });

        console.log(userResponse);
        dispatch(setReduxUser(userResponse?.data?.user));
        dispatch(
          updateMember({
            ...selectedUser,
            [fileType]: data.fileInfo[0].fileUrl,
          }),
        );
        setUploadedFiles([data.fileInfo]);
      } else {
        fileType === 'avatar'
          ? setAvatarLoading(false)
          : setBannerLoading(false);
        console.error('Failed to upload file:', response.statusText);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      fileType === 'avatar' ? setAvatarLoading(false) : setBannerLoading(false);
    } finally {
      fileType === 'avatar' ? setAvatarLoading(false) : setBannerLoading(false);
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    handleFileChange(event, 'avatar');

  const handleBannerChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    handleFileChange(event, 'banner');

  return (
    <>
      <DrawerComponent isOpen={isOpen} handleClose={handleClose}>
        <ProfileImagesSection
          bannerLoading={bannerLoading}
          selectedUser={selectedUser}
          loggedinUser={loggedinUser}
          handleBannerChange={handleBannerChange}
          handleAvatarChange={handleAvatarChange}
          avatarLoading={avatarLoading}
        />
        <div className="flex flex-col gap-3 px-5 pb-2">
          <AboutUserSections
            selectedUser={selectedUser}
            loggedinUser={loggedinUser}
          />
          <div className="w-full">
            <ReactActivityCalendar />
          </div>
          <EarnedBadges logBadges={(selectedUser as any)?.buffBadge} />
          {!loading ? (
            <WorkLogSection
              worklogSummary={worklogSummary}
              selectedUser={selectedUser}
            />
          ) : (
            <LoadingSkeleton />
          )}
          {/* TODO: replace with Notion Tasks API or soemthing similar
          <div className="pb-4">
            <h6 className="pb-2 font-bold">Missions/Task</h6>
            <ul className="mt-1 flex list-none flex-col gap-1 rounded-xl border-2 border-gray-300 p-3">
              {<ClickupTask email={selectedUser?.email as string} />}
            </ul>
          </div> */}
          {/* TODO: replace with proper payments & earnign section
          {loggedinUser.user.id === selectedUser?.id && (
            <PayDataUI payData={payData} />
          )} */}
        </div>
      </DrawerComponent>
      <EditUser />
    </>
  );
};

export const WorkLogSection = ({
  selectedUser,
  worklogSummary,
}: {
  selectedUser: User;
  worklogSummary: WorkLogs[];
}) => {
  return (
    <div className="flex flex-col gap-1">
      <h6 className="pb-2 font-bold">Last worked on</h6>
      <div className="relative h-[310px] overflow-y-hidden">
        <div className="bottom-8 h-full">
          <WorklogSummaryView
            workLogUser={selectedUser}
            worklogSummary={ArrayHelper.reverseSortByDate(
              worklogSummary,
              'date',
            ).slice(0, 5)}
            isDrawer={true}
          />
          <div className="absolute bottom-0 left-0 right-0 flex h-[30vh] flex-col justify-end bg-gradient-to-b from-transparent to-white">
            <p className="p-2 text-center text-xs font-semibold text-neutral-500"></p>
          </div>
        </div>
        {/* <Link
      href={`${APP_ROUTES.userWorklogSummary}/${selectedUser?.id}`}
      className="absolute bottom-2 right-2 bg-white rounded-md border-gray-300 border-2 py-1 px-2 text-sm hover:bg-gray-200 transition duration-300"
    >
      View Full Summary
    </Link> */}
      </div>
    </div>
  );
};

const ProfileImagesSection = ({
  bannerLoading,
  selectedUser,
  loggedinUser,
  handleBannerChange,
  handleAvatarChange,
  avatarLoading,
}: {
  bannerLoading: boolean;
  selectedUser: User;
  loggedinUser: LoggedInUser;
  handleBannerChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  avatarLoading: boolean;
}) => {
  const badges = (selectedUser as any).buffBadge;
  const badge = badges.length > 0 ? badges[0] : [{ points: 1, title: 'Newbie' }];

  return (
    <div className="relative h-[120px]">
      {bannerLoading ? (
        <div className="h-full w-full animate-pulse bg-gray-300" />
      ) : (
        <img
          src={selectedUser?.banner || '/images/gradientBanner.jpg'}
          className="absolute h-full w-full object-cover"
          alt="Profile Banner"
        />
      )}
      <div className="absolute -bottom-[3.25rem] left-5 h-24 w-24 rounded-full border-4 border-white">
        {avatarLoading ? (
          <div className="rounded-full bg-white">
            <div className="h-24 w-24 animate-pulse rounded-full bg-gray-300" />
          </div>
        ) : (
          <img
            src={selectedUser?.avatar || '/icons/placeholderAvatar.svg'}
            alt={selectedUser?.name?.charAt(0) || ''}
            className="h-full w-full rounded-full bg-white object-cover"
          />
        )}

        {loggedinUser.user.id === selectedUser?.id && (
          <label className="absolute -right-2 top-2 flex cursor-pointer items-center justify-center rounded-full bg-white p-[2px]">
            <span
              className="material-symbols-outlined rounded-full bg-white p-[4px]"
              style={{ fontSize: '16px' }}
            >
              add_a_photo
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </label>
        )}

      </div>

      <div className='absolute top-0 right-0 left-0'>
        {selectedUser?.timezone && (
          <div className='h-[120px] w-[50%] ml-auto bg-gradient-to-l from-black to-transparent [rgba(0,0,0,0.1)]'>
            <div className='p-2 pr-4'>
              <p className='text-white text-2xl font-bold text-right'>{new Date().toLocaleString(`en-US`, {
                timeZone: selectedUser?.timezone,
                hour: 'numeric',
                minute: 'numeric',
              })}</p>
              <p className='text-white text-xs text-right'>{selectedUser?.timezone}</p>
            </div>
          </div>
        )}
      </div>

      {loggedinUser.user.id === selectedUser?.id && (
        <label className="absolute right-0 left-0 -bottom-2 flex cursor-pointer items-center justify-center rounded-full bg-white">
          <span
            className="material-symbols-outlined absolute -bottom-2 cursor-pointer rounded-full bg-neutral-100 p-[6px]"
            style={{ fontSize: '16px' }}
          >
            add_a_photo
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleBannerChange}
            className="hidden"
          />
        </label>
      )}

      <div className="absolute -bottom-[2.5rem] flex items-center w-full justify-end gap-4 pr-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 overflow-hidden rounded-full">
            <img
              src={getBuffLevelAndTitle(badge.points).src}
              alt="user-vertical"
              className="h-full w-full object-cover"
            />
          </div>
          <div className='flex flex-col items-start'>
            <h4 className="text-center text-xs font-bold capitalize">
              {getBuffLevelAndTitle(badge.points).title}
            </h4>
            <p className='text-center text-xs text-gray-500'>{badge.points} Pts</p>

          </div>
        </div>
      </div>
    </div>
  );
};

const AboutUserSections = ({
  selectedUser,
  loggedinUser,
}: {
  selectedUser: User;

  loggedinUser: LoggedInUser;
}) => {
  const dispatch = useAppDispatch();
  return (
    <div>
      <div className="pt-16">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold">{selectedUser?.name}</h3>
          {/* <p className="text-sm font-semibold capitalize text-gray-500">
            {selectedUser?.timezone}
          </p> */}
        </div>
        <p className="text-sm text-gray-700">
          {/* @{selectedUser?.username + selectedUser?.password}{' '} */}
          {selectedUser.positionTitle ? `${selectedUser.positionTitle} ` : `${translateUserVertical(selectedUser?.vertical || '')}`}
          - {selectedUser?.role?.toLowerCase()}
        </p>
      </div>
      {/* <h6 className="font-bold py-2"> Profile</h6> */}
      <div className="flex w-full gap-4 py-2 mt-3">
        <Link
          href={`${APP_ROUTES.userWorklogSummary}/${selectedUser?.id}`}
          className="flex flex-grow items-center justify-center gap-2 rounded-lg border border-gray-300 bg-black px-4 py-2 text-sm text-white shadow-md transition duration-300 hover:bg-gray-800"
          onClick={() => {
            dispatch(closeDrawer());
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '20px' }}
          >
            work_history
          </span>
          Worklogs
        </Link>
        <Link
          href={`https://slack.com/app_redirect?channel=${selectedUser?.slackId}`}
          target="_blank"
          className="flex flex-grow items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-black shadow-md transition duration-300 hover:bg-gray-200"
        >
          <Image
            src="/images/thirdparty/slack-new.svg"
            alt="slack"
            width={16}
            height={16}
          />
          Message
        </Link>
        {loggedinUser.user.id === selectedUser?.id && (
          <ToolTip title="Edit Profile">
            <button
              className="flex w-auto flex-grow-0 items-center justify-center gap-2 rounded-lg border border-gray-300 p-2 text-black shadow-md transition duration-300 hover:bg-gray-200"
              onClick={() => {
                dispatch(setEditModalOpen(true));
                dispatch(closeDrawer());
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '20px' }}
              >
                edit_square
              </span>
            </button>
          </ToolTip>
        )}
      </div>
      <Divider className="pt-4" />

      {selectedUser?.description && (
        <>
          <p className="mt-4 text-sm line-clamp-3">
            {selectedUser?.description || 'Description not available.'}
          </p>
        </>
      )}
    </div>
  );
};
