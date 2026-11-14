export type AdminTabId =
  | 'overview'
  | 'users'
  | 'notifications'
  | 'badges'
  | 'companies'
  | 'projects'
  | 'tasks'
  | 'roles'
  | 'agreements'
  | 'signing-rules'
  | 'agreement-templates'
  | 'required-documents'
  | 'chat-reports';

/** Tabs that moved to the Hiring space, and the page each opens there. */
export const MOVED_TO_HIRING: Record<string, string> = {
  hiring: 'candidates',
  onboarding: 'onboarding',
  courses: 'courses',
};

export type AdminNavGroup =
  | 'Workspace'
  | 'Companies'
  | 'Administration'
  | 'Community';

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
  /**
   * On an `admin` tab: a portal permission that also opens it without full
   * admin. On a `company` tab: the company permission needed in at least one
   * company to see it; without one, the tab is shown to company managers.
   */
  permission?: string;
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  'Workspace',
  'Companies',
  'Administration',
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
    id: 'agreements',
    label: 'Agreements',
    icon: 'signature',
    title: 'Agreements',
    description:
      'Send any agreement to sign, follow who has signed, and find any signed document or person’s file.',
    group: 'Companies',
    access: 'company',
    permission: 'agreements:read',
  },
  {
    id: 'signing-rules',
    label: 'Signing rules',
    icon: 'approval',
    title: 'Signing rules',
    description:
      'Who signs each kind of document for the company, which are confidential, and automatic reminders.',
    group: 'Administration',
    access: 'company',
    permission: 'agreements:read',
  },
  {
    id: 'agreement-templates',
    label: 'Agreement templates',
    icon: 'description',
    title: 'Agreement templates',
    description:
      'The company’s own wording for agreements, with blanks to fill in when sending.',
    group: 'Administration',
    access: 'company',
    permission: 'agreements:read',
  },
  {
    id: 'required-documents',
    label: 'Required documents',
    icon: 'checklist',
    title: 'Required documents',
    description:
      'What each role must have signed, who is missing what, and one button to send the missing ones.',
    group: 'Administration',
    access: 'company',
    permission: 'agreements:read',
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
    id: 'chat-reports',
    label: 'Chat reports',
    icon: 'flag',
    title: 'Reported messages',
    description:
      'Messages people reported in chat. Remove each one for everyone or leave it up, within a day.',
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
