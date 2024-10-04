"use client";

import { useUser } from "@/utils/hooks/useUser";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import {
  DirectoryList,
  UserDirectory,
  USERDIRECTORYTYPE,
} from "@prisma/client";
import { use, useEffect, useState } from "react";
import ListOfDirectories from "../../../DirectoryList";
import { useQuickLinkDirectory } from "../../../hooks/useQuickLinkDirectory";
import { setRecentlyUsedDirectoryList } from "@/utils/redux/quicklinks/slices/quicklinks.directory.slice";

const UserRecentlyUsedDirectories = ({
  withTitle = true,
  view = "gridView",
}: {
  withTitle?: boolean;
  view?: "listView" | "gridView";
}) => {
  const { user } = useUser();

  const dispatch = useAppDispatch();

  const { recentlyUsedDirectoryList } = useAppSelector(
    (state) => state.quicklinksDirectory
  );

  useEffect(() => {
    if (!user) return;
    const getRecentlyUsedDirectories = async () => {
      try {
        const userFavoriteDirectories = await QuicklinksSdk.getData(
          `/api/quicklinks/directory-list/user-directory?userId=${user.id}&directoryType=${USERDIRECTORYTYPE.OTHER}`
        );

        const sortedByTimeStamp = userFavoriteDirectories.sort(
          (a: UserDirectory, b: UserDirectory) => {
            return (
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          }
        );

        dispatch(
          setRecentlyUsedDirectoryList(
            sortedByTimeStamp.map((dir: any) => dir.directoryData)
          )
        );
      } catch (error) {
        console.log(error);
      }
    };
    getRecentlyUsedDirectories();
  }, [dispatch, user]);

  return (
    <div>
      {withTitle && (
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-4">
            <span className="material-symbols-outlined border border-neutral-200 rounded-full p-2">
              history
            </span>{" "}
            <span>Recently Used Folders</span>
          </h1>
        </div>
      )}
      <ListOfDirectories view={view} directories={recentlyUsedDirectoryList} />
    </div>
  );
};

export default UserRecentlyUsedDirectories;
