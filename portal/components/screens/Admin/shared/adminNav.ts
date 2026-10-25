export type AdminTabId =
  | 'overview'
  | 'users'
  | 'notifications'
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
  /** A portal permission that also opens an `admin` tab without full admin. */
  permission?: string;
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
    description: 'Everyone who can sign in, their roles and sign-in codes.',
    group: 'Workspace',
    access: 'admin',
    permission: 'users:edit',
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
    description: 'What each role can do, in the portal and inside a company.',
    group: 'Companies',
    access: 'company',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: 'notifications',
    title: 'Send notifications',
    description: 'Send an announcement to everyone or to a few people.',
    group: 'Community',
    access: 'admin',
  },
  {
    id: 'badges',
    label: 'Badges',
    icon: 'workspace_premium',
    title: 'Badges',
    description: 'Badges people unlock automatically from their work.',
    group: 'Community',
    access: 'admin',
    permission: 'badges:create',
  },
];

export const DEFAULT_ADMIN_TAB: AdminTabId = 'overview';

export const getAdminTab = (id?: string | null): AdminTab =>
  ADMIN_TABS.find((tab) => tab.id === id) ??
  (ADMIN_TABS.find((tab) => tab.id === DEFAULT_ADMIN_TAB) as AdminTab);
