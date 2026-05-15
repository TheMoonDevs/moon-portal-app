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
// import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
// import { useSearchParams } from "next/navigation";
// import { useEffect } from "react";
// import LinkList from "../../LinkList/LinkList";
// import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
// import {
//   setAllQuicklinks,
//   setTopUsedList,
// } from "@/utils/redux/quicklinks/quicklinks.slice";
// import TopUsedLink from "../Dashboard/TopUsedLink";
// import { Link } from "@db/client";
// import useAsyncState from "@/utils/hooks/useAsyncState";
// import { LinkFiltersHeader } from "../../LinkList/LinkFiltersHeader";
// import { useQuickLinkDirs } from "../../hooks/useQuickLinksDirs";

// export const CommonQuicklinks = ({
//   departmentSlug,
// }: {
//   departmentSlug: string;
// }) => {
//   const dispatch = useAppDispatch();
//   const params = useSearchParams();
//   const rootParentDirId = params?.get("id");
//   const { thisDirectory, parentDirecotry } = useQuickLinkDirs(rootParentDirId);

//   const { allQuicklinks, topUsedList } = useAppSelector(
//     (state) => state.quicklinks
//   );
//   const { loading, setLoading, error, setError } = useAsyncState();

//   //Fetch link by department Id
//   useEffect(() => {
//     const getData = async () => {
//       setLoading(true);
//       // try {
//       const reponse = await QuicklinksSdk.getData(
//         `/api/quicklinks/link?rootParentDirId=${rootParentDirId}`
//       );

//       let quicklinks: Link[] = reponse.data.links;
//       console.log(quicklinks);
//       dispatch(setAllQuicklinks(quicklinks));

//       const sortedQuicklinks = [...quicklinks]
//         .sort((a, b) => b.clickCount - a.clickCount)
//         .slice(0, 5);
//       dispatch(setTopUsedList(sortedQuicklinks));

//       setLoading(false);
//       // } catch (error) {
//       //   console.log(error);
//       // }
//     };
//     getData();
//   }, [rootParentDirId, dispatch, setLoading]);

//   return (
//     <div>
//       <TopUsedLink title={`Top Used in ${thisDirectory?.title}`}>
//         <LinkList
//           allQuicklinks={topUsedList}
//           withView="thumbnail"
//           isLoading={loading}
//         />
//       </TopUsedLink>
//       <div className="flex flex-col w-full">
//         <LinkFiltersHeader title={`View All in ${thisDirectory?.title}`} />
//         <LinkList allQuicklinks={allQuicklinks} isLoading={loading} />
//       </div>
//     </div>
//   );
// };

export const CommonQuicklinks = ({
  rootParentDirId,
}: {
  rootParentDirId: string;
}) => {
  const initialize = useRef(false);

  if (!initialize.current) {
    console.log('rootParentDirId', rootParentDirId);
    store.dispatch(setActiveDirectoryId(rootParentDirId));
    initialize.current = true;
  }
  const { activeDirectoryId, directories } = useQuickLinkDirectory();
  const { thisDirectory } = useQuickLinkDirs(activeDirectoryId);
  const pathname = usePathname();
  const filteredDirectories = directories.filter(
    (directory) => directory.parentDirId === activeDirectoryId,
  );
  const { allQuicklinks } = useAppSelector((state) => state.quicklinksLinks);
  const { loading } = useFetchQuicklinksByDir({ isRootDirectory: true });
  const { isParentDirectoryFoldersOpen } = useAppSelector(
    (state) => state.quicklinksUi,
  );
  const dispatch = useAppDispatch();
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
        icon="group"
        withBreadcrumb={{
          rootType: 'COMMON_RESOURCES',
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
