"use client";
import { QUICKLINK_ROUTES } from "@/utils/constants/appInfo";
import Link from "next/link";
import { useQuickLinkDirectory } from "../../hooks/useQuickLinkDirectory";
import { useState, FC, ReactNode, MouseEvent } from "react";
import { usePathname } from "next/navigation";
import { useAppDispatch } from "@/utils/redux/store";
import { Divider, Tooltip } from "@mui/material";
import { useUser } from "@/utils/hooks/useUser";
import { setModal } from "@/utils/redux/quicklinks/slices/quicklinks.ui.slice";
import { DirectoryList, ROOTTYPE } from "@prisma/client";
import {
  deleteDirectory,
  updateDirectory,
} from "@/utils/redux/quicklinks/slices/quicklinks.directory.slice";
import { handleDeleteDirectory } from "@/utils/redux/quicklinks/quicklinks.thunks";

// Types for constants and props
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
}

interface SidebarSubNavProps {
  dirs: DirectoryList[];
  user: any;
  route: string;
  isActive: boolean;
  dispatch: ReturnType<typeof useAppDispatch>;
  pathname: string | null;
}

interface ExpandedState {
  id: string;
  expanded: boolean;
}

// Constants for default directories and navigation items
const ROOT_DIRECTORIES: Omit<DirectoryList, "timestamp">[] = [
  {
    id: "root-my-dashboard",
    title: "My Dashboard",
    parentDirId: null,
    slug: "/dashboard",
    logo: "dashboard",
    position: 10,
    isArchive: false,
    clickCount: 0,
    tabType: null,
    type: null,
  },
  {
    id: "COMMON_RESOURCES",
    title: "Team Resources",
    parentDirId: null,
    slug: "/common-resources",
    logo: "stack",
    position: 20,
    isArchive: false,
    clickCount: 0,
    tabType: null,
    type: null,
  },
  {
    id: "DEPARTMENT",
    title: "Departments",
    parentDirId: null,
    slug: "/department",
    logo: "groups",
    position: 20,
    isArchive: false,
    clickCount: 0,
    tabType: null,
    type: null,
  },
];

const NAV_ITEMS = {
  first: [
    {
      title: "Departments",
      icon: "groups",
      route: QUICKLINK_ROUTES.department,
    },
    {
      title: "Team Resources",
      icon: "stack",
      route: QUICKLINK_ROUTES.commonResources,
    },
  ],
  you: [
    { title: "My List", icon: "list", route: QUICKLINK_ROUTES.userList },
    {
      title: "Top Used Links",
      icon: "link",
      route: QUICKLINK_ROUTES.userTopUsedLinks,
    },
    {
      title: "Recent Folders",
      icon: "history",
      route: QUICKLINK_ROUTES.userRecentlyUsedFolders,
    },
    {
      title: "Top Used Folders",
      icon: "folder_special",
      route: QUICKLINK_ROUTES.userTopUsedFolders,
    },
  ],
  explore: [
    {
      title: "Trending Links",
      icon: "trending_up",
      route: QUICKLINK_ROUTES.trending,
    },
  ],
  bottom: [
    { title: "Archive", icon: "inventory_2", route: QUICKLINK_ROUTES.archive },
  ],
};

// Sidebar navigation item component
const SidebarNavItem: FC<SidebarNavItemProps> = ({
  nav,
  isActive,
  children,
  onClick,
  endIcon,
}) => (
  <li
    className={`${
      children ? "flex flex-col items-start" : "flex items-center"
    } justify-between  cursor-pointer rounded-2xl w-full `}
  >
    <div
      className={`flex justify-between hover:bg-neutral-100 items-center py-2 px-3 rounded-3xl w-full ${
        isActive && "bg-neutral-100"
      }`}
      onClick={onClick}
    >
      <div className="flex gap-4">
        <span className="material-symbols-outlined">{nav.icon}</span>
        <span>{nav.title}</span>
      </div>
      {endIcon && endIcon}
    </div>
    {children}
  </li>
);

