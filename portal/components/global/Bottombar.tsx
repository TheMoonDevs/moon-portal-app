'use client';

import { Badge, useMediaQuery } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import media from '@/styles/media';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useNotifications } from '@/utils/hooks/useNotifications';
import { useWorkspace } from '@/utils/hooks/useWorkspace';

import LogoutConfirmationDialog from './LogoutConfirmationDialog';
import NotificationModal from './NotificationModal';

// `label` is the short text under the icon, where the full name doesn't fit.
type NavOption = { name: string; path: string; icon: string; label?: string };

const NAVIGATION_OPTIONS: NavOption[] = [
  { name: 'Home', path: APP_ROUTES.home, icon: 'perm_identity' },
  { name: 'Worklogs', path: APP_ROUTES.userWorklogs, icon: 'task_alt' },
  { name: 'Plans', path: APP_ROUTES.plans, icon: 'map' },
  {
    name: 'Notifications',
    path: APP_ROUTES.notifications,
    icon: 'notifications',
    label: 'Alerts',
  },
  { name: 'World', path: APP_ROUTES.world, icon: 'public' },
  { name: 'Admin', path: APP_ROUTES.admin, icon: 'admin_panel_settings' },
  { name: 'Settings', path: APP_ROUTES.settings, icon: 'settings' },
];

// On phones the bar keeps this many tabs; the rest go in the "More" menu.
const MOBILE_TAB_COUNT = 4;

const isActivePath = (path: string | null, optionPath: string) =>
  path === optionPath || (optionPath !== '/' && !!path?.startsWith(optionPath));

const NavIcon = ({
  option,
  unreadCount,
  className,
}: {
  option: NavOption;
  unreadCount: number;
  className?: string;
}) => (
  <Badge
    badgeContent={option.name === 'Notifications' ? unreadCount : 0}
    color="error"
    max={20}
    invisible={!unreadCount}
    sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 16, minWidth: 16 } }}
  >
    <span className={`material-icons-outlined ${className ?? ''}`}>
      {option.icon}
    </span>
  </Badge>
);

export const Bottombar = ({
  visible = true,
  visibleOnlyOn,
}: {
  visible?: boolean;
  visibleOnlyOn?: string;
}) => {
  const path = usePathname();
  const router = useRouter();
  const { unreadNotificationsCount } = useNotifications();
  const { canOpenAdmin } = useWorkspace();

  const matchesVisibleOnlyOn = useMediaQuery(visibleOnlyOn ?? media.default);
  const isMobile = useMediaQuery(media.largeMobile);
  const isTablet = useMediaQuery(media.tablet);

  const [isNotificationModalOpen, setNotificationModalOpen] = useState(false);
  const [isLogoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [isMoreOpen, setMoreOpen] = useState(false);

  useEffect(() => setMoreOpen(false), [path]);

  if (!visible && !visibleOnlyOn) return null;
  if (visibleOnlyOn && !matchesVisibleOnlyOn) return null;

  const canSeeAdmin = canOpenAdmin && !isMobile && !isTablet;
  const options = NAVIGATION_OPTIONS.filter(
    (option) => option.name !== 'Admin' || canSeeAdmin,
  );
  const mobileTabs = options.slice(0, MOBILE_TAB_COUNT);
  const moreOptions = options.slice(MOBILE_TAB_COUNT);
  const isMoreActive = moreOptions.some((option) =>
    isActivePath(path, option.path),
  );

  const handleTabClick = (option: NavOption) => {
    setMoreOpen(false);
    if (option.name !== 'Notifications') {
      router.push(option.path);
      return;
    }
    if (isTablet) router.push(APP_ROUTES.notifications);
    else setNotificationModalOpen((open) => !open);
  };

  return (
    <>
      {/* Desktop: a slim sidebar whose links scroll when the window is short */}
      <nav
        className="bottombar fixed inset-y-0 left-0 z-10 hidden w-16 flex-col items-center bg-neutral-900 py-2 md:flex"
        id="home-bottombar"
      >
        <Link href={APP_ROUTES.home} className="mb-2 mt-1 shrink-0">
          <Image
            src="/logo/logo_white.png"
            alt="Moon Portal Logo"
            width={64}
            height={64}
            className="size-9 rounded"
          />
        </Link>
        <div className="no-scrollbar flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto px-1.5 py-1">
          {options.map((option) => {
            const isActive = isActivePath(path, option.path);
            return (
              <button
                key={option.path}
                onClick={() => handleTabClick(option)}
                title={option.name}
                className={`flex w-full shrink-0 flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors ${
                  isActive
                    ? 'bg-white text-black'
                    : 'text-white hover:bg-neutral-700'
                }`}
              >
                <NavIcon
                  option={option}
                  unreadCount={unreadNotificationsCount}
                  className="!text-[20px]"
                />
                <span className="max-w-full truncate px-0.5 text-[9px] leading-none opacity-75">
                  {option.label ?? option.name}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setLogoutDialogOpen(true)}
          title="Logout"
          className="mt-1 flex w-[calc(100%-12px)] shrink-0 flex-col items-center gap-0.5 rounded-xl py-1.5 text-white hover:bg-neutral-700"
        >
          <span className="material-symbols-outlined !text-[20px]">logout</span>
          <span className="text-[9px] leading-none opacity-75">Logout</span>
        </button>
      </nav>

      {/* Mobile: four tabs plus a "More" menu for everything else */}
      {isMoreOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute inset-x-1 bottom-[76px] rounded-2xl bg-neutral-900 p-2 text-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            {moreOptions.map((option) => {
              const isActive = isActivePath(path, option.path);
              return (
                <button
                  key={option.path}
                  onClick={() => handleTabClick(option)}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-sm ${
                    isActive ? 'bg-white text-black' : 'hover:bg-neutral-700'
                  }`}
                >
                  <NavIcon
                    option={option}
                    unreadCount={unreadNotificationsCount}
                    className="!text-[20px]"
                  />
                  {option.name}
                </button>
              );
            })}
            <button
              onClick={() => {
                setMoreOpen(false);
                setLogoutDialogOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-xl p-3 text-sm hover:bg-neutral-700"
            >
              <span className="material-symbols-outlined !text-[20px]">
                logout
              </span>
              Logout
            </button>
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-20 m-1 flex flex-row gap-1 rounded-2xl bg-neutral-900 p-1.5 md:hidden">
        {mobileTabs.map((option) => {
          const isActive = isActivePath(path, option.path);
          return (
            <button
              key={option.path}
              onClick={() => handleTabClick(option)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors ${
                isActive ? 'bg-white text-black' : 'text-white'
              }`}
            >
              <NavIcon
                option={option}
                unreadCount={unreadNotificationsCount}
                className="!text-[22px]"
              />
              <span className="text-[10px] leading-none opacity-75">
                {option.label ?? option.name}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setMoreOpen((open) => !open)}
          aria-label="More"
          aria-expanded={isMoreOpen}
          className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors ${
            isMoreActive || isMoreOpen ? 'bg-white text-black' : 'text-white'
          }`}
        >
          <span className="material-icons-outlined !text-[22px]">
            {isMoreOpen ? 'close' : 'menu'}
          </span>
          <span className="text-[10px] leading-none opacity-75">More</span>
        </button>
      </nav>

      <LogoutConfirmationDialog
        open={isLogoutDialogOpen}
        handleClose={() => setLogoutDialogOpen(false)}
      />
      <NotificationModal
        open={isNotificationModalOpen}
        onClose={() => setNotificationModalOpen(false)}
      />
    </>
  );
};
