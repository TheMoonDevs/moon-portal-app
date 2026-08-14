'use client';

import type { User } from '@db/client';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { APP_ROUTES } from '@/utils/constants/appInfo';

import {
  AdminButton,
  CopyButton,
  EmptyState,
  formatDate,
  Icon,
  NativeSelect,
  Panel,
  Pill,
  SearchInput,
  Segmented,
  SkeletonRows,
  StatCard,
  UserAvatar,
} from './shared/AdminUI';

type TypeFilter = 'ALL' | 'MEMBER' | 'CLIENT';
type SortKey = 'name' | 'newest' | 'status';
type ViewMode = 'list' | 'grid';

const statusTone = (status?: string | null) => {
  switch (status) {
    case 'ACTIVE':
      return 'positive' as const;
    case 'INACTIVE':
      return 'warning' as const;
    case 'BLOCKED':
      return 'danger' as const;
    default:
      return 'neutral' as const;
  }
};

export const AdminUsers = ({
  users,
  loading,
  onRefresh,
}: {
  users: User[];
  loading: boolean;
  onRefresh?: () => void;
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [view, setView] = useState<ViewMode>('list');
  const [showCredentials, setShowCredentials] = useState(false);

  const roles = useMemo(
    () =>
      Array.from(
        new Set(users.map((user) => user.role).filter(Boolean) as string[]),
      ).sort(),
    [users],
  );

  const statuses = useMemo(
    () =>
      Array.from(
        new Set(users.map((user) => user.status).filter(Boolean) as string[]),
      ).sort(),
    [users],
  );

  const counts = useMemo(
    () => ({
      all: users.length,
      members: users.filter((user) => user.userType === 'MEMBER').length,
      clients: users.filter((user) => user.userType === 'CLIENT').length,
      admins: users.filter((user) => user.isAdmin).length,
      active: users.filter((user) => user.status === 'ACTIVE').length,
    }),
    [users],
  );

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = users.filter((user) => {
      if (typeFilter !== 'ALL' && user.userType !== typeFilter) return false;
      if (statusFilter !== 'ALL' && user.status !== statusFilter) return false;
      if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;
      if (!term) return true;
      return [
        user.name,
        user.username,
        user.email,
        user.role,
        user.vertical,
        user.positionTitle,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });

    return filtered.sort((a, b) => {
      if (sortKey === 'newest') {
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      }
      if (sortKey === 'status') {
        return String(a.status || '').localeCompare(String(b.status || ''));
      }
      return String(a.name || a.username).localeCompare(
        String(b.name || b.username),
      );
    });
  }, [users, search, typeFilter, statusFilter, roleFilter, sortKey]);

  const hasFilters =
    search.trim() !== '' ||
    typeFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    roleFilter !== 'ALL';

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setRoleFilter('ALL');
  };

  /* --------------------------------- cells --------------------------------- */

  const credentials = (user: User) => (
    <span className="flex items-center gap-1 text-xs text-neutral-500">
      <span className="truncate font-mono">
        @{user.username}
        {showCredentials && user.password ? ` · ${user.password}` : ''}
      </span>
      <CopyButton
        value={`${user.username} / ${user.password ?? ''}`}
        label="Copy credentials"
        className="size-6 text-[14px]"
      />
    </span>
  );

  const userMeta = (user: User) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <Pill tone={user.userType === 'CLIENT' ? 'info' : 'purple'}>
        {user.userType}
      </Pill>
      {user.status && <Pill tone={statusTone(user.status)}>{user.status}</Pill>}
      {user.role && <Pill>{String(user.role).replace(/_/g, ' ')}</Pill>}
      {user.isAdmin && (
        <Pill tone="warning" icon="shield_person">
          Admin
        </Pill>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="All users"
          value={counts.all}
          icon="group"
          loading={loading}
        />
        <StatCard
          label="Members"
          value={counts.members}
          icon="engineering"
          tone="info"
          loading={loading}
        />
        <StatCard
          label="Clients"
          value={counts.clients}
          icon="business_center"
          tone="positive"
          loading={loading}
        />
        <StatCard
          label="Admins"
          value={counts.admins}
          icon="shield_person"
          tone="warning"
          hint={`${counts.active} active accounts`}
          loading={loading}
        />
      </div>

      <Panel>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name, username, email or role…"
              className="min-w-[220px] flex-1"
            />
            <Segmented<TypeFilter>
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'ALL', label: 'All', count: counts.all },
                { value: 'MEMBER', label: 'Members', count: counts.members },
                { value: 'CLIENT', label: 'Clients', count: counts.clients },
              ]}
            />
            <Link href={APP_ROUTES.userEditor}>
              <AdminButton tone="primary" icon="person_add">
                Add user
              </AdminButton>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-9 w-auto min-w-[130px] text-xs"
              aria-label="Filter by status"
            >
              <option value="ALL">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="h-9 w-auto min-w-[130px] text-xs"
              aria-label="Filter by role"
            >
              <option value="ALL">All roles</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role.replace(/_/g, ' ')}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className="h-9 w-auto min-w-[130px] text-xs"
              aria-label="Sort users"
            >
              <option value="name">Sort: name</option>
              <option value="newest">Sort: newest</option>
              <option value="status">Sort: status</option>
            </NativeSelect>

            {hasFilters && (
              <AdminButton
                size="sm"
                tone="ghost"
                icon="filter_alt_off"
                onClick={resetFilters}
              >
                Clear
              </AdminButton>
            )}

            <div className="ml-auto flex items-center gap-2">
              <AdminButton
                size="sm"
                tone="ghost"
                icon={showCredentials ? 'visibility_off' : 'visibility'}
                onClick={() => setShowCredentials((value) => !value)}
              >
                {showCredentials ? 'Hide passwords' : 'Show passwords'}
              </AdminButton>
              {onRefresh && (
                <AdminButton
                  size="sm"
                  tone="ghost"
                  icon="refresh"
                  onClick={onRefresh}
                  loading={loading}
                >
                  Refresh
                </AdminButton>
              )}
              <div className="flex items-center gap-1 rounded-lg border border-white/[0.07] bg-neutral-900/60 p-1">
                {(
                  [
                    ['list', 'view_list'],
                    ['grid', 'grid_view'],
                  ] as [ViewMode, string][]
                ).map(([mode, icon]) => (
                  <button
                    key={mode}
                    onClick={() => setView(mode)}
                    aria-label={`${mode} view`}
                    className={cn(
                      'flex size-7 items-center justify-center rounded-md text-[16px] transition-colors',
                      view === mode
                        ? 'bg-white/[0.12] text-white'
                        : 'text-neutral-500 hover:text-neutral-200',
                    )}
                  >
                    <Icon name={icon} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <SkeletonRows rows={6} />
        ) : visibleUsers.length === 0 ? (
          <EmptyState
            icon={hasFilters ? 'search_off' : 'group'}
            title={hasFilters ? 'No users match your filters' : 'No users yet'}
            description={
              hasFilters
                ? 'Try a different search term or clear the filters.'
                : 'Add your first member or client to get started.'
            }
            action={
              hasFilters ? (
                <AdminButton
                  size="sm"
                  icon="filter_alt_off"
                  onClick={resetFilters}
                >
                  Clear filters
                </AdminButton>
              ) : (
                <Link href={APP_ROUTES.userEditor}>
                  <AdminButton size="sm" tone="primary" icon="person_add">
                    Add user
                  </AdminButton>
                </Link>
              )
            }
          />
        ) : view === 'list' ? (
          <ul className="divide-y divide-white/[0.05]">
            {visibleUsers.map((user) => (
              <li key={user.id}>
                <Link
                  href={`${APP_ROUTES.userEditor}?id=${user.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                >
                  <UserAvatar src={user.avatar} name={user.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-100">
                      {user.name || user.username}
                    </p>
                    {credentials(user)}
                  </div>
                  <div className="hidden lg:block">{userMeta(user)}</div>
                  <div className="hidden w-28 shrink-0 text-right text-xs text-neutral-600 xl:block">
                    {formatDate(user.createdAt)}
                  </div>
                  <Icon
                    name="chevron_right"
                    className="text-[20px] text-neutral-600"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleUsers.map((user) => (
              <Link
                key={user.id}
                href={`${APP_ROUTES.userEditor}?id=${user.id}`}
                className="group flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar src={user.avatar} name={user.name} size={44} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-100">
                      {user.name || user.username}
                    </p>
                    {credentials(user)}
                  </div>
                </div>
                {user.positionTitle && (
                  <p className="truncate text-xs text-neutral-500">
                    {user.positionTitle}
                  </p>
                )}
                {userMeta(user)}
              </Link>
            ))}
          </div>
        )}

        {!loading && visibleUsers.length > 0 && (
          <div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-2.5 text-xs text-neutral-500">
            <span>
              Showing {visibleUsers.length} of {users.length} users
            </span>
            {showCredentials && (
              <span className="flex items-center gap-1 text-amber-400/80">
                <Icon name="warning" className="text-[14px]" />
                Passwords are visible on screen
              </span>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
};
