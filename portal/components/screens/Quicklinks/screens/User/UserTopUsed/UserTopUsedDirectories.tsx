"use client";

import { useUser } from "@/utils/hooks/useUser";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { USERDIRECTORYTYPE } from "@prisma/client";
import { useEffect } from "react";
import ListOfDirectories from "../../../DirectoryList";
import { setTopUsedDirectoryList } from "@/utils/redux/quicklinks/slices/quicklinks.directory.slice";
import { useQuickLinkDirectory } from "../../../hooks/useQuickLinkDirectory";

const UserTopUsedDirectories = ({
  withTitle = true,
  view = "gridView",
}: {
  withTitle?: boolean;
  view?: "listView" | "gridView";
}) => {
  const { user } = useUser();
  const { topUsedDirectoryList } = useAppSelector(
    (state) => state.quicklinksDirectory
  );
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!user) return;
    const getTopUsedDirectories = async () => {
      try {
        const userTopUsedDirectories = await QuicklinksSdk.getData(
          `/api/quicklinks/directory-list/user-directory?userId=${user.id}&directoryType=${USERDIRECTORYTYPE.OTHER}`
        );
        const sortedByClickCount = userTopUsedDirectories.sort(
          (a: any, b: any) => {
            return b.clickCount - a.clickCount;
          }
        );

        dispatch(
          setTopUsedDirectoryList(
            sortedByClickCount.map((dir: any) => dir.directoryData)
          )
        );
      } catch (error) {
        console.log(error);
      }
    };

    getTopUsedDirectories();
  }, [user, dispatch]);

  return (
    <div>
      {withTitle && (
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-4">
            <span className="material-symbols-outlined border border-neutral-200 rounded-full p-2">
              history
            </span>{" "}
            <span>Top Used Folders</span>
          </h1>
        </div>
      )}
      <ListOfDirectories view={view} directories={topUsedDirectoryList} />
    </div>
  );
};

export default UserTopUsedDirectories;
