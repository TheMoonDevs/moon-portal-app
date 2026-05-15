'use client';

import type { DirectoryList } from '@db/client';
import { USERDIRECTORYTYPE } from '@db/client';
import { useEffect } from 'react';

import { useUser } from '@/utils/hooks/useUser';
import { setTopUsedDirectoryList } from '@/utils/redux/quicklinks/slices/quicklinks.directory.slice';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { QuicklinksSdk } from '@/utils/services/QuicklinksSdk';

import ListOfDirectories from '../../../DirectoryList';

const UserTopUsedDirectories = ({
  withTitle = true,
  view = 'gridView',
  searchQuery,
}: {
  withTitle?: boolean;
  view?: 'listView' | 'gridView';
  searchQuery?: string;
}) => {
  const { user } = useUser();
  const { topUsedDirectoryList } = useAppSelector(
    (state) => state.quicklinksDirectory,
  );
  const dispatch = useAppDispatch();

  const filterDirectory = (
    searchQuery: string | undefined,
  ): DirectoryList[] => {
    if (!searchQuery) return topUsedDirectoryList;
    return topUsedDirectoryList.filter((dir) =>
      dir.title.toLowerCase().includes(searchQuery),
    );
  };

  useEffect(() => {
    if (!user) return;
    const getTopUsedDirectories = async () => {
      try {
        const userTopUsedDirectories = await QuicklinksSdk.getData(
          `/api/quicklinks/directory-list/user-directory?userId=${user.id}&directoryType=${USERDIRECTORYTYPE.OTHER}`,
        );
        const sortedByClickCount = userTopUsedDirectories.sort(
          (a: any, b: any) => {
            return b.clickCount - a.clickCount;
          },
        );

        dispatch(
          setTopUsedDirectoryList(
            sortedByClickCount.map((dir: any) => dir.directoryData),
          ),
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
          <h1 className="flex items-center gap-4 pb-5 text-3xl font-bold max-sm:gap-3 max-sm:text-2xl">
            <span className="material-symbols-outlined rounded-full border border-neutral-200 p-2">
              history
            </span>{' '}
            <span>Top Used Folders</span>
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

export default UserTopUsedDirectories;
