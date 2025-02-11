'use client';
import { useEffect, useState } from 'react';
import { MobileBox } from '../Login/Login';
import { AdminUsers } from './AdminUsers';
import SendNotifications from './SendNotifications';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { User, USERTYPE } from '@prisma/client';
import BadgeTemplate from './badge-template/AdminBadges';
import EventForm from './Events/EventForm';
import ClientShortcutsManager from './ClientShortcutsManager';
import Engagements from './Engagements';

export const AdminPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    PortalSdk.getData('/api/user', null)
      .then((data) => {
        setUsers(data?.data?.user || []);
        setLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex h-screen flex-row flex-wrap items-center justify-center gap-4 overflow-y-scroll bg-neutral-700 py-5 max-sm:h-full max-sm:flex-col max-sm:overflow-y-auto md:bg-neutral-900">
      <AdminUsers users={users} loading={loading} />
      <SendNotifications users={users} loading={loading} />
      <BadgeTemplate />
      <EventForm />
      <ClientShortcutsManager />
      <Engagements users={users} />
    </div>
  );
};
