import {
  clearExpoPushToken,
  isExpoPushToken,
  saveExpoPushToken,
} from '@/lib/mobile/auth';
import { requireMobileToken } from '@/lib/mobile/server';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/** Send this phone's notifications to its Expo push token. */
export async function POST(request: Request) {
  const { response, found } = await requireMobileToken(request);
  if (response || !found) return response;
  const body = await request.json().catch(() => ({}));
  if (!isExpoPushToken(body.expoPushToken))
    return fail(400, 'expoPushToken must be an Expo push token.');
  await saveExpoPushToken(found.token, body.expoPushToken);
  return ok({ saved: true });
}

/** Stop notifications to this phone. */
export async function DELETE(request: Request) {
  const { response, found } = await requireMobileToken(request);
  if (response || !found) return response;
  await clearExpoPushToken(found.token);
  return ok({ cleared: true });
}
