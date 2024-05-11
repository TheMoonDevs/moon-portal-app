"use client";

import { CircularProgress } from "@mui/material";
import { Link as Quicklink } from "@prisma/client";

import { ViewButtonGroup } from "./ViewButtonGroup";
import { LinkItem } from "./LinkItem";

export enum VIEW {
  list = "list",
  group = "group",
  thumbnail = "thumbnail",
}

export type withView = "all" | "group" | "list" | "thumbnail";

export default function LinkList({
  allQuicklinks,
  withView = "all",
  isLoading,
}: {
  allQuicklinks?: Quicklink[];
  withView?: withView;
  isLoading?: boolean;
}) {
  return (
    <>
      <div className="w-full">
        {withView === "all" && <ViewButtonGroup />}
        {allQuicklinks?.length === 0 && isLoading && (
          <div className="w-full flex justify-center h-52 items-center ">
            <CircularProgress color="inherit" />
          </div>
        )}

        <LinkItem
          allQuicklinks={allQuicklinks}
          withView={withView}
          isLoading={isLoading}
        />
      </div>
    </>
  );
}
