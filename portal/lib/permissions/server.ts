import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { db } from '@/lib/mongodb/db-client';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

import { isAllowed } from './defaults';
import { PERMISSION_DENIED_CODE } from './PermissionError';
import { isSuperAdminEmail } from './superAdmin';

export interface SessionUser {
  id: string;
  username?: string;
  email?: string | null;
  isAdmin?: boolean;
  roleKeys?: string[];
  /** Permissions from the user's portal roles. */
  rolePermissions?: string[];
  permissions?: string[] | null;
  deniedPermissions?: string[] | null;
  /** The Google account verified at sign-in. */
  googleEmail?: string | null;
  /** Only true for the hard-coded super admin, see ./superAdmin. */
  isSuperAdmin?: boolean;
}

type PermissionMode = 'enforce' | 'audit' | 'off';

function getMode(): PermissionMode {
  const raw = (process.env.PERMISSIONS_MODE ?? 'enforce').toLowerCase();
  if (raw === 'off' || raw === 'audit') return raw;
  return 'enforce';
}

/** Every permission held through the given portal roles. */
export async function rolePermissionsFor(
  roleKeys: string[] | null | undefined,
): Promise<string[]> {
  if (!Array.isArray(roleKeys) || roleKeys.length === 0) return [];
  const roles = await db.role.findMany({ where: { key: { in: roleKeys } } });
  return Array.from(
    new Set(
      roles.flatMap((r: { permissions?: string[] }) =>
        Array.isArray(r.permissions) ? r.permissions : [],
      ),
    ),
  );
}

/**
 * Resolve the acting user from the NextAuth session, hydrated with the fields
 * needed for permission checks (isAdmin, roles, permissions).
 *
 * Returns null when there is no session, or when the user was deleted or is
 * no longer active, so their old session stops working straight away.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = (await getServerSession(authOptions as any)) as any;
  const sessionUser = session?.user as
    | { id?: string; email?: string; googleEmail?: string | null }
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
  if (record.status && record.status !== 'ACTIVE') return null;

  const roleKeys: string[] = Array.isArray(record.roleKeys)
    ? record.roleKeys
    : [];

  return {
    id: record.id,
    username: record.username,
    email: record.email ?? null,
    isAdmin: !!record.isAdmin,
    roleKeys,
    rolePermissions: await rolePermissionsFor(roleKeys),
    permissions: Array.isArray(record.permissions) ? record.permissions : [],
    deniedPermissions: Array.isArray(record.deniedPermissions)
      ? record.deniedPermissions
      : [],
    googleEmail: sessionUser.googleEmail ?? null,
    isSuperAdmin: isSuperAdminEmail(sessionUser.googleEmail),
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
 * Requests without a signed-in user are rejected with 401. (The portal no
 * longer has server-to-server callers, and the API key ships in the browser,
 * so it is not proof of anything.)
 */
export async function checkPermission(
  requiredPermission: string,
): Promise<EnforceResult> {
  const mode = getMode();
  if (mode === 'off') {
    return { response: null, user: null, allowed: true };
  }

  const user = await getSessionUser();

  if (!user) {
    return {
      response: NextResponse.json(
        { status: 'fail', error: 'Authentication required.' },
        { status: 401 },
      ),
      user: null,
      allowed: false,
    };
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
 *   const denied = await enforcePermission('projects:edit');
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

/**
 * Guard for super-admin-only actions (creating or archiving companies). Needs a
 * signed-in session whose Google-verified email is on the super-admin list. It
 * ignores PERMISSIONS_MODE and every grant, so it cannot be bypassed by an API
 * key, a sessionless call or a permission edit.
 */
export async function requireSuperAdmin(): Promise<{
  response: NextResponse | null;
  user: SessionUser | null;
}> {
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
  if (!user.isSuperAdmin) {
    return { response: permissionDeniedResponse('companies:create'), user };
  }
  return { response: null, user };
}
