"use client";

import store, { useAppSelector } from "@/utils/redux/store";
import { ParentDirectoryLinks } from "../ParentDirectory/ParentDirectoryLinks";
import { useQuickLinkDirs } from "../../hooks/useQuickLinksDirs";
import { useRef } from "react";
import QuicklinkHeaderWrapper from "../../global/QuicklinkHeaderWrapper";
import { usePathname } from "next/navigation";
import ListOfDirectories from "../../DirectoryList";
import { useQuickLinkDirectory } from "../../hooks/useQuickLinkDirectory";
import { setActiveDirectoryId } from "@/utils/redux/quicklinks/slices/quicklinks.directory.slice";
import Image from "next/image";

export const DepartmentLinks = ({
  rootParentDirId,
}: {
  rootParentDirId: string;
}) => {
  const initialize = useRef(false);

  if (!initialize.current) {
    store.dispatch(setActiveDirectoryId(rootParentDirId));
    initialize.current = true;
  }

  // console.log(activeDirectoryId);
  const { activeDirectoryId, directories } = useQuickLinkDirectory();
  const { thisDirectory } = useQuickLinkDirs(activeDirectoryId);
  const pathname = usePathname();
  const filteredDirectories = directories.filter(
    (directory) => directory.parentDirId === activeDirectoryId
  );
  const { allQuicklinks } = useAppSelector((state) => state.quicklinksLinks);

  return (
    <div>
      <QuicklinkHeaderWrapper
        title={thisDirectory?.title || ""}
        withBreadcrumb={{
          rootType: "DEPARTMENT",
        }}
      />

      {allQuicklinks.length === 0 && filteredDirectories.length === 0 ? (
        <div className="flex flex-col gap-3 items-center justify-center h-[350px] w-full">
          <Image
            className="rounded-full object-cover"
            src="/images/no-data.jpg"
            alt="No data"
            width={400}
            height={400}
          />
          <p className="text-gray-400 text-lg">
            Start by adding a folder or link
          </p>
        </div>
      ) : (
        <div className="flex gap-10">
          <div className="mt-4 flex justify-stretch gap-6 w-[70%]">
            <div className="w-full">
              <ParentDirectoryLinks />
            </div>
          </div>
          <div className="my-8 w-[30%]">
            <h1 className="text-xl font-bold">Folders</h1>
            <ListOfDirectories
              view="listView"
              pathname={pathname}
              directories={filteredDirectories}
            />
          </div>
        </div>
      )}
    </div>
  );
};
