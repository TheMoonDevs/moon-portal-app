import { agreementFailure } from '@/lib/agreements/server';
import { requireAgreements } from '@/lib/agreements/server';
import { inspectSource, presignSource } from '@/lib/agreements/source';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * A PDF to sign as it is. `{ companyId, name, size, mime }` gives a signed
 * link to upload it to; `{ companyId, key, name, check: true }` then reads
 * it back: its pages, size and fingerprint, or why it can't be signed.
 */
export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');
  const body = await request.json().catch(() => ({}));
  try {
    const companyId = typeof body.companyId === 'string' ? body.companyId : '';
    if (body.check === true) {
      await requireAgreements(actor, companyId, 'agreements:create');
      return ok({
        document: await inspectSource(companyId, body.key, body.name),
      });
    }
    return ok(await presignSource(actor, companyId, body));
  } catch (e) {
    return agreementFailure(e);
  }
}
