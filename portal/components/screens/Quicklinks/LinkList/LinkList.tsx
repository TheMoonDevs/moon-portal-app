"use client";

import { Button, CircularProgress } from "@mui/material";
import { Link as Quicklink } from "@prisma/client";

import { ViewButtonGroup } from "./ViewButtonGroup";
import { LinkItem } from "./LinkItem";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import Image from "next/image";
import { setIsCreateLinkModalOpen } from "@/utils/redux/quicklinks/slices/quicklinks.ui.slice";

export enum VIEW {
  list = "list",
  group = "widget",
  thumbnail = "thumbnail",
  line = "line",
}

export type withView = "all" | "widget" | "list" | "thumbnail" | "line";

export default function LinkList({
  allQuicklinks,
  withView = "all",
  isLoading,
  inSearchBar,
}: {
  allQuicklinks?: Quicklink[];
  withView?: withView;
  isLoading?: boolean;
  inSearchBar?: boolean;
}) {
  const { currentView } = useAppSelector((state) => state.quicklinksUi);
  const dispatch = useAppDispatch();
  return (
    <>
      <div className={`w-full ${inSearchBar ? "overflow-hidden" : ""}`}>
        {allQuicklinks?.length === 0 && isLoading && (
          <div className="w-full flex justify-center h-52 items-center ">
            <CircularProgress color="inherit" />
          </div>
        )}

        {allQuicklinks?.length === 0 && !isLoading ? (
          <div className="w-full flex flex-col justify-center h-[500px] items-center ">
            <Image
              className="rounded-full object-cover"
              src="/images/nothing-2.png"
              alt="No data"
              width={300}
              height={300}
            />
            <div>
              <h1 className="text-gray-400 text-lg">No Quicklink was found!</h1>
            </div>
            <div className="flex items-center gap-5">
              <h1 className="text-gray-400 text-base">
                Press{" "}
                <span className="border-b-2 border-blue-500 border-dashed text-blue-500 text-sm font-semibold">
                  Ctrl + V
                </span>{" "}
                to add one
              </h1>
            </div>
          </div>
        ) : (
          <div
            className={`pb-6 ${
              (currentView === VIEW.list && withView === "all") ||
              (withView === "list"
                ? "flex flex-col"
                : currentView === "thumbnail"
                ? "flex flex-row flex-wrap gap-5"
                : "grid grid-cols-3 gap-2")
            } gap-10  w-full`}
          >
            {allQuicklinks?.map((link) => (
              <LinkItem
                key={link.id}
                link={link}
                withView={withView}
                isLoading={isLoading}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
