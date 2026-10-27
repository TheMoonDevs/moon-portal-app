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

/**
 * What every active member of a company may do there, whatever their roles:
 * see the company, its people, projects and tasks, and add and edit
 * projects (deleting one needs a role that allows it).
 */
export const COMPANY_MEMBER_PERMISSIONS = [
  'companies:read',
  'members:read',
  'projects:read',
  'projects:create',
  'projects:edit',
  'tasks:read',
];

/**
 * What the lead and team of a project may do inside it: add, edit and
 * delete its tasks (plans with a step for the project follow the same rule).
 */
export const PROJECT_TEAM_PERMISSIONS = [
  'tasks:read',
  'tasks:create',
  'tasks:edit',
  'tasks:delete',
];

/** The Member role's list before members got the rights above built in. */
export const OLD_MEMBER_ROLE_PERMISSIONS = [
  'companies:read',
  'members:read',
  'projects:read',
  'tasks:read',
  'tasks:create',
  'tasks:edit',
];

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
    description:
      'Adds and edits projects, and runs the tasks and plans of the projects they are on.',
    permissions: [...COMPANY_MEMBER_PERMISSIONS],
  },
  {
    key: 'recruiter',
    name: 'Recruiter',
    description: 'Runs hiring: openings, application forms and candidates.',
    permissions: [
      'companies:read',
      'members:read',
      'hiring:read',
      'hiring:create',
      'hiring:edit',
      'hiring:delete',
    ],
  },
  {
    key: 'viewer',
    name: 'Viewer',
    description:
      'Sees the company’s projects and tasks. Like every member, can add and edit projects.',
    permissions: [
      'companies:read',
      'members:read',
      'projects:read',
      'tasks:read',
    ],
  },
];

export const DEFAULT_MEMBER_ROLE_KEY = 'member';

/**
 * What a company role grants. The Owner role always has every company
 * permission, including ones added after the company was created.
 */
export function companyRolePermissions(role: {
  key: string;
  permissions?: string[] | null;
  isSystem?: boolean | null;
}): string[] {
  if (role.key === 'owner') return [...ALL_COMPANY_PERMISSIONS];
  if (isOldMemberRole(role)) return [...COMPANY_MEMBER_PERMISSIONS];
  return role.permissions ?? [];
}

/**
 * A built-in Member role nobody has changed since members got their rights
 * built in. It follows the new list, so tasks belong to each project's team.
 */
export const isOldMemberRole = (role: {
  key: string;
  permissions?: string[] | null;
  isSystem?: boolean | null;
}) => {
  const list = role.permissions ?? [];
  return (
    role.key === 'member' &&
    !!role.isSystem &&
    list.length === OLD_MEMBER_ROLE_PERMISSIONS.length &&
    OLD_MEMBER_ROLE_PERMISSIONS.every((p) => list.includes(p))
  );
};

export interface CompanyAccess {
  /** Permissions granted by the user's roles in this company. */
  rolePermissions: string[];
}

/** Whether the person leads the project or is on its team. */
export const isOnProjectTeam = (
  project:
    | { leadIds?: string[] | null; memberIds?: string[] | null }
    | null
    | undefined,
  userId: string,
) =>
  !!project &&
  ((project.leadIds ?? []).includes(userId) ||
    (project.memberIds ?? []).includes(userId));

/**
 * Whether being on the project's team allows `permission` there. A denial
 * on the person's own record still wins.
 */
export function teamAllows(
  user: { id: string; deniedPermissions?: string[] | null } | null | undefined,
  project:
    | { leadIds?: string[] | null; memberIds?: string[] | null }
    | null
    | undefined,
  permission: string,
): boolean {
  if (!user || !PROJECT_TEAM_PERMISSIONS.includes(permission)) return false;
  if (!isOnProjectTeam(project, user.id)) return false;
  const denied = Array.isArray(user.deniedPermissions)
    ? user.deniedPermissions
    : [];
  return !hasPermission(denied, permission);
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
