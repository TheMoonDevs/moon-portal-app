'use client';

import type { User } from '@db/client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Toaster } from 'sonner';

import { cn } from '@/lib/utils';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { AdminUsers } from './AdminUsers';
import AdminBadges from './badge-template/AdminBadges';
import EventForm from './Events/EventForm';
import { AdminOverview } from './Overview/AdminOverview';
import SendNotifications from './SendNotifications';
import { AdminCommandPalette } from './shared/AdminCommandPalette';
import type { AdminTabId } from './shared/adminNav';
import {
  ADMIN_NAV_GROUPS,
  ADMIN_TABS,
  DEFAULT_ADMIN_TAB,
  getAdminTab,
} from './shared/adminNav';
import { AdminButton, Icon, IconAction, UserAvatar } from './shared/AdminUI';

const SIDEBAR_STORAGE_KEY = 'tmd-admin-sidebar-collapsed';

/** Tabs that render the shared user list, so a load failure is worth reporting. */
const TABS_USING_USERS: AdminTabId[] = ['overview', 'users', 'notifications'];

export const AdminPage = () => {
  const router = useRouter();
  const { user: adminUser } = useUser();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeTabId, setActiveTabId] = useState<AdminTabId>(DEFAULT_ADMIN_TAB);

  const activeTab = getAdminTab(activeTabId);

  /* ----------------------------- data loading ----------------------------- */

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await PortalSdk.getData('/api/user', null);
      setUsers(data?.data?.user || []);
    } catch (error) {
      console.error(error);
      setLoadError('We could not load the users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /* --------------------------- sidebar preference -------------------------- */

  useEffect(() => {
    setCollapsed(localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true');
    const tabFromUrl = new URLSearchParams(window.location.search).get('tab');
    if (tabFromUrl) setActiveTabId(getAdminTab(tabFromUrl).id);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((previous) => {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(!previous));
      return !previous;
    });
  };

  /* -------------------------------- routing -------------------------------- */

  const goToTab = useCallback((tab: AdminTabId) => {
    setActiveTabId(tab);
    setMobileNavOpen(false);
    window.history.replaceState(null, '', `${APP_ROUTES.admin}?tab=${tab}`);
  }, []);

  /* ------------------------------- shortcuts ------------------------------- */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  /* -------------------------------- content -------------------------------- */

  const counts = useMemo(
    () => ({
      members: users.filter((user) => user.userType === 'MEMBER').length,
      clients: users.filter((user) => user.userType === 'CLIENT').length,
    }),
    [users],
  );

  const renderTab = () => {
    switch (activeTab.id) {
      case 'overview':
        return (
          <AdminOverview
            users={users}
            loading={loading}
            onNavigate={goToTab}
            onRefreshUsers={fetchUsers}
          />
        );
      case 'users':
        return (
          <AdminUsers users={users} loading={loading} onRefresh={fetchUsers} />
        );
      case 'notifications':
        return <SendNotifications users={users} loading={loading} />;
      case 'events':
        return <EventForm />;
      case 'badges':
        return <AdminBadges />;
      default:
        return null;
    }
  };

  /* ------------------------------- navigation ------------------------------ */

  const navigation = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {ADMIN_NAV_GROUPS.map((group) => {
        const items = ADMIN_TABS.filter((tab) => tab.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group} className="flex flex-col gap-1">
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                {group}
              </p>
            )}
            {items.map((tab) => {
              const isActive = tab.id === activeTab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => goToTab(tab.id)}
                  title={collapsed ? tab.label : undefined}
                  className={cn(
                    'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors',
                    collapsed && 'justify-center px-0',
                    isActive
                      ? 'bg-white/[0.09] font-medium text-white'
                      : 'text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-100',
                  )}
                >
                  {isActive && (
                    <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-white" />
                  )}
                  <Icon name={tab.icon} className="text-[20px]" />
                  {!collapsed && <span className="truncate">{tab.label}</span>}
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  const sidebarContent = (
    <>
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-3 border-b border-white/[0.07] px-4',
          collapsed && 'justify-center px-0',
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo/logo_white.png"
          alt="TheMoonDevs"
          className="size-8 shrink-0 object-contain"
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-xs font-bold tracking-[0.2em] text-white">
              THEMOONDEVS
            </p>
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">
              Admin console
            </p>
          </div>
        )}
      </div>

      {navigation}

      <div className="shrink-0 border-t border-white/[0.07] p-3">
        <button
          onClick={() => router.push(APP_ROUTES.home)}
          className={cn(
            'flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-neutral-400 transition-colors hover:bg-white/[0.05] hover:text-neutral-100',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? 'Back to portal' : undefined}
        >
          <Icon name="arrow_back" className="text-[20px]" />
          {!collapsed && 'Back to portal'}
        </button>
        <button
          onClick={toggleCollapsed}
          className={cn(
            'mt-1 hidden h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-neutral-500 transition-colors hover:bg-white/[0.05] hover:text-neutral-100 lg:flex',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon
            name={collapsed ? 'right_panel_close' : 'left_panel_close'}
            className="text-[20px]"
          />
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </>
  );

  /* --------------------------------- render -------------------------------- */

  return (
    <div className="flex h-dvh overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-white/[0.07] bg-neutral-950 transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[72px]' : 'w-64',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-white/[0.07] bg-neutral-950 shadow-2xl animate-in slide-in-from-left">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-white/[0.07] bg-neutral-950/80 px-4 backdrop-blur sm:px-6">
          <IconAction
            icon="menu"
            label="Open navigation"
            className="lg:hidden"
            onClick={() => setMobileNavOpen(true)}
          />

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-white">
              {activeTab.title}
            </h1>
            <p className="hidden truncate text-xs text-neutral-500 sm:block">
              {activeTab.description}
            </p>
          </div>

          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs text-neutral-500 transition-colors hover:border-white/20 hover:text-neutral-300 md:flex"
          >
            <Icon name="search" className="text-[16px]" />
            Search everything
            <kbd className="ml-2 rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-neutral-400">
              ⌘K
            </kbd>
          </button>

          <IconAction
            icon="search"
            label="Search"
            className="md:hidden"
            onClick={() => setPaletteOpen(true)}
          />

          <IconAction
            icon="refresh"
            label="Refresh data"
            loading={loading}
            onClick={fetchUsers}
          />

          <div className="flex items-center gap-2 border-l border-white/[0.07] pl-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-[140px] truncate text-xs font-medium text-neutral-200">
                {adminUser?.name || 'Admin'}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                {counts.members} members · {counts.clients} clients
              </p>
            </div>
            <UserAvatar
              src={adminUser?.avatar}
              name={adminUser?.name}
              size={32}
            />
          </div>
        </header>

        {/* Content */}
        <main className="custom-scrollbar flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {loadError && TABS_USING_USERS.includes(activeTab.id) && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                <span className="flex items-center gap-2">
                  <Icon name="error" className="text-[18px]" />
                  {loadError}
                </span>
                <AdminButton size="sm" icon="refresh" onClick={fetchUsers}>
                  Retry
                </AdminButton>
              </div>
            )}
            {renderTab()}
          </div>
        </main>
      </div>

      <AdminCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        users={users}
        onNavigate={goToTab}
      />

      <Toaster theme="dark" position="bottom-right" richColors closeButton />
    </div>
  );
};
