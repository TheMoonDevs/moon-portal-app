import { getEffectivePermissions } from '@/lib/permissions/defaults';
import {
  fail,
  getWorkspaceForUser,
  ok,
  requireUser,
} from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * The signed-in user's companies with the permissions they hold in each.
 * The UI uses this to decide what to show; the API still checks every call.
 */
export async function GET() {
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const companies = await getWorkspaceForUser(user);
  return ok({
    isSuperAdmin: !!user.isSuperAdmin,
    isAdmin: !!user.isAdmin,
    /** Portal-wide permissions (base, roles and grants, minus denials). */
    permissions: getEffectivePermissions(user),
    companies,
  });
}
