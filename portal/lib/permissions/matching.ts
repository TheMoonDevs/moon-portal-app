import { WILDCARD_PERMISSION } from './catalog';

/**
 * Returns true when `granted` satisfies the `required` permission.
 *
 * Matching rules (in order):
 *   - `*`             matches anything
 *   - exact match     (`worksheets:read` === `worksheets:read`)
 *   - `resource:*`    matches any action on that resource
 */
export function permissionMatches(granted: string, required: string): boolean {
  if (granted === WILDCARD_PERMISSION) return true;
  if (granted === required) return true;

  const [grantedResource, grantedAction] = granted.split(':');
  const [requiredResource] = required.split(':');

  if (grantedResource === requiredResource && grantedAction === '*') {
    return true;
  }
  return false;
}

/**
 * Returns true when any of the `granted` permissions satisfies `required`.
 */
export function hasPermission(
  granted: readonly string[],
  required: string,
): boolean {
  return granted.some((g) => permissionMatches(g, required));
}

/**
 * Returns true when the granted set satisfies EVERY required permission.
 */
export function hasAllPermissions(
  granted: readonly string[],
  required: readonly string[],
): boolean {
  return required.every((r) => hasPermission(granted, r));
}
