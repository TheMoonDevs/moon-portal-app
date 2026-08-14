'use client';

import type { Event, User } from '@db/client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { APP_ROUTES } from '@/utils/constants/appInfo';
import { PortalSdk } from '@/utils/services/PortalSdk';

import type { AdminTabId } from '../shared/adminNav';
import {
  AdminButton,
  EmptyState,
  formatDate,
  Icon,
  Panel,
  PanelHeader,
  Pill,
  StatCard,
  UserAvatar,
} from '../shared/AdminUI';

type BadgeSummary = {
  id: string;
  name: string;
  description: string;
  imageurl: string;
  updatedAt: string;
};

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

/** Distribution of a user field, biggest bucket first. */
const distribution = (users: User[], key: 'role' | 'vertical') => {
  const counts = new Map<string, number>();
  users.forEach((user) => {
    const value = user[key];
    if (!value) return;
    counts.set(String(value), (counts.get(String(value)) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
};

export const AdminOverview = ({
  users,
  loading,
  onNavigate,
  onRefreshUsers,
}: {
  users: User[];
  loading: boolean;
  onNavigate: (tab: AdminTabId) => void;
  onRefreshUsers: () => void;
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [badges, setBadges] = useState<BadgeSummary[]>([]);
  const [fetching, setFetching] = useState(true);

  const fetchOverview = useCallback(async () => {
    setFetching(true);
    try {
      const [eventRes, badgeRes] = await Promise.all([
        PortalSdk.getData('/api/events', null).catch(() => null),
        PortalSdk.getData('/api/badges', null).catch(() => null),
      ]);
      setEvents(eventRes?.data || []);
      setBadges(badgeRes?.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  /* --------------------------------- derived -------------------------------- */

  const members = useMemo(
    () => users.filter((user) => user.userType === 'MEMBER'),
    [users],
  );
  const clients = useMemo(
    () => users.filter((user) => user.userType === 'CLIENT'),
    [users],
  );
  const admins = useMemo(() => users.filter((user) => user.isAdmin), [users]);

  const upcomingEvents = useMemo(
    () =>
      events
        .filter((event) => new Date(event.date) >= startOfToday())
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        ),
    [events],
  );

  const recentUsers = useMemo(
    () =>
      [...users]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        )
        .slice(0, 5),
    [users],
  );

  const roleBreakdown = useMemo(() => distribution(members, 'role'), [members]);
  const verticalBreakdown = useMemo(
    () => distribution(members, 'vertical'),
    [members],
  );

  const quickActions: {
    label: string;
    icon: string;
    onClick?: () => void;
    href?: string;
  }[] = [
    { label: 'Add a user', icon: 'person_add', href: APP_ROUTES.userEditor },
    {
      label: 'Send a notification',
      icon: 'notifications',
      onClick: () => onNavigate('notifications'),
    },
    {
      label: 'Schedule an event',
      icon: 'event',
      onClick: () => onNavigate('events'),
    },
    {
      label: 'Create a badge',
      icon: 'workspace_premium',
      href: APP_ROUTES.badgeEditor,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total users"
          value={users.length}
          icon="group"
          hint={`${members.length} members · ${clients.length} clients`}
          loading={loading}
          onClick={() => onNavigate('users')}
        />
        <StatCard
          label="Admins"
          value={admins.length}
          icon="shield_person"
          tone="warning"
          hint={`${
            users.filter((user) => user.status === 'ACTIVE').length
          } active accounts`}
          loading={loading}
          onClick={() => onNavigate('users')}
        />
        <StatCard
          label="Upcoming events"
          value={upcomingEvents.length}
          icon="event"
          tone="info"
          hint={
            upcomingEvents[0]
              ? `Next: ${formatDate(upcomingEvents[0].date)}`
              : 'Nothing scheduled'
          }
          loading={fetching}
          onClick={() => onNavigate('events')}
        />
        <StatCard
          label="Badge templates"
          value={badges.length}
          icon="workspace_premium"
          tone="positive"
          hint="Achievements members can unlock"
          loading={fetching}
          onClick={() => onNavigate('badges')}
        />
      </div>

      {/* Quick actions */}
      <Panel>
        <PanelHeader
          title="Quick actions"
          description="Jump straight into the most common admin tasks."
          icon="bolt"
        />
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) =>
            action.href ? (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm text-neutral-200 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
              >
                <Icon
                  name={action.icon}
                  className="text-[20px] text-neutral-400"
                />
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                onClick={action.onClick}
                className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-left text-sm text-neutral-200 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
              >
                <Icon
                  name={action.icon}
                  className="text-[20px] text-neutral-400"
                />
                {action.label}
              </button>
            ),
          )}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent users */}
        <Panel>
          <PanelHeader
            title="Recently added users"
            description="The newest members and clients on the portal."
            icon="group_add"
            actions={
              <AdminButton
                size="sm"
                tone="ghost"
                icon="refresh"
                onClick={onRefreshUsers}
                loading={loading}
              >
                Refresh
              </AdminButton>
            }
          />
          {loading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-xl bg-white/[0.03]"
                />
              ))}
            </div>
          ) : recentUsers.length === 0 ? (
            <EmptyState
              icon="group"
              title="No users yet"
              description="Add your first member or client to get started."
              action={
                <Link href={APP_ROUTES.userEditor}>
                  <AdminButton size="sm" tone="primary" icon="person_add">
                    Add user
                  </AdminButton>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {recentUsers.map((user) => (
                <li key={user.id}>
                  <Link
                    href={`${APP_ROUTES.userEditor}?id=${user.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                  >
                    <UserAvatar src={user.avatar} name={user.name} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-neutral-100">
                        {user.name || user.username}
                      </p>
                      <p className="truncate text-xs text-neutral-500">
                        Joined {formatDate(user.createdAt)}
                      </p>
                    </div>
                    <Pill tone={user.userType === 'CLIENT' ? 'info' : 'purple'}>
                      {user.userType}
                    </Pill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Upcoming events */}
        <Panel>
          <PanelHeader
            title="Upcoming events"
            description="What is next on the portal calendar."
            icon="event"
            actions={
              <AdminButton
                size="sm"
                tone="ghost"
                iconRight="chevron_right"
                onClick={() => onNavigate('events')}
              >
                View all
              </AdminButton>
            }
          />
          {fetching ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-xl bg-white/[0.03]"
                />
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <EmptyState
              icon="event_busy"
              title="No upcoming events"
              description="Schedule an event to keep everyone in the loop."
              action={
                <AdminButton
                  size="sm"
                  icon="add"
                  onClick={() => onNavigate('events')}
                >
                  Add event
                </AdminButton>
              }
            />
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {upcomingEvents.slice(0, 5).map((event) => (
                <li
                  key={event.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03]">
                    <span className="text-[10px] uppercase text-neutral-500">
                      {new Date(event.date).toLocaleDateString(undefined, {
                        month: 'short',
                      })}
                    </span>
                    <span className="text-sm font-semibold text-neutral-100">
                      {new Date(event.date).getDate()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-neutral-100">
                      {event.name}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {event.time} · {event.subTitle}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Team composition */}
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Team composition"
            description={`How the ${members.length} members break down.`}
            icon="donut_small"
            actions={
              <AdminButton
                size="sm"
                tone="ghost"
                iconRight="chevron_right"
                onClick={() => onNavigate('users')}
              >
                Manage users
              </AdminButton>
            }
          />
          {loading ? (
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className="h-32 animate-pulse rounded-xl bg-white/[0.03]"
                />
              ))}
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              icon="donut_small"
              title="No members yet"
              description="Roles and verticals appear once members are added."
            />
          ) : (
            <div className="grid gap-6 p-4 sm:grid-cols-2">
              {[
                { title: 'By role', data: roleBreakdown },
                { title: 'By vertical', data: verticalBreakdown },
              ].map((column) => (
                <div key={column.title} className="flex flex-col gap-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                    {column.title}
                  </p>
                  {column.data.length === 0 ? (
                    <p className="text-xs text-neutral-600">
                      Not set on any member
                    </p>
                  ) : (
                    column.data.map((entry) => (
                      <div key={entry.label}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="truncate text-neutral-300">
                            {entry.label.replace(/_/g, ' ')}
                          </span>
                          <span className="text-neutral-500">
                            {entry.count}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-neutral-300/70"
                            style={{
                              width: `${(entry.count / members.length) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};
