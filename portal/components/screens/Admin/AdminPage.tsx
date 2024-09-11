'use client';
import { useEffect, useState } from 'react';
import { MobileBox } from '../Login/Login';
import { AdminUsers } from './AdminUsers';
import SendNotifications from './SendNotifications';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { User } from '@prisma/client';
import BadgeTemplate from './badge-template/AdminBadges';

export const AdminPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    PortalSdk.getData('/api/user', null)
      .then((data) => {
        console.log(data);
        setUsers(data?.data?.user || []);
        setLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
      });
  }, []);
  return (
    <div className='flex flex-row flex-wrap gap-4 items-center justify-center  bg-neutral-700 md:bg-neutral-900 h-screen overflow-y-hidden max-sm:flex-col max-sm:h-full max-sm:overflow-y-auto'>
      <AdminUsers users={users} loading={loading} />
      <SendNotifications users={users} loading={loading} />
      <BadgeTemplate />
    </div>
  );
};
