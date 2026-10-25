'use client';

import type { User } from '@db/client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
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
import { CompanyMark } from '../Workspace/shared';

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
  const workspace = useWorkspace();
  const [badgeCount, setBadgeCount] = useState<number | null>(null);

  useEffect(() => {
    PortalSdk.getData('/api/badges', null)
      .then((res) => setBadgeCount(res?.data?.badges?.length ?? 0))
      .catch(() => setBadgeCount(0));
  }, []);

  const active = useMemo(
    () => users.filter((user) => user.status === 'ACTIVE'),
    [users],
  );
  const admins = useMemo(() => users.filter((user) => user.isAdmin), [users]);

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

  const quickActions: {
    label: string;
    icon: string;
    onClick?: () => void;
    href?: string;
  }[] = [
    { label: 'Add a person', icon: 'person_add', href: APP_ROUTES.userEditor },
    ...(workspace.isSuperAdmin
      ? [
          {
            label: 'Create a company',
            icon: 'domain_add',
            onClick: () => onNavigate('companies'),
          },
        ]
      : []),
    {
      label: 'Send a notification',
      icon: 'notifications',
      onClick: () => onNavigate('notifications'),
    },
    {
      label: 'Create a badge',
      icon: 'workspace_premium',
      onClick: () => onNavigate('badges'),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="People"
          value={users.length}
          icon="group"
          hint={`${active.length} active`}
          loading={loading}
          onClick={() => onNavigate('users')}
        />
        <StatCard
          label="Companies"
          value={workspace.companies.length}
          icon="domain"
          tone="info"
          loading={workspace.loading}
          onClick={() => onNavigate('companies')}
        />
        <StatCard
          label="Admins"
          value={admins.length}
          icon="shield_person"
          tone="warning"
          loading={loading}
          onClick={() => onNavigate('users')}
        />
        <StatCard
          label="Badges"
          value={badgeCount ?? 0}
          icon="workspace_premium"
          tone="positive"
          hint="Unlocked automatically from work"
          loading={badgeCount === null}
          onClick={() => onNavigate('badges')}
        />
      </div>

      <Panel>
        <PanelHeader
          title="Quick actions"
          description="The things you do most often."
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
        <Panel>
          <PanelHeader
            title="Recently added"
            description="The newest people on the portal."
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
              title="No one yet"
              action={
                <Link href={APP_ROUTES.userEditor}>
                  <AdminButton size="sm" tone="primary" icon="person_add">
                    Add a person
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
                    {user.status !== 'ACTIVE' && <Pill>{user.status}</Pill>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Companies"
            description="Every company on the portal."
            icon="domain"
            actions={
              <AdminButton
                size="sm"
                tone="ghost"
                iconRight="chevron_right"
                onClick={() => onNavigate('companies')}
              >
                Manage
              </AdminButton>
            }
          />
          {workspace.companies.length === 0 ? (
            <EmptyState
              icon="domain"
              title="No companies yet"
              description={
                workspace.isSuperAdmin
                  ? 'Create the first one from the Companies tab.'
                  : 'Only the super admin can create companies.'
              }
            />
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {workspace.companies.slice(0, 6).map(({ company }) => (
                <li key={company.id}>
                  <button
                    onClick={() => onNavigate('companies')}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <CompanyMark
                      name={company.name}
                      color={company.color}
                      logo={company.logo}
                      size={34}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-neutral-100">
                        {company.name}
                      </span>
                      {company.description && (
                        <span className="block truncate text-xs text-neutral-500">
                          {company.description}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
};
