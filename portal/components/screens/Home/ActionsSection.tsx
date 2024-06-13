/* eslint-disable @next/next/no-img-element */
import { APP_ROUTES, APP_SOCIAL } from "@/utils/constants/appInfo";
import Link from "next/link";
import React from "react";

const Links = [
  {
    icon: "/images/thirdparty/bolt.avif",
    title: "QuickLinks Directory",
    route: APP_ROUTES.quicklinksDashboard,
    active: true,
    color: "rose",
    openNew: false,
  },
  {
    icon: "task_alt",
    title: "All My Worklogs",
    route: APP_ROUTES.userWorklogs,
    active: true,
    color: "green",
  },
  {
    icon: "calendar_month",
    title: "Events & Availabilities",
    route: APP_ROUTES.userZeroTracker,
    active: true,
    color: "blue",
  },
  {
    icon: "open_in_new",
    title: "URL Shortener",
    route: APP_ROUTES.urlShortener,
    active: true,
    color: "rose",
  },
  {
    icon: "/images/thirdparty/up.jpg",
    title: "Upload & Share Files",
    route: APP_ROUTES.fileUploads,
    active: true,
    color: "blue",
  },
  {
    icon: "/images/thirdparty/slack.png",
    title: "Chat with the Team",
    route: APP_SOCIAL.slack,
    active: true,
    color: "fuchsia",
    openNew: true,
  },
  {
    icon: "/images/thirdparty/clickup.webp",
    title: "Assign Tasks to Team",
    route: APP_SOCIAL.clickup,
    active: true,
    color: "fuchsia",
    openNew: true,
  },
  // {
  //   icon: "timeline",
  //   title: "Tasks In Progress",
  //   route: APP_ROUTES.home,
  // },
  {
    icon: "price_check",
    title: "Your Earnings",
    route: APP_ROUTES.home,
  },
  {
    icon: "all_inclusive",
    title: "Work & Expertise Profile",
    route: APP_ROUTES.home,
  },
  {
    icon: "diamond",
    title: "Badges & Achievements",
    route: APP_ROUTES.home,
  },
];
export const ActionsSection = () => {
  return (
    <div className=" flex flex-col mx-3 mt-6 gap-3 border border-neutral-400 rounded-[1.15em] overflow-hidden">
      <div className="flex flex-col ">
        {Links.map((link) => (
          <Link
            key={link.title}
            href={link.route}
            target={link.openNew ? "_blank" : "_self"}
          >
            <div
              className={`text-xl flex flex-row items-center gap-4 border-b border-neutral-200 ${
                link.active ? "bg-white hover:bg-white/70" : ""
              }  px-5 py-3`}
            >
              {link.icon.startsWith("/") ? (
                <img
                  src={link.icon}
                  alt={link.title}
                  className="w-8 h-8 ml-[-5px] mr-[-5px] object-contain object-center rounded-full"
                />
              ) : (
                <span
                  className={`icon_size  material-symbols-outlined text-${link.color}-500`}
                >
                  {link.icon}
                </span>
              )}

              <p className="font-regular text-[0.75em] mb-0">{link.title}</p>
              <span className="ml-auto icon_size text-neutral-800 icon_size material-symbols-outlined">
                {link.active ? "chevron_right" : "history_toggle_off"}
              </span>
            </div>
          </Link>
        ))}
      </div>
      <span className="hidden text-fuchsia-500 text-rose-500"></span>
    </div>
  );
};
