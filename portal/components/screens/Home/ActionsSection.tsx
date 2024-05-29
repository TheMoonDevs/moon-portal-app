import { APP_ROUTES } from "@/utils/constants/appInfo";
import Link from "next/link";
import React from "react";

export const ActionsSection = () => {
  return (
    <div className=" flex flex-col mx-3 mt-6 gap-3 border border-neutral-400 rounded-[1.15em]">
      <div className="flex flex-col ">
        <Link href={APP_ROUTES.userWorklogs}>
          <div className="text-xl flex flex-row items-center gap-4 border-b border-neutral-400 px-5 py-3">
            <span className="icon_size text-neutral-800 icon_size material-icons-outlined">
              update
            </span>
            <p className="font-regular text-[0.75em] mb-0">
              Check Your Worklogs
            </p>
            <span className="ml-auto icon_size text-neutral-800 icon_size material-icons-outlined">
              chevron_right
            </span>
          </div>
        </Link>
        <Link href={APP_ROUTES.home}>
          <div className="text-xl flex flex-row items-center gap-4 border-b border-neutral-400 px-5 py-3">
            <span className="icon_size text-neutral-800 icon_size material-icons">
              timeline
            </span>
            <p className="font-regular text-[0.75em] mb-0">Tasks In Progress</p>
            <span className="ml-auto icon_size text-neutral-800 icon_size material-icons-outlined">
              chevron_right
            </span>
          </div>
        </Link>
        <Link href={APP_ROUTES.home}>
          <div className="text-xl flex flex-row items-center gap-4 border-b border-neutral-400 px-5 py-3">
            <span className="icon_size text-neutral-800 icon_size material-icons">
              price_check
            </span>
            <p className="font-regular text-[0.75em] mb-0">Your Earnings</p>
            <span className="ml-auto icon_size text-neutral-800 icon_size material-icons-outlined">
              chevron_right
            </span>
          </div>
        </Link>
        <Link href={APP_ROUTES.home}>
          <div className="text-xl flex flex-row items-center gap-4 border-b border-neutral-400 px-5 py-3">
            <span className="icon_size text-neutral-800 icon_size material-icons">
              all_inclusive
            </span>
            <p className="font-regular text-[0.75em] mb-0">
              Work & Expertise Profile
            </p>
            <span className="ml-auto icon_size text-neutral-800 icon_size material-icons-outlined">
              chevron_right
            </span>
          </div>
        </Link>
        <Link href={APP_ROUTES.home}>
          <div className="text-xl flex flex-row items-center gap-4 px-5 py-3">
            <span className="icon_size text-neutral-800 icon_size material-icons-outlined">
              diamond
            </span>
            <p className="font-regular text-[0.75em] mb-0">
              Badges & Achievements
            </p>
            <span className="ml-auto icon_size text-neutral-800 icon_size material-icons-outlined">
              chevron_right
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
};
