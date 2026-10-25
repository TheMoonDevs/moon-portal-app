/**
 * Catalog of access-control resources and the actions each supports.
 *
 * A permission (a.k.a. "policy" / "rule") is a `resource:action` string such as
 * `worklogs:read` or `users:edit`. Wildcards are supported when matching:
 *   - `*`            → every permission (super-admin)
 *   - `projects:*`   → every action on the projects resource
 *
 * This module is intentionally free of any server-only imports so it can be
 * shared by API route handlers, the admin UI, and the client error boundary.
 */

export const PERMISSION_ACTIONS = [
  'read',
  'create',
  'append',
  'edit',
  'delete',
  'execute',
  'award',
  'grant',
  'revoke',
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export interface ResourceDefinition {
  /** Stable key used as the `resource` half of a permission string. */
  key: string;
  /** Human-friendly label for the admin UI. */
  label: string;
  /** Short description of what the resource covers. */
  description: string;
  /** Actions that make sense for this resource. */
  actions: PermissionAction[];
  /**
   * `company` resources can also be granted through a company role, which
   * applies them inside that company only. A grant on the user record applies
   * to every company.
   */
  scope?: 'global' | 'company';
}

export const PERMISSION_RESOURCES: ResourceDefinition[] = [
  {
    key: 'companies',
    label: 'Companies',
    description:
      'Company profiles. `read` on the user record lists every company; `edit` inside a company role edits that company. Creating companies is reserved for the super admin and cannot be granted.',
    actions: ['read', 'edit'],
    scope: 'company',
  },
  {
    key: 'members',
    label: 'Company members',
    description: 'Who belongs to a company and which roles they hold.',
    actions: ['read', 'create', 'edit', 'delete'],
    scope: 'company',
  },
  {
    key: 'roles',
    label: 'Company roles',
    description: 'The roles a company defines and the permissions in each.',
    actions: ['read', 'create', 'edit', 'delete'],
    scope: 'company',
  },
  {
    key: 'projects',
    label: 'Projects',
    description: 'Projects inside a company.',
    actions: ['read', 'create', 'edit', 'delete'],
    scope: 'company',
  },
  {
    key: 'tasks',
    label: 'Tasks',
    description: 'Major and minor tasks inside a project.',
    actions: ['read', 'create', 'edit', 'delete'],
    scope: 'company',
  },
  {
    key: 'users',
    label: 'Users',
    description: 'Team & client user records and profiles.',
    actions: ['read', 'create', 'edit', 'delete'],
  },
  {
    key: 'permissions',
    label: 'Access policies',
    description:
      "Viewing and changing other users' access policies (grant / revoke).",
    actions: ['read', 'grant', 'revoke'],
  },
  {
    key: 'badges',
    label: 'Badges',
    description:
      'Badge templates (create/edit/delete are admin) and `award`, the self-generated earning of badges through activity like worklogs.',
    actions: ['read', 'award', 'create', 'edit', 'delete'],
  },
  {
    key: 'worklogs',
    label: 'Worklogs',
    description: 'Daily worklogs, monthly targets and admin tasks.',
    actions: ['read', 'edit'],
  },
  {
    key: 'notifications',
    label: 'Notifications',
    description: 'In-app notifications and push subscriptions.',
    actions: ['read', 'create', 'edit'],
  },
  {
    key: 'pointers',
    label: 'Pointers',
    description: 'Pointers and their replies.',
    actions: ['read', 'create', 'edit', 'delete'],
  },
  {
    key: 'events',
    label: 'Events',
    description: 'Calendar / activity events.',
    actions: ['read', 'create', 'edit', 'delete'],
  },
  {
    key: 'files',
    label: 'Files',
    description: 'File uploads and blob links.',
    actions: ['read', 'create'],
  },
];

/** Resources that a company role can grant. */
export const COMPANY_PERMISSION_RESOURCES = PERMISSION_RESOURCES.filter(
  (r) => r.scope === 'company',
);

/** Every concrete permission a company role can hold. */
export const ALL_COMPANY_PERMISSIONS: string[] =
  COMPANY_PERMISSION_RESOURCES.flatMap((r) =>
    r.actions.map((a) => `${r.key}:${a}`),
  );

/** Every concrete (non-wildcard) permission string the app knows about. */
export const ALL_PERMISSIONS: string[] = PERMISSION_RESOURCES.flatMap((r) =>
  r.actions.map((a) => `${r.key}:${a}`),
);

/** The super-admin wildcard that grants everything. */
export const WILDCARD_PERMISSION = '*';

/** Build a `resource:action` permission string in a type-safe-ish way. */
export const perm = (resource: string, action: PermissionAction): string =>
  `${resource}:${action}`;
