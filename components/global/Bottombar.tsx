"use client";

import { APP_ROUTES } from "@/utils/constants/appInfo";
import { usePathname, useRouter } from "next/navigation";

const NAVIGATION_OPTIONS = [
  {
    name: "Home",
    path: APP_ROUTES.home,
    icon: "perm_identity",
  },
  {
    name: "Teams",
    path: APP_ROUTES.teams,
    icon: "workspaces",
  },
  {
    name: "Engagements",
    path: APP_ROUTES.engagements,
    icon: "format_overline",
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

export const Bottombar = () => {
  const path = usePathname();
  const router = useRouter();

  if (path?.startsWith("/admin")) return null;
  return (
    <div className="flex flex-row fixed bottom-0 left-0 right-0 py-1 px-1 mx-1 my-1 gap-6 bg-neutral-900 rounded-[1.15em]">
      {NAVIGATION_OPTIONS.map((option) => (
        <div
          onClick={() => {
            router.push(option.path);
          }}
          key={option.path}
          className={` ${
            option.path === path ? "bg-white text-black" : "bg-black text-white"
          } flex flex-col items-center justify-center py-1 w-1/3 cursor-pointer rounded-[1em]`}
        >
          <span
            className={` ${
              option.path === path ? "text-black" : "text-white"
            } font-thin material-icons-outlined text-md `}
          >
            {option.icon}
          </span>
          <p className="text-[0.5em] opacity-[0.75]">{option.name}</p>
        </div>
      ))}
    </div>
  );
};
