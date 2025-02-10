/* eslint-disable @next/next/no-img-element */
import { User } from '@prisma/client';
import BoringAvatar from 'boring-avatars';
import PushSubscriptionToggleButton from '@/components/global/PushSubscriptionToggleButton';
import { CircleAlert, CirclePower } from 'lucide-react';
import { useState } from 'react';
import LogoutConfirmationDialog from '@/components/global/LogoutConfirmationDialog';
import { useAppDispatch } from '@/utils/redux/store';
import { selectMember } from '@/utils/redux/coreTeam/coreTeam.slice';
import Link from 'next/link';
import { APP_ROUTES } from '@/utils/constants/appInfo';
export const ProfileSection = ({ user }: { user: User }) => {
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();
  const handleLogoutDialogOpen = () => {
    setOpen(true);
  };

  const handleOpenSlideIn = (user: User) => {
    dispatch(selectMember(user));
  };

  if (!user?.id) return null;
  return (
    <div className="flex w-full flex-col items-center justify-between px-2 pt-4 md:static md:items-center">
      <div className="my-3 flex w-full flex-row items-center justify-start gap-4">
        <div
          className="rounded-full p-1"
          onClick={() => handleOpenSlideIn(user)}
        >
          {!user?.avatar || user?.avatar === '' ? (
            <div className="relative h-24 w-24">
              <BoringAvatar
                size={'100%'}
                name={user?.name || 'S'}
                variant="sunset"
                colors={['#000000', '#363636', '#b3b3b3']}
              />
              <div className="absolute inset-0 flex items-center justify-center text-5xl text-white">
                <span>{user?.name?.substring(0, 1)}</span>
              </div>
            </div>
          ) : (
            <img
              src={user?.avatar || ''}
              alt={user?.name || ''}
              className="h-16 w-16 cursor-pointer rounded-full object-cover object-center md:h-[4.5rem] md:w-[4.5rem]"
            />
          )}
        </div>
        <div className="text-left">
          <p className="text-md font-bold text-black">Hello, </p>
          <h4 className="text-xl text-neutral-900">{user?.name}</h4>
          <p className="text-neutral-500 text-xs">{user?.email}</p>
          <Link
            href={APP_ROUTES.devProfile}
            className="mt-2 flex items-center justify-center text-xs text-white transition px-2 py-2 bg-black rounded-lg hover:bg-neutral-700 gap-1"
          >
            Dev Profile{' '}
            <span className="material-symbols-outlined !text-xs">
              open_in_new
            </span>
          </Link>
        </div>
      </div>

      <div className="mb-4 grid w-full select-none grid-cols-[1.5fr_1fr] items-center justify-center divide-x-2 overflow-hidden rounded-2xl bg-white">
        <div className="overflow-hidden hover:bg-neutral-100">
          <PushSubscriptionToggleButton />
        </div>
        <div
          className="flex w-full cursor-pointer flex-row items-center justify-center gap-2 py-4 hover:bg-neutral-100"
          onClick={handleLogoutDialogOpen}
        >
          <CirclePower className="text-red-400" />
          <span>Logout</span>
        </div>
      </div>
      <LogoutConfirmationDialog
        open={open}
        handleClose={() => setOpen(false)}
      />
    </div>
  );
};
