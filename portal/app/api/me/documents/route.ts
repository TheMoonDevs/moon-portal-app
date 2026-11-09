import { myDocuments } from '@/lib/agreements/mine';
import { agreementFailure } from '@/lib/agreements/server';
import { getSessionUser } from '@/lib/permissions/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * The signed-in person's documents: what is waiting for their signature (or
 * their approval for the company), everything they signed, and their saved
 * signature.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail(401, 'Authentication required.');
  try {
    return ok(await myDocuments(user));
  } catch (e) {
    return agreementFailure(e);
  }
}
