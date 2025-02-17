'use client';

import { APP_ROUTES, AppRoutesHelper } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { USERTYPE } from '@prisma/client';
import { usePathname, useRouter } from 'next/navigation';
import { PortalSdk } from '@/utils/services/PortalSdk';
import Image from 'next/image';
import Link from 'next/link';
import { useMediaQuery, Badge } from '@mui/material';
import media from '@/styles/media';
import { useNotifications } from '@/utils/hooks/useNotifications';
import { useEffect, useRef, useState } from 'react';
import NotificationModal from './NotificationModal';
import Ripples from 'react-ripples';
import LogoutConfirmationDialog from './LogoutConfirmationDialog';

const NAVIGATION_OPTIONS = [
  {
    name: 'Home',
    path: APP_ROUTES.home,
    icon: 'perm_identity',
  },
  {
    name: 'Worklogs',
    path: APP_ROUTES.userWorklogs,
    icon: 'task_alt',
  },
  {
    name: 'Houses',
    path: APP_ROUTES.houses,
    icon: 'category',
  },
  // {
  //   name: "Teams",
  //   path: APP_ROUTES.teams,
  //   icon: "workspaces",
  // },
  // {
  //   name: "Growth",
  //   path: APP_ROUTES.growth,
  //   icon: "trending_up",
  // },
  {
    name: 'Notifications',
    path: APP_ROUTES.notifications,
    icon: 'notifications',
  },
  {
    name: 'Admin',
    path: APP_ROUTES.admin,
    icon: 'admin_panel_settings',
  },
];

const CLIENT_NAVIGATION_OPTIONS = [
  {
    name: 'Home',
    path: APP_ROUTES.home,
    icon: 'perm_identity',
  },
  {
    name: 'Engagements',
    path: APP_ROUTES.engagements,
    icon: 'task_alt',
  },
  {
    name: "Invoices",
    path: APP_ROUTES.invoices,
    icon: "receipt_long",
  },
  // {
  //   name: 'Referrals',
  //   path: APP_ROUTES.referrals,
  //   icon: 'group_add',
  // },
  // {
  //   name: "Growth",
  //   path: APP_ROUTES.growth,
  //   icon: "trending_up",
  // },
  {
    name: 'Notifications',
    path: APP_ROUTES.notifications,
    icon: 'notifications',
  },
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
  const visibleOnlyOnResponsiveSizes = useMediaQuery(
    visibleOnlyOn ? visibleOnlyOn : media.default,
  );
  const isMobile = useMediaQuery(media.largeMobile);
  const isTablet = useMediaQuery(media.tablet);
  const isMobileOrTablet = isMobile || isTablet;
  const { unreadNotificationsCount } = useNotifications();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [workLogId, setWorkLogId] = useState<string | null>(null);
  const [loadingWorkLog, setLoadingWorkLog] = useState<boolean>(true);
  const [open, setOpen] = useState(false);

  const handleLogoutDialogOpen = () => {
    setOpen(true);
  };

  const options =
    user?.userType === USERTYPE.CLIENT
      ? CLIENT_NAVIGATION_OPTIONS
      : NAVIGATION_OPTIONS.filter(
          (option) =>
            !(
              option.name === 'Admin' &&
              (!user?.isAdmin || isMobile || isTablet)
            ),
        );
  if (!visible && !visibleOnlyOn) return null;
  if (visibleOnlyOn && !visibleOnlyOnResponsiveSizes) return null;
  //if (!AppRoutesHelper.bottomBarShown(path)) return null;

  const handleNotificationClick = () => {
    if (isMobile) {
      router.push(APP_ROUTES.notifications);
    } else {
      setIsOpen(!isOpen);
    }
  };
  useEffect(() => {
    const fetchWorkLogs = async () => {
      if (isMobile && user?.id) {
        const currentDate = new Date().toISOString().split('T')[0];
        try {
          const data = await PortalSdk.getData(
            `/api/user/worklogs?date=${currentDate}&userId=${user?.id}`,
            null,
          );
          const id = data?.data?.workLogs?.[0]?.id || null;
          setWorkLogId(id);
        } catch (error) {
          console.error('Error fetching worklogs:', error);
        } finally {
          setLoadingWorkLog(false); // Set loading to false after fetching
        }
      }
    };

    fetchWorkLogs();
  });
  const workLogClick = (path: string) => {
    if (isMobile && workLogId && !loadingWorkLog) {
      // Check for loading state
      const currentDate = new Date().toISOString().split('T')[0];
      router.push(`${path}/${workLogId}?logType=dayLog&date=${currentDate}`);
    } else {
      router.push(APP_ROUTES.userWorklogs);
    }
  };

  const handleTabClick = (option: { name: string; path: string }) => {
    if (option.name === 'Notifications') {
      handleNotificationClick();
    } else if (option.name === 'Worklogs') {
      workLogClick(option.path);
    } else {
      router.push(option.path);
    }
  };
  return (
    <div
      className={`md:fixed-none bottombar fixed bottom-0 left-0 right-0 z-10 flex flex-row gap-6 bg-neutral-900 px-2 py-2 max-md:mx-1 max-md:my-1 max-md:rounded-2xl md:bottom-auto md:left-0 md:top-0 md:h-full md:w-24 md:flex-col md:px-2 md:py-1`}
      id="home-bottombar"
    >
      <Link href={APP_ROUTES.home} className="hidden md:block">
        <Image
          src="/logo/logo_white.png"
          alt="Moon Portal Logo"
          width={100}
          height={100}
          className="mx-auto my-4 h-12 w-12 rounded max-md:hidden"
        />
      </Link>
      {options.map((option) => (
        <div
          onClick={() => handleTabClick(option)}
          key={option.path}
          className={` ${
            option.path === path ? 'bg-white text-black' : 'bg-black text-white'
          } relative flex w-1/3 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl px-2 py-1 pt-2 text-xl transition-all duration-300 ${option.path !== path && 'hover:bg-neutral-700'} md:w-full`}
        >
          {option.path !== path && (
            <Ripples
              placeholder={undefined}
              onClick={() => handleTabClick(option)}
              onPointerEnterCapture={() => handleTabClick(option)}
              onPointerLeaveCapture={() => handleTabClick(option)}
              color="white"
              className="!absolute top-0 z-50 h-full w-full"
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
                option.path === path ? 'text-black' : 'text-white'
              } material-icons-outlined text-md font-thin`}
            >
              {option.icon}
            </span>
          </Badge>
          <p className="text-[0.5em] opacity-75">{option.name}</p>
        </div>
      ))}{' '}
      <button
        onClick={handleLogoutDialogOpen}
        className={`absolute bottom-5 flex w-[85%] cursor-pointer flex-col items-center justify-center rounded-2xl bg-black py-1 pt-2 text-xl hover:bg-neutral-700 max-md:hidden`}
      >
        <span className="material-symbols-outlined text-white">logout</span>
        <span className="text-[0.5em] text-white opacity-75 max-md:hidden">
          Logout
        </span>
      </button>
      <LogoutConfirmationDialog
        open={open}
        handleClose={() => setOpen(false)}
      />
      <NotificationModal open={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
};
