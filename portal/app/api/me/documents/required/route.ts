import { blockingFor } from '@/lib/agreements/mine';
import { agreementFailure } from '@/lib/agreements/server';
import { getSessionUser } from '@/lib/permissions/server';
import { ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * Documents the signed-in person has to sign before using the Portal: ones
 * sent as required for their role, or from a rollout that asks for it.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return ok({ documents: [] });
  try {
    return ok({ documents: await blockingFor(user) });
  } catch (e) {
    return agreementFailure(e);
  }
}
