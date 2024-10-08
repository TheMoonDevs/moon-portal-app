"use client";

import store, { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { useQuickLinkDirs } from "../../hooks/useQuickLinksDirs";
import { SubDirectoryLinks } from "../ParentDirectory/SubDirectoryLinks";
import { useEffect, useRef, useState } from "react";
import QuicklinkHeaderWrapper from "../../global/QuicklinkHeaderWrapper";
import { usePathname } from "next/navigation";
import { useQuickLinkDirectory } from "../../hooks/useQuickLinkDirectory";
import ListOfDirectories from "../../DirectoryList";
import { setActiveDirectoryId } from "@/utils/redux/quicklinks/slices/quicklinks.directory.slice";
import { setAllQuicklinks } from "@/utils/redux/quicklinks/slices/quicklinks.links.slice";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import useFetchQuicklinksByDir from "../../hooks/useFetchQuicklinksByDir";
import { CircularProgress } from "@mui/material";

export const DepartmentLinksByDirId = ({
  directoryId,
}: {
  directoryId: string;
}) => {
  const initialize = useRef(false);
  const dispatch = useAppDispatch();
  if (!initialize.current) {
    store.dispatch(setActiveDirectoryId(directoryId));
    initialize.current = true;
  }
  const pathname = usePathname();
  const pathArray = pathname?.split("/");
  const basePath = pathArray?.slice(0, -1).join("/");
  const { allQuicklinks } = useAppSelector((state) => state.quicklinksLinks);
  const { activeDirectoryId, directories } = useQuickLinkDirectory();
  const { thisDirectory } = useQuickLinkDirs(activeDirectoryId);
  const filteredDirectories = directories.filter(
    (directory) => directory.parentDirId === activeDirectoryId
  );
  const { loading } = useFetchQuicklinksByDir({ isRootDirectory: false });

  if (loading)
    return (
      <div className="flex justify-center items-center w-full">
        <CircularProgress color="inherit" />
      </div>
    );

  return (
    <div>
      <QuicklinkHeaderWrapper
        title={thisDirectory?.title || ""}
        icon="group"
        withBreadcrumb={{
          rootType: "DEPARTMENT",
        }}
      />

      {allQuicklinks.length === 0 && filteredDirectories.length === 0 ? (
        <div className="w-full flex items-center justify-center h-full">
          Start by adding a folder or link
        </div>
      ) : (
        <div className="flex gap-10">
          <div className="mt-4 flex justify-stretch gap-6 w-[70%]">
            <div className="w-full">
              <SubDirectoryLinks loading={loading} />
            </div>
          </div>
          <div className="my-8 w-[30%]">
            <h1 className="text-xl font-bold">Folders</h1>
            <ListOfDirectories
              view="listView"
              pathname={basePath}
              directories={filteredDirectories}
            />
          </div>
        </div>
      )}
    </div>
  );
};
