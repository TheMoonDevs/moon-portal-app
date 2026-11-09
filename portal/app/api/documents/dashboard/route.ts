import { agreementsDashboard } from '@/lib/agreements/dashboard';
import { agreementFailure } from '@/lib/agreements/server';
import { originOf } from '@/lib/mcp/tokens';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/** The agreements dashboard of a company: `?companyId`. */
export async function GET(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const companyId = new URL(request.url).searchParams.get('companyId');
  if (!companyId) return fail(400, 'companyId is required.');
  try {
    return ok({
      dashboard: await agreementsDashboard(actor, companyId, originOf(request)),
    });
  } catch (e) {
    return agreementFailure(e);
  }
}
