import { NextResponse } from 'next/server';

import {
  ALL_PERMISSIONS,
  PERMISSION_RESOURCES,
  WILDCARD_PERMISSION,
} from '@/lib/permissions';
import { requireAuthedPermission } from '@/lib/permissions/server';

export const dynamic = 'force-dynamic';

/**
 * Returns the catalog of assignable permissions so the admin UI can render a
 * policy picker. Requires the policy-read permission (admins have it).
 */
export async function GET() {
  const { response } = await requireAuthedPermission('permissions:read');
  if (response) return response;

  return NextResponse.json({
    status: 'success',
    data: {
      wildcard: WILDCARD_PERMISSION,
      resources: PERMISSION_RESOURCES,
      allPermissions: ALL_PERMISSIONS,
    },
  });
}
