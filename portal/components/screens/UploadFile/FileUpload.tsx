import type { User } from '@db/client';
import { useEffect, useState } from 'react';

import { Bottombar } from '@/components/global/Bottombar';
import { useUser } from '@/utils/hooks/useUser';

import DropzoneAdminButton from './DropzoneAdminButton';
import { DropzoneButton } from './DropzoneButton';
import FilesTable from './FilesTable';
import Searchbar from './Searchbar';

export const FileUpload = () => {
  const [users, setUsers] = useState<User[]>([]);
  const { user } = useUser();
  useEffect(() => {
    if (!user) {
      return;
    }
    if (user.isAdmin) {
      const fetchUsers = async () => {
        try {
          const response = await fetch(`api/users`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          const data = await response.json();
          setUsers(data?.data?.user as User[]);
        } catch (error) {
          console.error('Error:', error);
        }
      };

      fetchUsers();
    }
  }, [user]);

  return (
    <div className="flex flex-col gap-4 md:mx-4 md:mt-6">
      <h1 className="font-semibold md:mx-3 md:text-xl lg:text-2xl">
        Upload Files
      </h1>
      <Searchbar />
      {user?.isAdmin ? (
        <DropzoneAdminButton users={users} />
      ) : (
        <DropzoneButton />
      )}
      <FilesTable users={users} />
      <Bottombar />
    </div>
  );
};
