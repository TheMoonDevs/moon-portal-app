'use client';

import { USERDIRECTORYTYPE } from '@db/client';
import { useEffect } from 'react';

import { useUser } from '@/utils/hooks/useUser';
import { setFavoriteDirectoryList } from '@/utils/redux/quicklinks/slices/quicklinks.directory.slice';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { QuicklinksSdk } from '@/utils/services/QuicklinksSdk';

import ListOfDirectories from '../../../DirectoryList';

const UserSavedDirectories = () => {
  const { user } = useUser();
  const dispatch = useAppDispatch();
  const { favoriteDirectoryList } = useAppSelector(
    (state) => state.quicklinksDirectory,
  );

  useEffect(() => {
    if (!user) return;
    const getUserSavedDirectories = async () => {
      try {
        const userFavoriteDirectories = await QuicklinksSdk.getData(
          `/api/quicklinks/directory-list/user-directory?userId=${user.id}&directoryType=${USERDIRECTORYTYPE.FAVORITED}`,
        );
        dispatch(setFavoriteDirectoryList(userFavoriteDirectories));
      } catch (error) {
        console.log(error);
      }
    };
    getUserSavedDirectories();
  }, [dispatch, user]);

  return (
    <div>
      <h1 className="py-[10px] text-xl font-bold">Saved Directories</h1>
      <div>
        <ListOfDirectories directories={favoriteDirectoryList} />
      </div>
    </div>
  );
};

export default UserSavedDirectories;
