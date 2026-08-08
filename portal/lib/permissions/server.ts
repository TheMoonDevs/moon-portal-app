import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { db } from '@/lib/mongodb/db-client';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

import { isAllowed } from './defaults';
import { PERMISSION_DENIED_CODE } from './PermissionError';

export interface SessionUser {
  id: string;
  username?: string;
  email?: string | null;
  isAdmin?: boolean;
  userType?: string;
  permissions?: string[] | null;
  deniedPermissions?: string[] | null;
}

type PermissionMode = 'enforce' | 'audit' | 'off';

function getMode(): PermissionMode {
  const raw = (process.env.PERMISSIONS_MODE ?? 'enforce').toLowerCase();
  if (raw === 'off' || raw === 'audit') return raw;
  return 'enforce';
}

/**
 * Resolve the acting user from the NextAuth session, hydrated with the fields
 * needed for permission checks (isAdmin, userType, permissions).
 *
 * Returns null when there is no user session — this is the case for
 * server-to-server calls (cron jobs, Slack, external webhooks) which
 * authenticate via the shared API key and are intentionally not subject to
 * per-user permission checks.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = (await getServerSession(authOptions as any)) as any;
  const sessionUser = session?.user as
    | { id?: string; email?: string }
    | undefined;
  if (!sessionUser) return null;

  let record: any = null;
  if (sessionUser.id) {
    record = await db.user.findFirst({ where: { id: sessionUser.id } });
    if (!record) {
      record = await db.user.findFirst({
        where: { username: sessionUser.id },
      });
    }
  }
  if (!record && sessionUser.email) {
    record = await db.user.findFirst({ where: { email: sessionUser.email } });
  }
  if (!record) return null;

  return {
    id: record.id,
    username: record.username,
    email: record.email ?? null,
    isAdmin: !!record.isAdmin,
    userType: record.userType,
    permissions: Array.isArray(record.permissions) ? record.permissions : [],
    deniedPermissions: Array.isArray(record.deniedPermissions)
      ? record.deniedPermissions
      : [],
  };
}

/** Build the standard 403 response body for a missing permission. */
export function permissionDeniedResponse(
  requiredPermission: string,
): NextResponse {
  return NextResponse.json(
    {
      status: 'fail',
      code: PERMISSION_DENIED_CODE,
      error: `You do not have permission to perform this action (requires "${requiredPermission}").`,
      requiredPermission,
    },
    { status: 403 },
  );
}

export interface EnforceResult {
  /** Present when the request should be rejected — return it from the route. */
  response: NextResponse | null;
  /** The resolved acting user, if any (useful for owner-scoped logic). */
  user: SessionUser | null;
  /** Whether the user was allowed (true also for sessionless service calls). */
  allowed: boolean;
}

/**
 * Core check. Resolves the acting user and decides whether `requiredPermission`
 * is satisfied. Honors PERMISSIONS_MODE:
 *   - off    → always allowed
 *   - audit  → logs denials but allows the request through
 *   - enforce→ returns a 403 response on denial (default)
 *
 * Sessionless requests (no logged-in user) are treated as trusted service
 * calls and always allowed.
 */
export async function checkPermission(
  requiredPermission: string,
): Promise<EnforceResult> {
  const mode = getMode();
  if (mode === 'off') {
    return { response: null, user: null, allowed: true };
  }

  const user = await getSessionUser();

  // No user session → server-to-server / public call; not user-permission gated.
  if (!user) {
    return { response: null, user: null, allowed: true };
  }

  const allowed = isAllowed(user, requiredPermission);

  if (allowed) {
    return { response: null, user, allowed: true };
  }

  if (mode === 'audit') {
    // eslint-disable-next-line no-console
    console.warn(
      `[permissions:audit] user ${user.username ?? user.id} would be denied "${requiredPermission}"`,
    );
    return { response: null, user, allowed: true };
  }

  return {
    response: permissionDeniedResponse(requiredPermission),
    user,
    allowed: false,
  };
}

/**
 * Convenience guard for the common case: returns a 403 `NextResponse` to return
 * from the handler when the acting user lacks `requiredPermission`, or `null`
 * when the request may proceed.
 *
 *   const denied = await enforcePermission('worksheets:edit');
 *   if (denied) return denied;
 */
export async function enforcePermission(
  requiredPermission: string,
): Promise<NextResponse | null> {
  const { response } = await checkPermission(requiredPermission);
  return response;
}

/**
 * Guard for endpoints that require a specific permission AND a logged-in user
 * (e.g. managing other users' policies). Unlike `enforcePermission`, a
 * sessionless call is rejected with 401 rather than waved through — these
 * endpoints have no meaningful anonymous/service caller.
 *
 * Returns a `response` to return from the handler when the caller is not
 * authenticated or lacks `permission`, or `{ user }` when allowed.
 */
export async function requireAuthedPermission(permission: string): Promise<{
  response: NextResponse | null;
  user: SessionUser | null;
}> {
  if (getMode() === 'off') {
    const user = await getSessionUser();
    return { response: null, user };
  }
  const user = await getSessionUser();
  if (!user) {
    return {
      response: NextResponse.json(
        { status: 'fail', error: 'Authentication required.' },
        { status: 401 },
      ),
      user: null,
    };
  }
  if (!isAllowed(user, permission)) {
    return { response: permissionDeniedResponse(permission), user };
  }
  return { response: null, user };
}
