"use client";

import store, { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { ParentDirectoryLinks } from "../ParentDirectory/ParentDirectoryLinks";
import { useQuickLinkDirs } from "../../hooks/useQuickLinksDirs";
import { useRef, useEffect } from "react";
import QuicklinkHeaderWrapper from "../../global/QuicklinkHeaderWrapper";
import { usePathname } from "next/navigation";
import ListOfDirectories from "../../DirectoryList";
import { useQuickLinkDirectory } from "../../hooks/useQuickLinkDirectory";
import { setActiveDirectoryId } from "@/utils/redux/quicklinks/slices/quicklinks.directory.slice";
import Image from "next/image";

import { CircularProgress, useMediaQuery } from "@mui/material";
import useFetchQuicklinksByDir from "../../hooks/useFetchQuicklinksByDir";
import { ReusableFolderDrawer } from "../User/UserTopUsed/UserTopUsedLinks";
import { setIsParentDirectoryFoldersOpen } from "@/utils/redux/quicklinks/slices/quicklinks.ui.slice";
import media from "@/styles/media";

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
  const { isParentDirectoryFoldersOpen } = useAppSelector((state) => state.quicklinksUi)
  const dispatch = useAppDispatch();

  const { loading } = useFetchQuicklinksByDir({ isRootDirectory: true });
  const isTablet = useMediaQuery(media.tablet);

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
        withBreadcrumb={{
          rootType: "DEPARTMENT",
        }}
      />

      {allQuicklinks.length === 0 && filteredDirectories.length === 0 ? (
        <div className="flex flex-col gap-3 items-center justify-center h-[350px] w-full max-sm:!mt-16">
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
          <div className={`mt-4 flex justify-stretch gap-6 w-[70%] ${isTablet && 'w-full'}`}>
            <div className="w-full">
              <ParentDirectoryLinks loading={loading} />
            </div>
          </div>
          <div className={`my-8 w-[30%] ${isTablet && 'hidden'}`}>
            <h1 className="text-xl font-bold">Folders</h1>
            <ListOfDirectories
              view="listView"
              pathname={pathname}
              directories={filteredDirectories}
            />
          </div>
          {isParentDirectoryFoldersOpen && 
            <ReusableFolderDrawer open={isParentDirectoryFoldersOpen} handleClose={() => {dispatch(setIsParentDirectoryFoldersOpen(!isParentDirectoryFoldersOpen))}}>
              <div className='px-4 w-[300px]'>
                <h1 className="text-xl font-bold">Folders</h1>
                <ListOfDirectories
                  view="listView"
                  pathname={pathname}
                  directories={filteredDirectories}
                />
              </div>
            </ReusableFolderDrawer>
          }
        </div>
      )}
    </div>
  );
};
