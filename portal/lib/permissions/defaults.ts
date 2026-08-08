import { USERTYPE } from '@/models/shared/enums';

import { ALL_PERMISSIONS, WILDCARD_PERMISSION } from './catalog';
import { hasPermission } from './matching';

/**
 * Baseline policies granted to EVERY authenticated user, regardless of role.
 *
 * The portal historically enforced no per-user permissions, so every signed-in
 * user could exercise these day-to-day features. Keeping them as defaults means
 * turning on enforcement does not lock existing users out of normal workflows.
 * Genuinely privileged actions (see reserved list below) are intentionally
 * absent and must be granted explicitly by an admin.
 */
export const BASE_MEMBER_POLICIES: string[] = [
  // Worksheets: members read/append/edit and run server-side actions;
  // delete is reserved.
  'worksheets:read',
  'worksheets:append',
  'worksheets:edit',
  'worksheets:execute',
  // Worklogs are self-service.
  'worklogs:read',
  'worklogs:edit',
  // Notifications.
  'notifications:read',
  'notifications:create',
  'notifications:edit',
  // Pointers (delete reserved).
  'pointers:read',
  'pointers:create',
  'pointers:edit',
  // Read-only surfaces.
  'events:read',
  'tasks:read',
  'tasks:edit',
  // Badges: members read and EARN badges through activity (worklog streaks,
  // buff levels); creating/editing badge templates stays admin-only.
  'badges:read',
  'badges:award',
  // Short links (delete reserved).
  'shortlinks:read',
  'shortlinks:create',
  // Files.
  'files:read',
  'files:create',
  // AI studio.
  'studio:read',
  'studio:edit',
  // Reading user records is needed to load one's own profile & team directory.
  'users:read',
];

/**
 * Clients are external users with a much smaller surface — mostly read access.
 */
export const BASE_CLIENT_POLICIES: string[] = [
  'worksheets:read',
  'notifications:read',
  'notifications:edit',
  'events:read',
  'files:read',
  'files:create',
  'users:read',
  'studio:read',
];

/**
 * Reserved actions intentionally excluded from the defaults above. Listed here
 * for documentation only — an admin must grant these explicitly (or the user
 * must be a full admin). Kept in sync with the catalog by review.
 *
 *   worksheets:delete
 *   users:create, users:edit, users:delete
 *   permissions:read, permissions:grant, permissions:revoke
 *   badges:create, badges:edit, badges:delete (badges:award is a default)
 *   pointers:delete
 *   events:create, events:edit, events:delete
 *   shortlinks:delete
 */

export interface PermissionUser {
  isAdmin?: boolean | null;
  userType?: string | null;
  permissions?: string[] | null;
  deniedPermissions?: string[] | null;
}

/**
 * The BASELINE policies a user has purely from who they are, before any
 * explicit grant or denial: every catalog permission for an admin, otherwise
 * the role/type defaults. Used to render the "default" badges and to compute
 * grant/deny diffs when policies are saved.
 */
export function getBaselinePermissions(
  user: PermissionUser | null | undefined,
): string[] {
  if (!user) return [];
  if (user.isAdmin) return [...ALL_PERMISSIONS];
  return user.userType === USERTYPE.CLIENT
    ? [...BASE_CLIENT_POLICIES]
    : [...BASE_MEMBER_POLICIES];
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
 * Whether `permission` is allowed for `user`. A denial always wins, so this is
 * how a role default is taken away or a specific admin capability is disabled:
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
 * The concrete set of catalog permissions currently in effect for a user —
 * baseline plus grants, minus denials. Admins with no denials get everything.
 * Kept in exact lock-step with `isAllowed` so the admin UI's checkboxes match
 * what the server actually enforces.
 */
export function getEffectivePermissions(
  user: PermissionUser | null | undefined,
): string[] {
  if (!user) return [];
  return ALL_PERMISSIONS.filter((permission) => isAllowed(user, permission));
}
