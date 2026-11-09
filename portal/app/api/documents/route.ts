import { agreementFailure } from '@/lib/agreements/server';
import { parseVaultFilters, searchVault } from '@/lib/agreements/vault';
import { originOf } from '@/lib/mcp/tokens';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * The document vault of a company: `?companyId=&q=&person=&type=&status=
 * &from=&to=&project=`. Confidential documents only with confidential:read.
 */
export async function GET(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const params = new URL(request.url).searchParams;
  const companyId = params.get('companyId');
  if (!companyId) return fail(400, 'companyId is required.');
  try {
    const documents = await searchVault(
      actor,
      companyId,
      parseVaultFilters(params),
      originOf(request),
    );
    return ok({ documents });
  } catch (e) {
    return agreementFailure(e);
  }
}
