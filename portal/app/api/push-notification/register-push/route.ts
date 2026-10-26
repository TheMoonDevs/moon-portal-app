import { NextResponse } from 'next/server';

import { enforcePermission, getSessionUser } from '@/lib/permissions/server';
import {
  removePushSubscriptions,
  savePushSubscription,
} from '@/lib/push/server';

const isSubscription = (value: any) =>
  typeof value?.endpoint === 'string' &&
  typeof value?.keys?.p256dh === 'string' &&
  typeof value?.keys?.auth === 'string';

/** Save this browser's push subscription for the signed-in user. */
export async function POST(request: Request) {
  const denied = await enforcePermission('notifications:read');
  if (denied) return denied;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { newSubscription, oldEndpoint } = await request.json();
  if (!isSubscription(newSubscription)) {
    return NextResponse.json(
      { error: 'Missing push subscription in body' },
      { status: 400 },
    );
  }

  await savePushSubscription(
    user.id,
    {
      endpoint: newSubscription.endpoint,
      expirationTime: newSubscription.expirationTime ?? null,
      keys: newSubscription.keys,
    },
    typeof oldEndpoint === 'string' ? oldEndpoint : undefined,
  );
  return NextResponse.json({ message: 'Push Subscription Saved!' });
}

/** Forget this browser's push subscription for the signed-in user. */
export async function DELETE(request: Request) {
  const denied = await enforcePermission('notifications:read');
  if (denied) return denied;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { subscriptionToDelete } = await request.json();
  if (typeof subscriptionToDelete?.endpoint !== 'string') {
    return NextResponse.json(
      { error: 'Missing push subscription in body' },
      { status: 400 },
    );
  }

  await removePushSubscriptions(user.id, [subscriptionToDelete.endpoint]);
  return NextResponse.json({ message: 'Push Subscription Deleted!' });
}
