'use client';

import { CircularProgress, useMediaQuery } from '@mui/material';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';

import media from '@/styles/media';
import { setActiveDirectoryId } from '@/utils/redux/quicklinks/slices/quicklinks.directory.slice';
import { setIsParentDirectoryFoldersOpen } from '@/utils/redux/quicklinks/slices/quicklinks.ui.slice';
import store, { useAppDispatch, useAppSelector } from '@/utils/redux/store';

import ListOfDirectories from '../../DirectoryList';
import QuicklinkHeaderWrapper from '../../global/QuicklinkHeaderWrapper';
import useFetchQuicklinksByDir from '../../hooks/useFetchQuicklinksByDir';
import { useQuickLinkDirectory } from '../../hooks/useQuickLinkDirectory';
import { useQuickLinkDirs } from '../../hooks/useQuickLinksDirs';
import { ParentDirectoryLinks } from '../ParentDirectory/ParentDirectoryLinks';
import { ReusableFolderDrawer } from '../User/UserTopUsed/UserTopUsedLinks';

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
    (directory) => directory.parentDirId === activeDirectoryId,
  );
  const { allQuicklinks } = useAppSelector((state) => state.quicklinksLinks);
  const { isParentDirectoryFoldersOpen } = useAppSelector(
    (state) => state.quicklinksUi,
  );
  const dispatch = useAppDispatch();

  const { loading } = useFetchQuicklinksByDir({ isRootDirectory: true });
  const isTablet = useMediaQuery(media.tablet);

  if (loading)
    return (
      <div className="flex w-full items-center justify-center">
        <CircularProgress color="inherit" />
      </div>
    );

  return (
    <div>
      <QuicklinkHeaderWrapper
        title={thisDirectory?.title || ''}
        withBreadcrumb={{
          rootType: 'DEPARTMENT',
        }}
      />

      {allQuicklinks.length === 0 && filteredDirectories.length === 0 ? (
        <div className="flex h-[350px] w-full flex-col items-center justify-center gap-3 max-sm:!mt-16">
          <Image
            className="rounded-full object-cover"
            src="/images/no-data.jpg"
            alt="No data"
            width={400}
            height={400}
          />
          <p className="text-lg text-gray-400">
            Start by adding a folder or link
          </p>
        </div>
      ) : (
        <div className="flex gap-10">
          <div
            className={`mt-4 flex w-[70%] justify-stretch gap-6 ${isTablet && 'w-full'}`}
          >
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
          {isParentDirectoryFoldersOpen && (
            <ReusableFolderDrawer
              open={isParentDirectoryFoldersOpen}
              handleClose={() => {
                dispatch(
                  setIsParentDirectoryFoldersOpen(
                    !isParentDirectoryFoldersOpen,
                  ),
                );
              }}
            >
              <div className="w-[300px] px-4">
                <h1 className="text-xl font-bold">Folders</h1>
                <ListOfDirectories
                  view="listView"
                  pathname={pathname}
                  directories={filteredDirectories}
                />
              </div>
            </ReusableFolderDrawer>
          )}
        </div>
      )}
    </div>
  );
};
