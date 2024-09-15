"use client";

import { CircularProgress } from "@mui/material";
import { Link as Quicklink } from "@prisma/client";

import { ViewButtonGroup } from "./ViewButtonGroup";
import { LinkItem } from "./LinkItem";
import { useAppSelector } from "@/utils/redux/store";

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

  return (
    <>
      <div className={`w-full ${inSearchBar ? "overflow-hidden" : ""}`}>
        {allQuicklinks?.length === 0 && isLoading && (
          <div className="w-full flex justify-center h-52 items-center ">
            <CircularProgress color="inherit" />
          </div>
        )}

        {allQuicklinks?.length === 0 && !isLoading ? (
          <div className="w-full flex justify-center h-52 items-center ">
            Nothing to show
          </div>
        ) : (
          <div
            className={`${
              (currentView === VIEW.list && withView === "all") ||
              (withView === "list"
                ? "flex flex-col"
                : withView === "widget"
                ? "flex flex-row flex-wrap gap-2"
                : "flex flex-row flex-wrap gap-2")
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
