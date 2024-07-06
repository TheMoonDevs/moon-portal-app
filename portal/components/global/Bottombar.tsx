"use client";

import { APP_ROUTES, AppRoutesHelper } from "@/utils/constants/appInfo";
import { useUser } from "@/utils/hooks/useUser";
import { USERTYPE } from "@prisma/client";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useMediaQuery } from "@mui/material";
import media from "@/styles/media";

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
    name: "Teams",
    path: APP_ROUTES.teams,
    icon: "workspaces",
  },
  {
    name: "Growth",
    path: APP_ROUTES.growth,
    icon: "trending_up",
  },
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

  const options =
    user?.userType === USERTYPE.CLIENT
      ? CLIENT_NAVIGATION_OPTIONS
      : NAVIGATION_OPTIONS;
  if (!visible && !visibleOnlyOn) return null;
  if (visibleOnlyOn && !visibleOnlyOnResponsiveSizes) return null;
  //if (!AppRoutesHelper.bottomBarShown(path)) return null;

  return (
    <div
      id="home-bottombar"
      className={`flex flex-row fixed bottom-0 left-0 right-0 py-1 px-1 max-md:mx-1 max-md:my-1 gap-6 z-10 bg-neutral-900 max-md:rounded-2xl md:bottom-auto md:left-0 md:top-0 md:flex-col md:w-20 md:h-full md:fixed-none`}
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
            router.push(option.path);
          }}
          key={option.path}
          className={` ${
            option.path === path ? "bg-white text-black" : "bg-black text-white"
          } flex flex-col items-center justify-center py-1 w-1/3 cursor-pointer rounded-2xl md:w-full`}
        >
          <span
            className={` ${
              option.path === path ? "text-black" : "text-white"
            } font-thin material-icons-outlined text-md `}
          >
            {option.icon}
          </span>
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
    </div>
  );
};
