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
import { useRouter } from 'next/navigation';

const menuItems = [
  { name: 'AdminUsers', label: 'Manage Users', icon: 'group' },
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
  const router = useRouter();

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
      <div className="flex w-64 flex-col justify-start bg-neutral-900 p-5">
        <img
          src="/logo/logo_white.png"
          alt="Company Logo"
          className="mx-auto w-32 cursor-pointer"
        />
        <div className="mt-10 flex flex-col gap-4">
          <button
            onClick={() => router.push(APP_ROUTES.home)}
            className="flex items-center gap-2 rounded-lg p-2 text-white hover:bg-neutral-800"
          >
            <span className="material-symbols-outlined">home</span>
            Go Back to Portal
          </button>
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

      <div className="flex flex-1 items-center justify-center overflow-y-auto px-5">
        {renderComponent()}
      </div>
    </div>
  );
};