// Sidebar sub-navigation component
const SidebarSubNav: FC<SidebarSubNavProps> = ({
  dirs,
  user,
  route,
  isActive,
  dispatch,
  pathname,
}) => (
  <ul
    className={`flex flex-col gap-2 ml-3 border-l px-2  overflow-hidden transition-all w-full ${
      isActive ? "pt-4 max-h-full" : "max-h-0"
    }`}
  >
    {user?.isAdmin && (
      <li
        onClick={() =>
          dispatch(
            setModal({
              type: "create-folder",
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
            })
          )
        }
        className="flex gap-2 items-center py-2 px-3 border-2 border-dotted cursor-pointer rounded-2xl"
      >
        <span className="material-symbols-outlined">add</span>
        <span>Add New Folder</span>
      </li>
    )}
    {dirs.map((dir) => (
      <Link href={`${route}/${dir.slug}`} key={dir.id}>
        <li
          className={`flex items-center justify-between py-2 pr-3 hover:bg-neutral-100 rounded-2xl ${
            dir.isArchive ? "hidden" : ""
          } ${pathname === `${route}/${dir.slug}` ? "bg-neutral-100" : ""}`}
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
                  })
                );
              }}
            >
              <span className="material-symbols-outlined opacity-50 group-hover:!block hidden hover:scale-110">
                archive
              </span>
            </Tooltip>
          )}
        </li>
      </Link>
    ))}
  </ul>
);

const QuicklinkSidebar: FC = () => {
  const { parentDirs } = useQuickLinkDirectory();
  const departmentDir = parentDirs.filter(
    (dir) => dir.tabType === "DEPARTMENT"
  );
  const commonResourcesDir = parentDirs.filter(
    (dir) => dir.tabType === "COMMON_RESOURCES"
  );

  const [expanded, setExpanded] = useState<ExpandedState>({
    id: "",
    expanded: false,
  });
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user } = useUser();

  const handleExpand = (title: string) => {
    setExpanded((prev) => ({
      id: title,
      expanded: prev.id === title ? !prev.expanded : true,
    }));
  };

  return (
    <aside className="px-3 fixed left-0 top-0 w-[256px] flex-1 overflow-y-auto h-screen">
      <div className="mt-[76px]" />
      <nav className="flex flex-col gap-2">
        <Link href={QUICKLINK_ROUTES.dashboard}>
          <SidebarNavItem
            nav={{
              title: "Dashboard",
              icon: "dashboard",
              route: QUICKLINK_ROUTES.dashboard,
            }}
            isActive={pathname?.includes(QUICKLINK_ROUTES.dashboard) || false}
          />
        </Link>

        {NAV_ITEMS.first.map((nav, index) => (
          <SidebarNavItem
            key={index}
            nav={nav}
            isActive={pathname?.includes(nav.route) || false}
            onClick={() => handleExpand(nav.title)}
            endIcon={
              <span
                className={`material-symbols-outlined transition-all ${
                  expanded.id === nav.title && expanded.expanded
                    ? "rotate-180"
                    : ""
                }`}
              >
                keyboard_arrow_down
              </span>
            }
          >
            {nav.title === "Departments" && (
              <SidebarSubNav
                dirs={departmentDir}
                user={user}
                route={nav.route}
                isActive={expanded.id === nav.title && expanded.expanded}
                dispatch={dispatch}
                pathname={pathname}
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
              />
            )}
          </SidebarNavItem>
        ))}

        <Divider />
        <NavSection title="You" items={NAV_ITEMS.you} pathname={pathname} />
        <Divider />
        <NavSection
          title="Explore"
          items={NAV_ITEMS.explore}
          pathname={pathname}
        />

        <nav className="sticky bottom-0 bg-white py-2 w-full border-t mt-6">
          <NavSection items={NAV_ITEMS.bottom} pathname={pathname} />
        </nav>
      </nav>
    </aside>
  );
};

// Reusable section component for navigation
interface NavSectionProps {
  title?: string;
  items: NavItem[];
  pathname: string | null;
}

const NavSection: FC<NavSectionProps> = ({ title, items, pathname }) => (
  <>
    {title && <h6 className="font-bold ml-3 mb-1">{title}</h6>}
    <ul className="flex flex-col gap-2">
      {items.map((nav, index) => (
        <Link href={nav.route} key={index}>
          <li
            className={`flex items-center gap-4 py-2 px-3 hover:bg-neutral-100 rounded-2xl ${
              pathname?.includes(nav.route) && "bg-neutral-100"
            }`}
          >
            <span className="material-symbols-outlined">{nav.icon}</span>
            <span>{nav.title}</span>
          </li>
        </Link>
      ))}
    </ul>
  </>
);

export default QuicklinkSidebar;
