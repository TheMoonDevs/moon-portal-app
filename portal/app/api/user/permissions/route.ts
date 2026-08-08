import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import {
  ALL_PERMISSIONS,
  getBaselinePermissions,
  getEffectivePermissions,
  isAllowed,
  PERMISSION_RESOURCES,
  WILDCARD_PERMISSION,
} from '@/lib/permissions';
import {
  permissionDeniedResponse,
  requireAuthedPermission,
} from '@/lib/permissions/server';

export const dynamic = 'force-dynamic';

const KNOWN_RESOURCES = new Set(PERMISSION_RESOURCES.map((r) => r.key));
const KNOWN_PERMISSIONS = new Set(ALL_PERMISSIONS);

/** A permission string is valid if it is the wildcard, a `resource:*`
 *  wildcard for a known resource, or a known concrete `resource:action`. */
function isValidPermission(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value === WILDCARD_PERMISSION) return true;
  if (KNOWN_PERMISSIONS.has(value)) return true;
  const [resource, action] = value.split(':');
  return action === '*' && KNOWN_RESOURCES.has(resource);
}

function summarize(user: {
  id: string;
  isAdmin?: boolean | null;
  permissions?: string[] | null;
  deniedPermissions?: string[] | null;
  userType?: string | null;
}) {
  return {
    userId: user.id,
    isAdmin: !!user.isAdmin,
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    deniedPermissions: Array.isArray(user.deniedPermissions)
      ? user.deniedPermissions
      : [],
    // Concrete baseline (role defaults, or everything for an admin) and the
    // concrete set currently in effect — the UI checks against `effective` and
    // badges anything in `baseline`.
    baseline: getBaselinePermissions(user),
    effective: getEffectivePermissions(user),
  };
}

/**
 * GET /api/user/permissions?userId=... — returns a user's stored grants and
 * denials plus the concrete baseline and effective sets. Requires
 * `permissions:read`.
 */
export async function GET(request: NextRequest) {
  const { response } = await requireAuthedPermission('permissions:read');
  if (response) return response;

  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json(
      { status: 'fail', error: 'userId is required' },
      { status: 400 },
    );
  }

  const user = await db.user.findFirst({ where: { id: userId } });
  if (!user) {
    return NextResponse.json(
      { status: 'fail', error: 'User not found' },
      { status: 404 },
    );
  }

  return NextResponse.json({ status: 'success', data: summarize(user) });
}

/**
 * PUT /api/user/permissions — sets the policies in effect for a user.
 *
 * Body: { userId: string, effective: string[] } where `effective` is the
 * desired concrete set of permissions that should be ON. The server diffs this
 * against the user's baseline and stores the result as:
 *   - permissions       (grants):  ON but not in the baseline
 *   - deniedPermissions (denials): in the baseline but turned OFF
 *
 * Adding grants requires `permissions:grant`; removing baseline permissions
 * requires `permissions:revoke`. You cannot edit your own policies, and a
 * non-admin manager cannot grant or deny a permission they do not themselves
 * hold (no privilege escalation).
 */
export async function PUT(request: NextRequest) {
  const { user: actor, response } =
    await requireAuthedPermission('permissions:read');
  if (response) return response;

  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    effective?: unknown;
  };

  const { userId } = body;
  if (!userId) {
    return NextResponse.json(
      { status: 'fail', error: 'userId is required' },
      { status: 400 },
    );
  }

  if (actor && actor.id === userId) {
    return NextResponse.json(
      {
        status: 'fail',
        error: 'You cannot change your own access policies.',
      },
      { status: 403 },
    );
  }

  if (!Array.isArray(body.effective)) {
    return NextResponse.json(
      { status: 'fail', error: 'effective must be an array of permissions' },
      { status: 400 },
    );
  }

  const invalid = body.effective.filter((p) => !isValidPermission(p));
  if (invalid.length > 0) {
    return NextResponse.json(
      { status: 'fail', error: `Unknown permission(s): ${invalid.join(', ')}` },
      { status: 400 },
    );
  }

  const target = await db.user.findFirst({ where: { id: userId } });
  if (!target) {
    return NextResponse.json(
      { status: 'fail', error: 'User not found' },
      { status: 404 },
    );
  }

  const desired = new Set(body.effective as string[]);
  const baseline = getBaselinePermissions(target);
  const baselineSet = new Set(baseline);

  // Diff the desired set against the baseline.
  const grants = Array.from(desired)
    .filter((p) => !baselineSet.has(p))
    .sort();
  const denied = baseline.filter((p) => !desired.has(p)).sort();

  // Grant/revoke each require the matching management permission.
  if (actor && grants.length > 0 && !isAllowed(actor, 'permissions:grant')) {
    return permissionDeniedResponse('permissions:grant');
  }
  if (actor && denied.length > 0 && !isAllowed(actor, 'permissions:revoke')) {
    return permissionDeniedResponse('permissions:revoke');
  }

  // No privilege escalation: a non-admin manager may only grant or deny
  // permissions they themselves currently hold.
  if (actor && !actor.isAdmin) {
    const escalated = [...grants, ...denied].filter(
      (p) => !isAllowed(actor, p),
    );
    if (escalated.length > 0) {
      return NextResponse.json(
        {
          status: 'fail',
          error: `You cannot manage permission(s) you do not hold: ${escalated.join(', ')}`,
        },
        { status: 403 },
      );
    }
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      permissions: grants,
      deniedPermissions: denied,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ status: 'success', data: summarize(updated) });
}
