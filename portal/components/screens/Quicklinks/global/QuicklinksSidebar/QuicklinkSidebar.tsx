'use client';
import { APP_ROUTES, QUICKLINK_ROUTES } from '@/utils/constants/appInfo';
import Link from 'next/link';
import { useQuickLinkDirectory } from '../../hooks/useQuickLinkDirectory';
import { useState, FC, ReactNode, MouseEvent, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import {
  Divider,
  Tooltip,
  Box,
  Drawer,
  Fab,
  useMediaQuery,
  IconButton,
} from '@mui/material';
import { useUser } from '@/utils/hooks/useUser';
import {
  setHamburgerOpen,
  setModal,
  setToggleSidebar,
} from '@/utils/redux/quicklinks/slices/quicklinks.ui.slice';
import { DirectoryList, ROOTTYPE } from '@prisma/client';
import {
  deleteDirectory,
  updateDirectory,
} from '@/utils/redux/quicklinks/slices/quicklinks.directory.slice';
import { handleDeleteDirectory } from '@/utils/redux/quicklinks/quicklinks.thunks';
import clsx from 'clsx';
import media from '@/styles/media';

// Types
interface NavItem {
  title: string;
  icon: string;
  route: string;
}

interface SidebarNavItemProps {
  nav: NavItem;
  isActive: boolean;
  children?: ReactNode;
  onClick?: () => void;
  endIcon?: ReactNode;
  isCollapsed?: boolean;
}

interface SidebarSubNavProps {
  dirs: DirectoryList[];
  user: any;
  route: string;
  isActive: boolean;
  dispatch: ReturnType<typeof useAppDispatch>;
  pathname: string | null;
  isCollapsed?: boolean;
  isTablet?: boolean;
}

interface ExpandedState {
  id: string;
  expanded: boolean;
}

// Navigation Items Constants
const NAV_ITEMS = {
  first: [
    {
      title: 'Departments',
      icon: 'groups',
      route: QUICKLINK_ROUTES.department,
    },
    {
      title: 'Team Resources',
      icon: 'stack',
      route: QUICKLINK_ROUTES.commonResources,
    },
  ],
  you: [
    { title: 'My List', icon: 'list', route: QUICKLINK_ROUTES.userList },
    {
      title: 'Top Used Links',
      icon: 'link',
      route: QUICKLINK_ROUTES.userTopUsedLinks,
    },
    {
      title: 'Recent Folders',
      icon: 'history',
      route: QUICKLINK_ROUTES.userRecentlyUsedFolders,
    },
    {
      title: 'Top Used Folders',
      icon: 'folder_special',
      route: QUICKLINK_ROUTES.userTopUsedFolders,
    },
  ],
  explore: [
    {
      title: 'Trending Links',
      icon: 'trending_up',
      route: QUICKLINK_ROUTES.trending,
    },
  ],
  bottom: [
    { title: 'Archive', icon: 'inventory_2', route: QUICKLINK_ROUTES.archive },
  ],
};

// Main QuickLink Sidebar Component
const QuicklinkSidebar: FC = () => {
  const { parentDirs } = useQuickLinkDirectory();
  const departmentDir = parentDirs.filter(
    (dir) => dir.tabType === 'DEPARTMENT',
  );
  const commonResourcesDir = parentDirs.filter(
    (dir) => dir.tabType === 'COMMON_RESOURCES',
  );
  const [expanded, setExpanded] = useState<ExpandedState>({
    id: '',
    expanded: false,
  });
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user } = useUser();
  const router = useRouter();
  const { isCollapsed, isHamburgerOpen } = useAppSelector(
    (state) => state.quicklinksUi,
  );
  const isTablet = useMediaQuery(media.tablet);

  const handleExpand = (title: string) => {
    if (isCollapsed) {
      dispatch(setToggleSidebar(!isCollapsed));
      setExpanded({ id: title, expanded: true });
      return;
    }
    setExpanded((prev) => ({
      id: title,
      expanded: prev.id === title ? !prev.expanded : true,
    }));
  };

  const handleSectionClick = (section?: string) => {
    if (isCollapsed) {
      dispatch(setToggleSidebar(!isCollapsed));
      if (section === 'you') {
        router.push(QUICKLINK_ROUTES.userList);
      } else if (section === 'explore') {
        router.push(QUICKLINK_ROUTES.trending);
      }
    }
  };

  const sidebarContent = () => {
    return (
      <nav className="flex flex-col gap-2">
        {/* Dashboard */}
        <Link href={QUICKLINK_ROUTES.dashboard}>
          <SidebarNavItem
            nav={{
              title: 'Dashboard',
              icon: 'dashboard',
              route: QUICKLINK_ROUTES.dashboard,
            }}
            isActive={pathname?.includes(QUICKLINK_ROUTES.dashboard) || false}
            onClick={() => isTablet && dispatch(setHamburgerOpen(false))}
            isCollapsed={isCollapsed}
          />
        </Link>

        {/* Main Navigation Items */}
        {NAV_ITEMS.first.map((nav, index) => (
          <SidebarNavItem
            key={index}
            nav={nav}
            isActive={pathname?.includes(nav.route) || false}
            onClick={() => {
              handleExpand(nav.title);
            }}
            endIcon={
              !isCollapsed && (
                <span
                  className={`material-symbols-outlined transition-all ${
                    expanded.id === nav.title && expanded.expanded
                      ? 'rotate-180'
                      : ''
                  }`}
                >
                  keyboard_arrow_down
                </span>
              )
            }
            isCollapsed={isCollapsed}
          >
            {!isCollapsed && (
              <>
                {nav.title === "Departments" && (
                  <SidebarSubNav
                    dirs={departmentDir}
                    user={user}
                    route={nav.route}
                    isActive={expanded.id === nav.title && expanded.expanded}
                    dispatch={dispatch}
                    pathname={pathname}
                    isCollapsed={isCollapsed}
                    isTablet={isTablet}
                  />
                )}
                {nav.title === "Team Resources" && (
                  <SidebarSubNav
                    dirs={commonResourcesDir}
                    user={user}
                    route={nav.route}
                    isActive={expanded.id === nav.title && expanded.expanded}
                    dispatch={dispatch}
                    pathname={pathname}
                    isCollapsed={isCollapsed}
                    isTablet={isTablet}
                  />
                )}
              </>
            )}
          </SidebarNavItem>
        ))}

        <Divider />

        {/* You Section */}
        <div onClick={() => handleSectionClick('you')}>
          <CollapsedSection
            icon="person"
            title="You"
            items={NAV_ITEMS.you}
            pathname={pathname}
            isCollapsed={isCollapsed}
            isTablet={isTablet}
          />
        </div>

        <Divider />

        {/* Explore Section */}
        <div onClick={() => handleSectionClick('explore')}>
          <CollapsedSection
            icon="explore"
            title="Explore"
            items={NAV_ITEMS.explore}
            pathname={pathname}
            isCollapsed={isCollapsed}
            isTablet={isTablet}
          />
        </div>

        {/* Bottom Navigation */}
        <nav
          className={`${!isTablet && 'sticky bottom-0'} max-sm:mt-0 mt-6 w-full border-t bg-white py-2`}
        >
          <Link href={QUICKLINK_ROUTES.archive}>
            <div
              className={clsx(
                'flex items-center gap-4 rounded-2xl px-3 py-2  hover:bg-neutral-100',
                pathname?.includes(QUICKLINK_ROUTES.archive) &&
                  'bg-neutral-100',
                isCollapsed && 'justify-center',
              )}
              onClick={() => isTablet && dispatch(setHamburgerOpen(false))}
            >
              <span className="material-symbols-outlined">inventory_2</span>
              {!isCollapsed && <span>Archive</span>}
            </div>
          </Link>
        </nav>
      </nav>
    );
  };

  const handleClose = () => {
    dispatch(setHamburgerOpen(false));
    dispatch(setToggleSidebar(false));
  };

  return (
    <>
      <aside
        className={clsx(
          'fixed left-0 top-0 h-screen flex-1 overflow-y-auto px-3 transition-all duration-300 max-md:hidden',
          isCollapsed ? 'w-[72px]' : 'w-[256px]',
        )}
      >
        <div className="mt-[76px]" />
        {sidebarContent()}
      </aside>
      <Drawer
        anchor="left"
        open={isHamburgerOpen}
        onClose={handleClose}
        sx={{ '& .MuiDrawer-paper': { height: '100vh' } }}
      >
        <Box
          sx={{
            width: {
              xs: '100%',
              sm: '400px',
            },
            overflowX: 'hidden',
            overflowY: 'scroll',
            px: 1,
          }}
          role="presentation"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between bg-white py-4">
            <h6 className="text-xl font-bold">Quicklinks</h6>
            <IconButton
              onClick={handleClose}
              className="itemc-center flex justify-center"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '20px' }}
              >
                arrow_back_ios
              </span>
            </IconButton>
          </div>
          <div className="">
            <Link
              href={APP_ROUTES.home}
              className="mb-2 flex cursor-pointer items-center gap-4 rounded-3xl px-3 py-2"
            >
              <span className="material-symbols-outlined">home</span>Go To
              Home
            </Link>
            <Divider />
            {sidebarContent()}
            <Divider />
            <Link
              href={APP_ROUTES.logout}
              className="mt-2 flex cursor-pointer items-center gap-4 rounded-3xl px-3 py-2"
            >
              {' '}
              <span className="material-symbols-outlined">logout</span>Logout
            </Link>
          </div>
        </Box>
      </Drawer>
    </>
  );
};

