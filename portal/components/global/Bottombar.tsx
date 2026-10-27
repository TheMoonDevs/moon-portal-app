'use client';

import { Badge, useMediaQuery } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import media from '@/styles/media';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useNotifications } from '@/utils/hooks/useNotifications';
import { useUser } from '@/utils/hooks/useUser';
import { useWorkspace } from '@/utils/hooks/useWorkspace';

import LogoutConfirmationDialog from './LogoutConfirmationDialog';
import NotificationModal from './NotificationModal';

// `label` is the short text under the icon, where the full name doesn't fit.
// `group` splits the desktop sidebar into sections; `bottom` pins a link to
// the foot of the sidebar.
type NavOption = {
  name: string;
  path: string;
  icon: string;
  label?: string;
  group: 'work' | 'social' | 'manage' | 'bottom';
};

const NAVIGATION_OPTIONS: NavOption[] = [
  { name: 'Home', path: APP_ROUTES.home, icon: 'home', group: 'work' },
  {
    name: 'Worklogs',
    path: APP_ROUTES.userWorklogs,
    icon: 'task_alt',
    group: 'work',
  },
  {
    name: 'Projects',
    path: APP_ROUTES.projects,
    icon: 'folder',
    group: 'work',
  },
  { name: 'Plans', path: APP_ROUTES.plans, icon: 'map', group: 'work' },
  {
    name: 'Notifications',
    path: APP_ROUTES.notifications,
    icon: 'notifications',
    label: 'Alerts',
    group: 'social',
  },
  { name: 'World', path: APP_ROUTES.world, icon: 'public', group: 'social' },
  {
    name: 'Hiring',
    path: `${APP_ROUTES.admin}?tab=hiring`,
    icon: 'person_search',
    group: 'manage',
  },
  {
    name: 'Admin',
    path: APP_ROUTES.admin,
    icon: 'admin_panel_settings',
    group: 'manage',
  },
  {
    name: 'Settings',
    path: APP_ROUTES.settings,
    icon: 'settings',
    group: 'bottom',
  },
];

const SIDEBAR_GROUPS: NavOption['group'][] = ['work', 'social', 'manage'];

// On phones the bar keeps this many tabs; the rest go in the "More" menu.
const MOBILE_TAB_COUNT = 4;

const isActivePath = (path: string | null, optionPath: string) =>
  path === optionPath || (optionPath !== '/' && !!path?.startsWith(optionPath));

// Active links show the filled icon, the rest the outlined one.
const NavIcon = ({
  option,
  unreadCount,
  isActive,
  className,
}: {
  option: NavOption;
  unreadCount: number;
  isActive?: boolean;
  className?: string;
}) => (
  <Badge
    badgeContent={option.name === 'Notifications' ? unreadCount : 0}
    color="error"
    max={20}
    invisible={!unreadCount}
    sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 16, minWidth: 16 } }}
  >
    <span
      className={`${isActive ? 'material-icons' : 'material-icons-outlined'} ${className ?? ''}`}
    >
      {option.icon}
    </span>
  </Badge>
);

// A sidebar link: the icon sits in a pill that lights up when the link is
// active, with its label underneath.
const SidebarLink = ({
  option,
  isActive,
  unreadCount,
  onClick,
}: {
  option: NavOption;
  isActive: boolean;
  unreadCount: number;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    title={option.name}
    aria-label={option.name}
    aria-current={isActive ? 'page' : undefined}
    className={`group flex w-full shrink-0 flex-col items-center gap-1 py-0.5 transition-colors ${
      isActive ? 'text-white' : 'text-neutral-400 hover:text-white'
    }`}
  >
    <span
      className={`flex h-8 w-11 items-center justify-center rounded-full transition-colors ${
        isActive ? 'bg-white text-neutral-950' : 'group-hover:bg-white/10'
      }`}
    >
      <NavIcon
        option={option}
        unreadCount={unreadCount}
        isActive={isActive}
        className="!text-[20px]"
      />
    </span>
    <span
      className={`max-w-full truncate px-0.5 text-[10px] leading-none ${
        isActive ? 'font-semibold' : 'font-medium'
      }`}
    >
      {option.label ?? option.name}
    </span>
  </button>
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
  const { canOpenAdmin, hiringCompanies } = useWorkspace();
  const { user } = useUser();

  const matchesVisibleOnlyOn = useMediaQuery(visibleOnlyOn ?? media.default);
  const isMobile = useMediaQuery(media.largeMobile);
  const isTablet = useMediaQuery(media.tablet);

  const [isNotificationModalOpen, setNotificationModalOpen] = useState(false);
  const [isLogoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [isMoreOpen, setMoreOpen] = useState(false);

  useEffect(() => setMoreOpen(false), [path]);

  if (!visible && !visibleOnlyOn) return null;
  if (visibleOnlyOn && !matchesVisibleOnlyOn) return null;

  // The admin console (and the hiring board inside it) is desktop-only.
  const isDesktop = !isMobile && !isTablet;
  const canSeeAdmin = canOpenAdmin && isDesktop;
  const canSeeHiring =
    (!!user?.isAdmin || hiringCompanies.length > 0) && isDesktop;
  const options = NAVIGATION_OPTIONS.filter((option) => {
    if (option.name === 'Admin') return canSeeAdmin;
    if (option.name === 'Hiring') return canSeeHiring;
    return true;
  });
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
      {/* Desktop: a slim sidebar in sections, with Settings and Logout at
          the foot. The links scroll when the window is short. */}
      <nav
        className="bottombar fixed inset-y-0 left-0 z-10 hidden w-16 flex-col items-center border-r border-white/5 bg-neutral-950 py-3 md:flex"
        id="home-bottombar"
      >
        <Link
          href={APP_ROUTES.home}
          title="Portal"
          className="mb-3 shrink-0 rounded-xl transition-opacity hover:opacity-80"
        >
          <Image
            src="/brand/portal-logo.svg"
            alt="Portal"
            width={64}
            height={64}
            className="size-8"
          />
        </Link>
        <div className="no-scrollbar flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-y-auto">
          {SIDEBAR_GROUPS.map((group) => {
            const groupOptions = options.filter(
              (option) => option.group === group,
            );
            if (!groupOptions.length) return null;
            return (
              <div
                key={group}
                className="flex w-full flex-col items-center gap-1 before:mx-auto before:mb-1 before:h-px before:w-8 before:bg-white/10 first:before:hidden"
              >
                {groupOptions.map((option) => (
                  <SidebarLink
                    key={option.path}
                    option={option}
                    isActive={isActivePath(path, option.path)}
                    unreadCount={unreadNotificationsCount}
                    onClick={() => handleTabClick(option)}
                  />
                ))}
              </div>
            );
          })}
        </div>
        <div className="flex w-full shrink-0 flex-col items-center gap-1 pt-1 before:mx-auto before:mb-1 before:h-px before:w-8 before:bg-white/10">
          {options
            .filter((option) => option.group === 'bottom')
            .map((option) => (
              <SidebarLink
                key={option.path}
                option={option}
                isActive={isActivePath(path, option.path)}
                unreadCount={unreadNotificationsCount}
                onClick={() => handleTabClick(option)}
              />
            ))}
          <SidebarLink
            option={{
              name: 'Logout',
              path: '',
              icon: 'logout',
              group: 'bottom',
            }}
            isActive={false}
            unreadCount={0}
            onClick={() => setLogoutDialogOpen(true)}
          />
        </div>
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
                    isActive={isActive}
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
                isActive={isActive}
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
