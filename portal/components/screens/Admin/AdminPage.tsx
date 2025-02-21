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
import Link from 'next/link';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useRouter } from 'next/navigation';
import InvoicesTab from './InvoicesTab';

const menuItems = [
  { name: 'AdminUsers', label: 'Manage Users', icon: 'group' },
  {
    name: 'SendNotifications',
    label: 'Send Notifications',
    icon: 'notifications',
  },
  { name: 'BadgeTemplate', label: 'Badge Template', icon: 'badge' },
  { name: 'EventForm', label: 'Event Form', icon: 'event' },
  { name: 'Shortcuts', label: 'Client Shortcuts', icon: 'bolt' },
  { name: 'Engagements', label: 'Engagements', icon: 'handshake' },
  { name: 'Invoices', label: 'Invoices', icon: 'receipt_long' },
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
      case 'Shortcuts':
        return <ClientShortcutsManager />;
      case 'Engagements':
        return <Engagements users={users} />;
      case 'Invoices':
        return <InvoicesTab users={users} loading={loading} />;
      default:
        return <AdminUsers users={users} loading={loading} />;
    }
  };

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
    <div className="flex h-screen bg-neutral-700">
      <div className="flex w-64 flex-col justify-start bg-neutral-900 p-5">
        <button
          onClick={() => router.push(APP_ROUTES.home)}
          className="mb-4 flex items-center gap-2 rounded-lg p-2 text-white hover:bg-neutral-800"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Home
        </button>
        <div className="flex flex-col items-center">
          <img
            src="/logo/logo_white.png"
            alt="Company Logo"
            className="w-24 cursor-pointer"
          />
          <p className="mt-2 text-xl font-bold tracking-[0.25em] text-white">
            TheMoonDevs
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4">
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`flex items-center gap-2 rounded-lg p-2 text-white transition-opacity hover:bg-neutral-800 ${
                activeComponent === item.name
                  ? 'bg-neutral-800 font-semibold opacity-100'
                  : 'opacity-60'
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
