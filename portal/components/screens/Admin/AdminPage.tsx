'use client';
import { useEffect, useState } from 'react';
import { MobileBox } from '../Login/Login';
import { AdminUsers } from './AdminUsers';
import SendNotifications from './SendNotifications';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { User } from '@prisma/client';
import BadgeTemplate from './badge-template/AdminBadges';
import EventForm from './Events/EventForm';
import Link from 'next/link';
import { APP_ROUTES } from '@/utils/constants/appInfo';

const menuItems = [
  { name: 'AdminUsers', label: 'Admin Users', icon: 'group' },
  {
    name: 'SendNotifications',
    label: 'Send Notifications',
    icon: 'notifications',
  },
  { name: 'BadgeTemplate', label: 'Badge Template', icon: 'badge' },
  { name: 'EventForm', label: 'Event Form', icon: 'event' },
];

export const AdminPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const [activeComponent, setActiveComponent] = useState('AdminUsers');

  const renderComponent = () => {
    switch (activeComponent) {
      case 'AdminUsers':
        return <AdminUsers users={users} loading={loading} />;
      case 'SendNotifications':
        return <SendNotifications users={users} loading={loading} />;
      case 'BadgeTemplate':
        return <BadgeTemplate />;
      case 'EventForm':
        return <EventForm />;
      default:
        return <AdminUsers users={users} loading={loading} />;
    }
  };

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
    <div className="flex h-screen bg-neutral-700">
      <div className="flex w-64 flex-col justify-between bg-neutral-900 p-5">
        <Link href={APP_ROUTES.home}>
          <img
            src="/logo/logo_white.png"
            alt="Company Logo"
            className="mx-auto w-32 cursor-pointer"
          />
        </Link>
        <div className="mt-10 flex flex-col gap-4">
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`flex items-center gap-2 rounded-lg p-2 text-white hover:bg-neutral-800 ${
                activeComponent === item.name ? 'bg-neutral-800' : ''
              }`}
              onClick={() => setActiveComponent(item.name)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto p-5">
        {renderComponent()}
      </div>
    </div>
  );
};