// Sidebar Nav Item Component
const SidebarNavItem: FC<SidebarNavItemProps> = ({
  nav,
  isActive,
  children,
  onClick,
  endIcon,
  isCollapsed,
}) => (
  <li
    className={clsx(
      children ? 'flex flex-col items-start' : 'flex items-center',
      'mt-3 w-full cursor-pointer justify-between rounded-2xl',
    )}
  >
    <div
      className={clsx(
        'flex items-center rounded-3xl px-3 py-2 hover:bg-neutral-100',
        isActive && 'bg-neutral-100',
        isCollapsed ? 'w-11 justify-center' : 'w-full justify-between',
      )}
      onClick={onClick}
    >
      <div className={clsx('flex gap-4', isCollapsed && 'gap-0')}>
        <span className="material-symbols-outlined">{nav.icon}</span>
        {!isCollapsed && <span>{nav.title}</span>}
      </div>
      {!isCollapsed && endIcon}
    </div>
    {children}
  </li>
);

// Sidebar Sub Nav Component
const SidebarSubNav: FC<SidebarSubNavProps> = ({
  dirs,
  user,
  route,
  isActive,
  dispatch,
  pathname,
  isCollapsed,
  isTablet,
}) => (
  <ul
    className={clsx(
      'ml-3 flex w-full flex-col gap-2 overflow-hidden border-l px-2 transition-all',
      isActive ? 'max-h-full pt-4' : 'max-h-0',
    )}
  >
    {user?.isAdmin && (
      <li
        onClick={() => {
          dispatch(
            setModal({
              type: 'create-folder',
              data: {
                selectedDirectory: {
                  parentDirId: null,
                  root:
                    route === QUICKLINK_ROUTES.department
                      ? ROOTTYPE.DEPARTMENT
                      : ROOTTYPE.COMMON_RESOURCES,
                  tabType: null,
                },
              },
            }),
          );
          isTablet && dispatch(setHamburgerOpen(false));
        }}
        className="flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-dotted px-3 py-2"
      >
        <span className="material-symbols-outlined">add</span>
        <span>Add New Folder</span>
      </li>
    )}
    {dirs.map((dir) => (
      <Link
        href={`${route}/${dir.slug}`}
        key={dir.id}
        onClick={() => isTablet && dispatch(setHamburgerOpen(false))}
      >
        <li
          className={clsx(
            'flex items-center justify-between rounded-2xl px-3 py-2 hover:bg-neutral-100',
            dir.isArchive && 'hidden',
            pathname === `${route}/${dir.slug}` && 'bg-neutral-100',
          )}
        >
          <div className="flex gap-4">
            <span className="material-symbols-outlined">{dir.logo}</span>
            <span>{dir.title}</span>
          </div>
          {user?.isAdmin && (
            <Tooltip
              title="Move to archive"
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
                dispatch(
                  handleDeleteDirectory({
                    directory: dir,
                    parentId: dir.parentDirId,
                  }),
                );
              }}
            >
              <span className="material-symbols-outlined hidden opacity-50 hover:scale-110 group-hover:!block">
                archive
              </span>
            </Tooltip>
          )}
        </li>
      </Link>
    ))}
  </ul>
);

