import webpush, { type PushSubscription, WebPushError } from 'web-push';

import { db } from '@/lib/mongodb/db-client';

/** What the service worker (app/sw.ts) shows. */
export type PushMessage = {
  title: string;
  body?: string;
  /** Where clicking the notification goes, e.g. "/user/worklogs". */
  url?: string;
  /** Notifications with the same tag replace each other. */
  tag?: string;
  /** Buttons under the notification (Chrome, Edge, Android; not Safari). */
  actions?: { action: string; title: string }[];
  /** Where each button goes, by its `action`. */
  actionUrls?: Record<string, string>;
};

type StoredSubscription = {
  endpoint: string;
  expirationTime?: string | number | Date | null;
  keys: { p256dh: string; auth: string };
};

let vapidReady = false;
const ensureVapid = () => {
  if (vapidReady) return true;
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.warn('Web push is not configured: VAPID keys are missing.');
    return false;
  }
  webpush.setVapidDetails(
    `mailto:${process.env.WEB_PUSH_EMAIL || 'support@themoondevs.com'}`,
    publicKey,
    privateKey,
  );
  vapidReady = true;
  return true;
};

const toWebPush = (sub: StoredSubscription): PushSubscription => ({
  endpoint: sub.endpoint,
  keys: sub.keys,
});

/** Save a browser's subscription for a user, replacing any with the same endpoint. */
export async function savePushSubscription(
  userId: string,
  subscription: StoredSubscription,
  replacesEndpoint?: string,
) {
  const existing = await db.subscription.findUnique({ where: { userId } });
  const kept = ((existing?.subscriptions ?? []) as StoredSubscription[]).filter(
    (s) =>
      s.endpoint !== subscription.endpoint && s.endpoint !== replacesEndpoint,
  );
  await db.subscription.upsert({
    where: { userId },
    update: { subscriptions: [...kept, subscription] },
    create: { userId, subscriptions: [subscription] },
  });
}

/** Forget subscriptions by endpoint (the user turned push off, or it expired). */
export async function removePushSubscriptions(
  userId: string,
  endpoints: string[],
) {
  if (endpoints.length === 0) return;
  const existing = await db.subscription.findUnique({ where: { userId } });
  if (!existing) return;
  await db.subscription.update({
    where: { userId },
    data: {
      subscriptions: (existing.subscriptions as StoredSubscription[]).filter(
        (s) => !endpoints.includes(s.endpoint),
      ),
    },
  });
}

/**
 * Send a push notification to every device of the given users. Subscriptions
 * the push service reports as gone (404/410) are removed.
 */
export async function sendPushToUsers(userIds: string[], message: PushMessage) {
  if (!ensureVapid()) return { sent: 0, failed: 0 };

  const docs = await Promise.all(
    Array.from(new Set(userIds)).map((userId) =>
      db.subscription.findUnique({ where: { userId } }),
    ),
  );

  let sent = 0;
  let failed = 0;
  const payload = JSON.stringify(message);

  await Promise.all(
    docs.map(async (doc) => {
      if (!doc) return;
      const expired: string[] = [];
      await Promise.all(
        (doc.subscriptions as StoredSubscription[]).map(async (sub) => {
          try {
            await webpush.sendNotification(toWebPush(sub), payload, {
              TTL: 60 * 60 * 24,
              urgency: 'normal',
            });
            sent++;
          } catch (error) {
            failed++;
            if (
              error instanceof WebPushError &&
              (error.statusCode === 404 || error.statusCode === 410)
            ) {
              expired.push(sub.endpoint);
            } else {
              console.error('Push notification failed:', error);
            }
          }
        }),
      );
      await removePushSubscriptions(doc.userId, expired);
    }),
  );

  return { sent, failed };
}
