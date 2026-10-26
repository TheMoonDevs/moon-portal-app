'use client';

import type { User } from '@db/client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { isSuperAdminEmail } from '@/lib/permissions/superAdmin';
import { cn } from '@/lib/utils';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { useWorkspace } from '@/utils/hooks/useWorkspace';
import { PortalSdk } from '@/utils/services/PortalSdk';

import {
  AdminButton,
  ConfirmDialog,
  CopyButton,
  EmptyState,
  formatDate,
  Icon,
  IconAction,
  NativeSelect,
  Panel,
  Pill,
  SearchInput,
  Segmented,
  SkeletonRows,
  StatCard,
  UserAvatar,
} from './shared/AdminUI';
import { errorText } from './Workspace/shared';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
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
  const { user: me } = useUser();
  const { canPortal } = useWorkspace();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [deleting, setDeleting] = useState<User | null>(null);
  const [removing, setRemoving] = useState(false);

  const canDelete = (user: User) =>
    canPortal('users:delete') &&
    user.id !== me?.id &&
    !isSuperAdminEmail(user.email) &&
    !(user.linkedEmails ?? []).some((e) => isSuperAdminEmail(e)) &&
    (!user.isAdmin || !!me?.isAdmin);

  const removeUser = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await PortalSdk.deleteData(`/api/user?id=${deleting.id}`, {
        id: deleting.id,
      });
      toast.success(`${deleting.name || 'User'} deleted`);
      setDeleting(null);
      onRefresh?.();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setRemoving(false);
    }
  };
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [view, setView] = useState<ViewMode>('list');
  const [showCredentials, setShowCredentials] = useState(false);

  const roles = useMemo(
    () =>
      Array.from(new Set(users.flatMap((user) => user.roleKeys ?? []))).sort(),
    [users],
  );

  const counts = useMemo(
    () => ({
      all: users.length,
      active: users.filter((user) => user.status === 'ACTIVE').length,
      inactive: users.filter((user) => user.status !== 'ACTIVE').length,
      admins: users.filter((user) => user.isAdmin).length,
      withRoles: users.filter((user) => (user.roleKeys ?? []).length > 0)
        .length,
    }),
    [users],
  );

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = users.filter((user) => {
      if (statusFilter === 'ACTIVE' && user.status !== 'ACTIVE') return false;
      if (statusFilter === 'INACTIVE' && user.status === 'ACTIVE') return false;
      if (roleFilter !== 'ALL' && !(user.roleKeys ?? []).includes(roleFilter))
        return false;
      if (!term) return true;
      return [
        user.name,
        user.username,
        user.email,
        ...(user.linkedEmails ?? []),
        ...(user.roleKeys ?? []),
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
  }, [users, search, statusFilter, roleFilter, sortKey]);

  // Inactive people are hidden by default; a search that only finds them
  // says so instead of coming back empty.
  const inactiveMatches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term || statusFilter !== 'ACTIVE') return 0;
    return users.filter(
      (u) =>
        u.status !== 'ACTIVE' &&
        [u.name, u.username, u.email, ...(u.linkedEmails ?? [])]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term)),
    ).length;
  }, [users, search, statusFilter]);

  const hasFilters =
    search.trim() !== '' || statusFilter !== 'ACTIVE' || roleFilter !== 'ALL';

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('ACTIVE');
    setRoleFilter('ALL');
  };

  /* --------------------------------- cells --------------------------------- */

  const credentials = (user: User) => (
    <span className="flex items-center gap-1 text-xs text-neutral-500">
      <span className="truncate font-mono">
        @{user.username}
        {showCredentials && user.code ? ` · ${user.code}` : ''}
      </span>
      <CopyButton
        value={user.code ?? ''}
        label="Copy sign-in code"
        className="size-6 text-[14px]"
      />
    </span>
  );

  const userMeta = (user: User) => (
    <div className="flex flex-wrap items-center gap-1.5">
      {user.status && user.status !== 'ACTIVE' && (
        <Pill tone={statusTone(user.status)}>{user.status}</Pill>
      )}
      {(user.roleKeys ?? []).map((key) => (
        <Pill key={key}>{key.replace(/-/g, ' ')}</Pill>
      ))}
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
          label="Active"
          value={counts.active}
          icon="how_to_reg"
          tone="positive"
          loading={loading}
        />
        <StatCard
          label="With a portal role"
          value={counts.withRoles}
          icon="badge"
          tone="info"
          loading={loading}
        />
        <StatCard
          label="Admins"
          value={counts.admins}
          icon="shield_person"
          tone="warning"
          hint={`${counts.inactive} inactive accounts`}
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
              placeholder="Search by name, email, title or role…"
              className="min-w-[220px] flex-1"
            />
            <Segmented<StatusFilter>
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ACTIVE', label: 'Active', count: counts.active },
                {
                  value: 'INACTIVE',
                  label: 'Inactive',
                  count: counts.inactive,
                },
                { value: 'ALL', label: 'All', count: counts.all },
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
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="h-9 w-auto min-w-[130px] text-xs"
              aria-label="Filter by role"
            >
              <option value="ALL">All portal roles</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role.replace(/-/g, ' ')}
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
                {showCredentials ? 'Hide codes' : 'Show codes'}
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
                : 'Add the first person to get started.'
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
              <li
                key={user.id}
                className="group flex items-center transition-colors hover:bg-white/[0.03]"
              >
                <Link
                  href={`${APP_ROUTES.userEditor}?id=${user.id}`}
                  className="flex min-w-0 flex-1 items-center gap-4 py-3 pl-4"
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
                <div className="w-12 shrink-0 pr-3 text-right">
                  {canDelete(user) && (
                    <IconAction
                      icon="delete"
                      label={`Delete ${user.name || user.username}`}
                      tone="danger"
                      className="opacity-60 transition-opacity group-hover:opacity-100"
                      onClick={() => setDeleting(user)}
                    />
                  )}
                </div>
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

        {!loading && inactiveMatches > 0 && (
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className="w-full border-t border-white/[0.07] px-4 py-2.5 text-left text-xs text-neutral-400 hover:text-white"
          >
            {inactiveMatches} inactive{' '}
            {inactiveMatches === 1
              ? 'person also matches'
              : 'people also match'}
            . Show them
          </button>
        )}

        {!loading && visibleUsers.length > 0 && (
          <div className="flex items-center justify-between border-t border-white/[0.07] px-4 py-2.5 text-xs text-neutral-500">
            <span>
              Showing {visibleUsers.length} of {users.length} users
            </span>
            {showCredentials && (
              <span className="flex items-center gap-1 text-amber-400/80">
                <Icon name="warning" className="text-[14px]" />
                Sign-in codes are visible on screen
              </span>
            )}
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name || deleting?.username || 'this user'}?`}
        message="They lose access straight away and leave every company. Their worklogs stay, so company history keeps its numbers. This cannot be undone."
        loading={removing}
        onConfirm={removeUser}
      />
    </div>
  );
};
