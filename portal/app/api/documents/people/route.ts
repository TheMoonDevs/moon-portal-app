import { agreementFailure } from '@/lib/agreements/server';
import { personFile, vaultPeople } from '@/lib/agreements/vault';
import { originOf } from '@/lib/mcp/tokens';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * `?companyId=` lists the company's people with their document counts;
 * `&userId=` opens one person's file: their documents and what's missing.
 */
export async function GET(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const params = new URL(request.url).searchParams;
  const companyId = params.get('companyId');
  if (!companyId) return fail(400, 'companyId is required.');
  const userId = params.get('userId');
  try {
    const origin = originOf(request);
    if (userId)
      return ok({ file: await personFile(actor, companyId, userId, origin) });
    return ok({ people: await vaultPeople(actor, companyId, origin) });
  } catch (e) {
    return agreementFailure(e);
  }
}
