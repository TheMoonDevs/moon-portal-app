'use client';
import type { User } from '@db/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { APP_ROUTES } from '@/utils/constants/appInfo';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { AdminUsers } from './AdminUsers';
import AdminBadges from './badge-template/AdminBadges';
import EventForm from './Events/EventForm';
import SendNotifications from './SendNotifications';

type TabProps = { users: User[]; loading: boolean };

const TABS = [
  {
    name: 'users',
    label: 'Manage Users',
    icon: 'group',
    render: ({ users, loading }: TabProps) => (
      <AdminUsers users={users} loading={loading} />
    ),
  },
  {
    name: 'notifications',
    label: 'Send Notifications',
    icon: 'notifications',
    render: ({ users, loading }: TabProps) => (
      <SendNotifications users={users} loading={loading} />
    ),
  },
  {
    name: 'badges',
    label: 'Badge Template',
    icon: 'badge',
    render: () => <AdminBadges />,
  },
  {
    name: 'events',
    label: 'Event Form',
    icon: 'event',
    render: () => <EventForm />,
  },
] as const;

export const AdminPage = () => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(TABS[0].name);

  useEffect(() => {
    PortalSdk.getData('/api/user', null)
      .then((data) => setUsers(data?.data?.user ?? []))
      .catch((err) => console.error('Failed to load users', err))
      .finally(() => setLoading(false));
  }, []);

  const tab = TABS.find((t) => t.name === activeTab) ?? TABS[0];

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
          {TABS.map((item) => (
            <button
              key={item.name}
              className={`flex items-center gap-2 rounded-lg p-2 text-white transition-opacity hover:bg-neutral-800 ${
                activeTab === item.name
                  ? 'bg-neutral-800 font-semibold opacity-100'
                  : 'opacity-60'
              }`}
              onClick={() => setActiveTab(item.name)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto px-5">
        {tab.render({ users, loading })}
      </div>
    </div>
  );
};
