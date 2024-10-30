"use client";

import { APP_ROUTES, AppRoutesHelper } from "@/utils/constants/appInfo";
import { useUser } from "@/utils/hooks/useUser";
import { USERTYPE } from "@prisma/client";
import { usePathname, useRouter } from "next/navigation";
import { PortalSdk } from "@/utils/services/PortalSdk";
import Image from "next/image";
import Link from "next/link";
import { useMediaQuery, Badge } from "@mui/material";
import media from "@/styles/media";
import { useNotifications } from "@/utils/hooks/useNotifications";
import { useEffect, useRef, useState } from "react";
import NotificationModal from "./NotificationModal";
import { useAppSelector } from "@/utils/redux/store";
import { INotification } from "../screens/notifications/NotificationsList";

const NAVIGATION_OPTIONS = [
  {
    name: "Home",
    path: APP_ROUTES.home,
    icon: "perm_identity",
  },
  {
    name: "Worklogs",
    path: APP_ROUTES.userWorklogs,
    icon: "task_alt",
  },
  {
    name: "Houses",
    path: APP_ROUTES.houses,
    icon: "category",
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
    name: "Notifications",
    path: APP_ROUTES.notifications,
    icon: "notifications",
  },
];

const CLIENT_NAVIGATION_OPTIONS = [
  {
    name: "Home",
    path: APP_ROUTES.home,
    icon: "perm_identity",
  },
  {
    name: "Engagements",
    path: APP_ROUTES.engagements,
    icon: "task_alt",
  },
  {
    name: "Referrals",
    path: APP_ROUTES.referrals,
    icon: "group_add",
  },
  // {
  //   name: "Growth",
  //   path: APP_ROUTES.growth,
  //   icon: "trending_up",
  // },
  {
    name: "Notifications",
    path: APP_ROUTES.notifications,
    icon: "notifications",
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
    visibleOnlyOn ? visibleOnlyOn : media.default
  );
  const isMobile = useMediaQuery(media.largeMobile);
  const { unreadNotificationsCount } = useNotifications();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [workLogId, setWorkLogId] = useState<string | null>(null);
  const [loadingWorkLog, setLoadingWorkLog] = useState<boolean>(true);

  const options =
    user?.userType === USERTYPE.CLIENT
      ? CLIENT_NAVIGATION_OPTIONS
      : NAVIGATION_OPTIONS;
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
        const currentDate = new Date().toISOString().split("T")[0];
        try {
          const data = await PortalSdk.getData(`/api/user/worklogs?date=${currentDate}&userId=${user?.id}`, null);
          const id = data?.data?.workLogs?.[0]?.id || null;
          setWorkLogId(id);
        } catch (error) {
          console.error("Error fetching worklogs:", error);
        } finally {
          setLoadingWorkLog(false); // Set loading to false after fetching
        }
      }
    };

    fetchWorkLogs();
  }); 
  const workLogClick = (path: string) => {
    if (isMobile && workLogId && !loadingWorkLog) { // Check for loading state
      const currentDate = new Date().toISOString().split("T")[0];
      router.push(`${path}/${workLogId}?logType=dayLog&date=${currentDate}`);
    } else {
      router.push(APP_ROUTES.userWorklogs);
    }
  };

  return (
    <div
      className={`flex flex-row fixed bottom-0 left-0 right-0 py-1 px-1 max-md:mx-1 max-md:my-1 gap-6 z-10 bg-neutral-900 max-md:rounded-2xl md:bottom-auto md:left-0 md:top-0 md:flex-col md:w-20 md:h-full md:fixed-none bottombar`}
      id="home-bottombar"
    >
      <Link href={APP_ROUTES.home}>
        <Image
          src="/logo/logo_white.png"
          alt="Moon Portal Logo"
          width={100}
          height={100}
          className="w-12 h-12 mx-auto my-4 rounded max-md:hidden "
        />
      </Link>
      {options.map((option) => (
        <div
          onClick={() => {
            if (option.name === "Notifications") {
              handleNotificationClick();
            }
            else if (option.name === "Worklogs") {
              workLogClick(option.path);
            } 
             else {
              router.push(option.path);
            }
          }}
          key={option.path}
          className={` ${
            option.path === path ? "bg-white text-black" : "bg-black text-white"
          } flex flex-col items-center justify-center py-1 w-1/3 cursor-pointer rounded-2xl md:w-full`}
        >
            <Badge
              badgeContent={
                option.name === "Notifications" ? unreadNotificationsCount : 0
              }
              color="error"
              max={20}
              invisible={!unreadNotificationsCount}
            >
              <span
                className={` ${
                  option.path === path ? "text-black" : "text-white"
                } font-thin material-icons-outlined text-md `}
              >
                {option.icon}
              </span>
            </Badge>
          <p className="text-[0.5em] opacity-75">{option.name}</p>
        </div>
      ))}{" "}
      <Link href={APP_ROUTES.logout}>
        <button
          className={`flex flex-col text-md items-center justify-center py-1 cursor-pointer rounded-2xl w-[90%] max-md:hidden absolute bottom-5 bg-black hover:bg-neutral-700 `}
        >
          <span className="material-symbols-outlined text-white">logout</span>
          <span className="text-[0.5em] opacity-75 text-white max-md:hidden">
            Logout
          </span>
        </button>
      </Link>
      <NotificationModal open={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
};
