export type AdminTabId =
  | 'overview'
  | 'users'
  | 'notifications'
  | 'events'
  | 'badges'
  | 'companies'
  | 'projects'
  | 'tasks'
  | 'roles';

export type AdminNavGroup = 'Workspace' | 'Companies' | 'Community';

export type AdminTab = {
  id: AdminTabId;
  label: string;
  icon: string;
  title: string;
  description: string;
  group: AdminNavGroup;
  /**
   * `admin` tabs need a portal admin. `company` tabs are also open to people
   * who manage a company; the data inside is scoped to their companies.
   */
  access: 'admin' | 'company';
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  'Workspace',
  'Companies',
  'Community',
];

export const ADMIN_TABS: AdminTab[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'dashboard',
    title: 'Overview',
    description: 'A snapshot of everything happening across the portal.',
    group: 'Workspace',
    access: 'admin',
  },
  {
    id: 'users',
    label: 'Users',
    icon: 'group',
    title: 'Manage users',
    description: 'Members and clients, their access, roles and credentials.',
    group: 'Workspace',
    access: 'admin',
  },
  {
    id: 'companies',
    label: 'Companies',
    icon: 'domain',
    title: 'Companies',
    description: 'Companies, their details and the people in each.',
    group: 'Companies',
    access: 'company',
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: 'folder_open',
    title: 'Projects',
    description: 'Projects inside each company, with their progress.',
    group: 'Companies',
    access: 'company',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: 'checklist',
    title: 'Tasks',
    description: 'Major and minor tasks for each project.',
    group: 'Companies',
    access: 'company',
  },
  {
    id: 'roles',
    label: 'Roles',
    icon: 'badge',
    title: 'Roles & access',
    description: 'What each role can do inside a company.',
    group: 'Companies',
    access: 'company',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: 'notifications',
    title: 'Send notifications',
    description: 'Broadcast announcements to members and clients.',
    group: 'Community',
    access: 'admin',
  },
  {
    id: 'events',
    label: 'Events',
    icon: 'event',
    title: 'Events',
    description: 'Schedule the events shown across the portal calendar.',
    group: 'Community',
    access: 'admin',
  },
  {
    id: 'badges',
    label: 'Badges',
    icon: 'workspace_premium',
    title: 'Badge templates',
    description: 'Achievement badges members can unlock.',
    group: 'Community',
    access: 'admin',
  },
];

export const DEFAULT_ADMIN_TAB: AdminTabId = 'overview';

export const getAdminTab = (id?: string | null): AdminTab =>
  ADMIN_TABS.find((tab) => tab.id === id) ??
  (ADMIN_TABS.find((tab) => tab.id === DEFAULT_ADMIN_TAB) as AdminTab);