// Collapsed Section Component
interface CollapsedSectionProps {
  icon: string;
  title: string;
  items: NavItem[];
  pathname: string | null;
  isCollapsed: boolean;
  isTablet?: boolean;
}

const CollapsedSection: FC<CollapsedSectionProps> = ({
  icon,
  title,
  items,
  pathname,
  isCollapsed,
  isTablet,
}) => (
  <div className={clsx('cursor-pointer', isCollapsed ? 'px-3' : 'px-0')}>
    {isCollapsed ? (
      <div className="flex justify-center py-2">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
    ) : (
      <NavSection
        title={title}
        items={items}
        pathname={pathname}
        isTablet={isTablet}
      />
    )}
  </div>
);

interface NavSectionProps {
  title?: string;
  items: NavItem[];
  pathname: string | null;
  isTablet?: boolean;
}

const NavSection: FC<NavSectionProps> = ({
  title,
  items,
  pathname,
  isTablet,
}) => {
  const dispatch = useAppDispatch();

  return (
    <>
      {title && <h6 className="mb-1 ml-3 font-bold">{title}</h6>}
      <ul className="flex flex-col gap-2">
        {items.map((nav, index) => (
          <Link
            href={nav.route}
            key={index}
            onClick={() => isTablet && dispatch(setHamburgerOpen(false))}
          >
            <li
              className={clsx(
                'flex items-center gap-4 rounded-2xl px-3 py-2 hover:bg-neutral-100',
                pathname?.includes(nav.route) && 'bg-neutral-100',
              )}
            >
              <span className="material-symbols-outlined">{nav.icon}</span>
              <span>{nav.title}</span>
            </li>
          </Link>
        ))}
      </ul>
    </>
  );
};

export default QuicklinkSidebar;
