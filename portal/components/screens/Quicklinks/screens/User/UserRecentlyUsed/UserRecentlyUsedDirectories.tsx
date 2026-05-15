'use client';

import type { DirectoryList, UserDirectory } from '@db/client';
import { USERDIRECTORYTYPE } from '@db/client';
import { useEffect } from 'react';

import { useUser } from '@/utils/hooks/useUser';
import { setRecentlyUsedDirectoryList } from '@/utils/redux/quicklinks/slices/quicklinks.directory.slice';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { QuicklinksSdk } from '@/utils/services/QuicklinksSdk';

import ListOfDirectories from '../../../DirectoryList';

const UserRecentlyUsedDirectories = ({
  withTitle = true,
  view = 'gridView',
  searchQuery,
}: {
  withTitle?: boolean;
  view?: 'listView' | 'gridView';
  searchQuery?: string;
}) => {
  const { user } = useUser();

  const dispatch = useAppDispatch();

  const { recentlyUsedDirectoryList } = useAppSelector(
    (state) => state.quicklinksDirectory,
  );

  const filterDirectory = (
    searchQuery: string | undefined,
  ): DirectoryList[] => {
    if (!searchQuery) return recentlyUsedDirectoryList;
    return recentlyUsedDirectoryList.filter((dir) =>
      dir.title.toLowerCase().includes(searchQuery),
    );
  };

  useEffect(() => {
    if (!user) return;
    const getRecentlyUsedDirectories = async () => {
      try {
        const userFavoriteDirectories = await QuicklinksSdk.getData(
          `/api/quicklinks/directory-list/user-directory?userId=${user.id}&directoryType=${USERDIRECTORYTYPE.OTHER}`,
        );

        const sortedByTimeStamp = userFavoriteDirectories.sort(
          (a: UserDirectory, b: UserDirectory) => {
            return (
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          },
        );

        dispatch(
          setRecentlyUsedDirectoryList(
            sortedByTimeStamp.map((dir: any) => dir.directoryData),
          ),
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
          <h1 className="flex items-center gap-4 pb-5 text-3xl font-bold max-sm:gap-3 max-sm:text-2xl">
            <span className="material-symbols-outlined rounded-full border border-neutral-200 p-2">
              history
            </span>{' '}
            <span>Recently Used Folders</span>
          </h1>
        </div>
      )}
      <div className="px-5 max-sm:px-2">
        <ListOfDirectories
          view={view}
          directories={filterDirectory(searchQuery)}
        />
      </div>
    </div>
  );
};

export default UserRecentlyUsedDirectories;
