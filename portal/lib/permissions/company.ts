import { ALL_COMPANY_PERMISSIONS } from './catalog';
import { isAllowed, type PermissionUser } from './defaults';
import { hasPermission } from './matching';

/**
 * Company-scoped access.
 *
 * Inside a company a user holds one or more roles; each role is a list of
 * `resource:action` strings (the same format as user-level permissions).
 * What a user may do in a company is:
 *
 *   their user-level permissions  ∪  the permissions of their roles there
 *
 * so a global admin (`*`) can act in every company, and an ordinary member can
 * only act where they hold a role.
 */

export interface CompanyRoleDefinition {
  key: string;
  name: string;
  description: string;
  permissions: string[];
}

/** Roles seeded into every new company. They can be edited afterwards. */
export const DEFAULT_COMPANY_ROLES: CompanyRoleDefinition[] = [
  {
    key: 'owner',
    name: 'Owner',
    description: 'Full control of the company, its people and its work.',
    permissions: [...ALL_COMPANY_PERMISSIONS],
  },
  {
    key: 'manager',
    name: 'Manager',
    description: 'Runs projects and tasks, and manages who is on the team.',
    permissions: [
      'companies:read',
      'members:read',
      'members:create',
      'members:edit',
      'roles:read',
      'projects:read',
      'projects:create',
      'projects:edit',
      'tasks:read',
      'tasks:create',
      'tasks:edit',
      'tasks:delete',
    ],
  },
  {
    key: 'member',
    name: 'Member',
    description: 'Works on projects: sees them and creates or updates tasks.',
    permissions: [
      'companies:read',
      'members:read',
      'projects:read',
      'tasks:read',
      'tasks:create',
      'tasks:edit',
    ],
  },
  {
    key: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to the company’s projects and tasks.',
    permissions: [
      'companies:read',
      'members:read',
      'projects:read',
      'tasks:read',
    ],
  },
];

export const DEFAULT_MEMBER_ROLE_KEY = 'member';

export interface CompanyAccess {
  /** Permissions granted by the user's roles in this company. */
  rolePermissions: string[];
}

export function isAllowedInCompany(
  user: PermissionUser | null | undefined,
  access: CompanyAccess | null | undefined,
  permission: string,
): boolean {
  if (!user) return false;
  if (isAllowed(user, permission)) return true;
  if (!access) return false;
  const denied = Array.isArray(user.deniedPermissions)
    ? user.deniedPermissions
    : [];
  if (hasPermission(denied, permission)) return false;
  return hasPermission(access.rolePermissions, permission);
}

/** Concrete company permissions in effect, for rendering the UI. */
export function getEffectiveCompanyPermissions(
  user: PermissionUser | null | undefined,
  access: CompanyAccess | null | undefined,
): string[] {
  return ALL_COMPANY_PERMISSIONS.filter((permission) =>
    isAllowedInCompany(user, access, permission),
  );
}

/** Keeps only permissions a company role may hold. */
export function sanitizeRolePermissions(permissions: unknown): string[] {
  if (!Array.isArray(permissions)) return [];
  const valid = new Set(ALL_COMPANY_PERMISSIONS);
  return Array.from(
    new Set(
      permissions.filter(
        (p): p is string => typeof p === 'string' && valid.has(p),
      ),
    ),
  );
}
