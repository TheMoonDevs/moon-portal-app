'use client';
import type { User } from '@db/client';
import { Divider } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';

import ToolTip from '@/components/elements/ToolTip';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import {
  closeDrawer,
  setEditModalOpen,
} from '@/utils/redux/coreTeam/coreTeam.slice';
import { useAppDispatch } from '@/utils/redux/store';

import type { LoggedInUser } from '../ProfileDrawer';
import {
  getUserRoleImage,
  getUserVerticalImage,
  translateUserVertical,
} from '.';

export const AboutUserSections = ({
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
          <p className="text-sm font-semibold capitalize text-gray-500">
            {selectedUser?.timezone}
          </p>
        </div>
        <p className="text-sm text-gray-700">
          @{selectedUser?.username + selectedUser?.password}{' '}
          {selectedUser.positionTitle && `- ${selectedUser.positionTitle}`}
        </p>
      </div>
      <div className="mt-4 flex items-center gap-6 pb-4">
        <div className="flex flex-col items-center">
          <div className="size-16 overflow-hidden rounded-full border-2 border-gray-300 shadow-lg">
            <img
              src={getUserVerticalImage(selectedUser?.vertical)}
              alt="user-vertical"
              className="size-full object-cover"
            />
          </div>
          <div className="mt-2 text-center text-xs font-bold capitalize">
            {translateUserVertical(selectedUser?.vertical || '')}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="size-16 overflow-hidden rounded-full border-2 border-gray-300 shadow-lg">
            <img
              src={getUserRoleImage(selectedUser?.role)}
              alt="user-role"
              className="size-full object-cover"
            />
          </div>
          <div className="mt-2 text-center text-xs font-bold capitalize">
            {selectedUser?.role?.toLowerCase()}
          </div>
        </div>
      </div>
      <div className="flex w-full gap-4 py-2">
        <Link
          href={`${APP_ROUTES.userWorklogSummary}/${selectedUser?.id}`}
          className="flex grow items-center justify-center gap-2 rounded-lg border border-gray-300 bg-black px-4 py-2 text-sm text-white shadow-md transition duration-300 hover:bg-gray-800"
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
          className="flex grow items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-black shadow-md transition duration-300 hover:bg-gray-200"
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
              className="flex w-auto grow-0 items-center justify-center gap-2 rounded-lg border border-gray-300 p-2 text-black shadow-md transition duration-300 hover:bg-gray-200"
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
          <h6 className="mt-4 py-2 font-bold">About Me</h6>
          <p className="pb-4 text-sm">
            {selectedUser?.description || 'Description not available.'}
          </p>
        </>
      )}
    </div>
  );
};
