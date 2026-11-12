import { renewMobileToken } from '@/lib/mobile/auth';
import { requireMobileToken } from '@/lib/mobile/server';
import { ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * Swaps the app's token for a fresh one that lasts another 180 days. The app
 * calls this now and then while in use; the old token stops working at once.
 */
export async function POST(request: Request) {
  const { response, found } = await requireMobileToken(request);
  if (response || !found) return response;
  return ok(await renewMobileToken(found.token));
}
