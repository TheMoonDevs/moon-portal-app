export type AdminTabId =
  | 'overview'
  | 'users'
  | 'notifications'
  | 'events'
  | 'badges';

export type AdminNavGroup = 'Workspace' | 'Community';

export type AdminTab = {
  id: AdminTabId;
  label: string;
  icon: string;
  title: string;
  description: string;
  group: AdminNavGroup;
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = ['Workspace', 'Community'];

export const ADMIN_TABS: AdminTab[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'dashboard',
    title: 'Overview',
    description: 'A snapshot of everything happening across the portal.',
    group: 'Workspace',
  },
  {
    id: 'users',
    label: 'Users',
    icon: 'group',
    title: 'Manage users',
    description: 'Members and clients, their access, roles and credentials.',
    group: 'Workspace',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: 'notifications',
    title: 'Send notifications',
    description: 'Broadcast announcements to members and clients.',
    group: 'Community',
  },
  {
    id: 'events',
    label: 'Events',
    icon: 'event',
    title: 'Events',
    description: 'Schedule the events shown across the portal calendar.',
    group: 'Community',
  },
  {
    id: 'badges',
    label: 'Badges',
    icon: 'workspace_premium',
    title: 'Badge templates',
    description: 'Achievement badges members can unlock.',
    group: 'Community',
  },
];

export const DEFAULT_ADMIN_TAB: AdminTabId = 'overview';

export const getAdminTab = (id?: string | null): AdminTab =>
  ADMIN_TABS.find((tab) => tab.id === id) ??
  (ADMIN_TABS.find((tab) => tab.id === DEFAULT_ADMIN_TAB) as AdminTab);
