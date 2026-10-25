import { ALL_PERMISSIONS, WILDCARD_PERMISSION } from './catalog';
import { hasPermission } from './matching';

/**
 * Policies every signed-in person has. Everything else comes from their portal
 * roles, extra grants on their user record, or (inside a company) their
 * company roles.
 */
export const BASE_MEMBER_POLICIES: string[] = [
  // Worklogs are self-service.
  'worklogs:read',
  'worklogs:edit',
  // Notifications.
  'notifications:read',
  'notifications:create',
  'notifications:edit',
  // Badges are earned automatically; everyone can see them.
  'badges:read',
  // Files (avatars).
  'files:read',
  'files:create',
  // Reading user records is needed for one's own profile and team lists.
  'users:read',
];

export interface PortalRoleDefinition {
  key: string;
  name: string;
  description: string;
  permissions: string[];
}

/** Portal roles created the first time roles are listed. */
export const DEFAULT_PORTAL_ROLES: PortalRoleDefinition[] = [
  {
    key: 'member',
    name: 'Member',
    description: 'Everyone. Writes worklogs and works inside their companies.',
    permissions: [],
  },
  {
    key: 'people-manager',
    name: 'People manager',
    description: 'Adds, edits and removes people, and sends notifications.',
    permissions: [
      'users:read',
      'users:create',
      'users:edit',
      'users:delete',
      'notifications:create',
    ],
  },
  {
    key: 'access-manager',
    name: 'Access manager',
    description: 'Manages portal roles and who holds them.',
    permissions: [
      'permissions:read',
      'permissions:grant',
      'permissions:revoke',
    ],
  },
];

export interface PermissionUser {
  isAdmin?: boolean | null;
  /** Permissions from the user's portal roles, resolved on the server. */
  rolePermissions?: string[] | null;
  permissions?: string[] | null;
  deniedPermissions?: string[] | null;
}

/**
 * The BASELINE policies a user has before per-user grants and denials: every
 * permission for an admin, otherwise the base policies plus their roles.
 */
export function getBaselinePermissions(
  user: PermissionUser | null | undefined,
): string[] {
  if (!user) return [];
  if (user.isAdmin) return [...ALL_PERMISSIONS];
  const fromRoles = Array.isArray(user.rolePermissions)
    ? user.rolePermissions
    : [];
  return Array.from(new Set([...BASE_MEMBER_POLICIES, ...fromRoles]));
}

/** The set of policies that GRANT access (may include wildcards for admins). */
function grantSet(user: PermissionUser): string[] {
  const base = user.isAdmin
    ? [WILDCARD_PERMISSION]
    : getBaselinePermissions(user);
  const granted = Array.isArray(user.permissions) ? user.permissions : [];
  return [...base, ...granted];
}

/**
 * Whether `permission` is allowed for `user`. A denial always wins:
 *
 *   allowed = (baseline ∪ grants) covers it  AND  denials do NOT cover it
 */
export function isAllowed(
  user: PermissionUser | null | undefined,
  permission: string,
): boolean {
  if (!user) return false;
  const denied = Array.isArray(user.deniedPermissions)
    ? user.deniedPermissions
    : [];
  if (hasPermission(denied, permission)) return false;
  return hasPermission(grantSet(user), permission);
}

/**
 * The concrete set of catalog permissions currently in effect for a user.
 * Kept in lock-step with `isAllowed` so the admin UI matches the server.
 */
export function getEffectivePermissions(
  user: PermissionUser | null | undefined,
): string[] {
  if (!user) return [];
  return ALL_PERMISSIONS.filter((permission) => isAllowed(user, permission));
}

/** Keeps only real, non-wildcard permissions. */
export function sanitizePermissions(permissions: unknown): string[] {
  if (!Array.isArray(permissions)) return [];
  const valid = new Set(ALL_PERMISSIONS);
  return Array.from(
    new Set(
      permissions.filter(
        (p): p is string => typeof p === 'string' && valid.has(p),
      ),
    ),
  );
}
