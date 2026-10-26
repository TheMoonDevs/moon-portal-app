import { NextResponse } from 'next/server';

import { enforcePermission, getSessionUser } from '@/lib/permissions/server';
import { sendPushToUsers } from '@/lib/push/server';

/** Send a test notification to the signed-in user's devices. */
export async function POST() {
  const denied = await enforcePermission('notifications:read');
  if (denied) return denied;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const result = await sendPushToUsers([user.id], {
    title: 'Notifications are on',
    body: 'This is how Portal will reach you on this device.',
    url: '/settings#notifications',
    tag: 'push-test',
  });
  return NextResponse.json(result);
}
