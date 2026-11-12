import { revokeMobileToken } from '@/lib/mobile/auth';
import { requireMobileToken } from '@/lib/mobile/server';
import { ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/** Signs this phone out: its token and notifications stop. */
export async function POST(request: Request) {
  const { response, found } = await requireMobileToken(request);
  if (response || !found) return response;
  await revokeMobileToken(found.token);
  return ok({ signedOut: true });
}
