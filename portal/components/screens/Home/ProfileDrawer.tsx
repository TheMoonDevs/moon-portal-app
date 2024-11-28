/* eslint-disable @next/next/no-img-element */
'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { RootState, useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { useUser } from '@/utils/hooks/useUser';
import { BadgeRewarded, User, WorkLogs } from '@prisma/client';
import {
  closeDrawer,
  updateMember,
} from '@/utils/redux/coreTeam/coreTeam.slice';
import {
  addFilesToPreview,
  setUploadedFiles,
} from '@/utils/redux/filesUpload/fileUpload.slice';
import { FileWithPath } from '@mantine/dropzone';
import { PortalSdk } from '@/utils/services/PortalSdk';
import useAsyncState from '@/utils/hooks/useAsyncState';
import { LoadingSkeleton } from '@/components/elements/LoadingSkeleton';
import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';
import { setReduxUser } from '@/utils/redux/auth/auth.slice';
import DrawerComponent from '@/components/elements/DrawerComponent';
import dayjs from 'dayjs';
import ReactActivityCalendar from './ActivityCalendar';
import EditUser from './EditUser';
import ClickupTask from '../Worklogs/WorklogTabs/ClickupTasks';
import { ProfileImagesSection } from './profile-drawer-components/ProfileImagesSection';
import { AboutUserSections } from './profile-drawer-components/AboutUserSections';
import { WorkLogSection } from './profile-drawer-components/WorkLogSection';
import { PayDataUI } from './profile-drawer-components/PayDataUI';
import EarnedBadges from './profile-drawer-components/EarnedBadges';

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
        `/api/user/worklogs/summary?userId=${
          selectedUser?.id
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
          <EarnedBadges />
          <div className="pb-4">
            <h6 className="pb-2 font-bold">Missions/Task</h6>
            <ul className="mt-1 flex list-none flex-col gap-1 rounded-xl border-2 border-gray-300 p-3">
              {<ClickupTask email={selectedUser?.email as string} />}
            </ul>
          </div>

          <div className="w-full">
            <h6 className="pb-2 font-bold">
              Contributions ({dayjs().format('MMM YYYY')})
            </h6>
            <ReactActivityCalendar />
          </div>
          {!loading ? (
            <WorkLogSection
              worklogSummary={worklogSummary}
              selectedUser={selectedUser}
            />
          ) : (
            <LoadingSkeleton />
          )}
          {loggedinUser.user.id === selectedUser?.id && (
            <PayDataUI payData={payData} />
          )}
        </div>
      </DrawerComponent>
      <EditUser />
    </>
  );
};
