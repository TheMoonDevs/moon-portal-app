'use client';

import { Badge, useMediaQuery } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import Ripples from 'react-ripples';

import media from '@/styles/media';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useNotifications } from '@/utils/hooks/useNotifications';
import { useUser } from '@/utils/hooks/useUser';

import LogoutConfirmationDialog from './LogoutConfirmationDialog';
import NotificationModal from './NotificationModal';

const NAVIGATION_OPTIONS = [
  { name: 'Home', path: APP_ROUTES.home, icon: 'perm_identity' },
  { name: 'Worklogs', path: APP_ROUTES.userWorklogs, icon: 'task_alt' },
  {
    name: 'Notifications',
    path: APP_ROUTES.notifications,
    icon: 'notifications',
  },
  { name: 'Admin', path: APP_ROUTES.admin, icon: 'admin_panel_settings' },
  { name: 'Settings', path: APP_ROUTES.settings, icon: 'settings' },
];

export const Bottombar = ({
  visible = true,
  visibleOnlyOn,
}: {
  visible?: boolean;
  visibleOnlyOn?: string;
}) => {
  const path = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { unreadNotificationsCount } = useNotifications();

  const matchesVisibleOnlyOn = useMediaQuery(visibleOnlyOn ?? media.default);
  const isMobile = useMediaQuery(media.largeMobile);
  const isTablet = useMediaQuery(media.tablet);

  const [isNotificationModalOpen, setNotificationModalOpen] = useState(false);
  const [isLogoutDialogOpen, setLogoutDialogOpen] = useState(false);

  if (!visible && !visibleOnlyOn) return null;
  if (visibleOnlyOn && !matchesVisibleOnlyOn) return null;

  const canSeeAdmin = user?.isAdmin && !isMobile && !isTablet;
  const options = NAVIGATION_OPTIONS.filter(
    (option) => option.name !== 'Admin' || canSeeAdmin,
  );

  const handleTabClick = (option: { name: string; path: string }) => {
    if (option.name !== 'Notifications') {
      router.push(option.path);
      return;
    }
    if (isMobile) router.push(APP_ROUTES.notifications);
    else setNotificationModalOpen((open) => !open);
  };

  return (
    <div
      className={`md:fixed-none bottombar fixed inset-x-0 bottom-0 z-10 flex flex-row gap-6 bg-neutral-900 p-2 max-md:m-1 max-md:rounded-2xl md:bottom-auto md:left-0 md:top-0 md:h-full md:w-24 md:flex-col md:px-2 md:py-1`}
      id="home-bottombar"
    >
      <Link href={APP_ROUTES.home} className="hidden md:block">
        <Image
          src="/logo/logo_white.png"
          alt="Moon Portal Logo"
          width={100}
          height={100}
          className="mx-auto my-4 size-12 rounded max-md:hidden"
        />
      </Link>
      {options.map((option) => {
        const isActive =
          path === option.path ||
          (option.path !== '/' && path?.startsWith(option.path));
        return (
          <div
            onClick={() => handleTabClick(option)}
            key={option.path}
            className={` ${
              isActive ? 'bg-white text-black' : 'bg-black text-white'
            } relative flex w-1/3 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl px-2 py-1 pt-2 text-xl transition-all duration-300 ${option.path !== path && 'hover:bg-neutral-700'} md:w-full`}
          >
            {option.path !== path && (
              <Ripples
                placeholder={undefined}
                onClick={() => handleTabClick(option)}
                onPointerEnterCapture={() => handleTabClick(option)}
                onPointerLeaveCapture={() => handleTabClick(option)}
                color="white"
                className="!absolute top-0 z-50 size-full"
              ></Ripples>
            )}

            <Badge
              badgeContent={
                option.name === 'Notifications' ? unreadNotificationsCount : 0
              }
              color="error"
              max={20}
              invisible={!unreadNotificationsCount}
            >
              <span
                className={` ${
                  isActive ? 'text-black' : 'text-white'
                } material-icons-outlined text-md font-thin`}
              >
                {option.icon}
              </span>
            </Badge>
            <p className="text-[0.5em] opacity-75">{option.name}</p>
          </div>
        );
      })}{' '}
      <button
        onClick={() => setLogoutDialogOpen(true)}
        className={`absolute bottom-5 flex w-[85%] cursor-pointer flex-col items-center justify-center rounded-2xl bg-black py-1 pt-2 text-xl hover:bg-neutral-700 max-md:hidden`}
      >
        <span className="material-symbols-outlined text-white">logout</span>
        <span className="text-[0.5em] text-white opacity-75 max-md:hidden">
          Logout
        </span>
      </button>
      <LogoutConfirmationDialog
        open={isLogoutDialogOpen}
        handleClose={() => setLogoutDialogOpen(false)}
      />
      <NotificationModal
        open={isNotificationModalOpen}
        onClose={() => setNotificationModalOpen(false)}
      />
    </div>
  );
};
