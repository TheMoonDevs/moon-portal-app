import { MOBILE_CLIENT_ID } from '@/lib/mobile/auth';
import { db } from '@/lib/mongodb/db-client';
import type { ApiToken } from '@/models/connections';

import type { PushMessage } from './server';

/*
 * Notifications to the mobile app, through Expo's push service (which passes
 * them on to Apple and Google). Each signed-in phone keeps its Expo push
 * token on its mobile token (lib/mobile/auth.ts). `EXPO_ACCESS_TOKEN` is
 * needed only when "enhanced push security" is turned on for the Expo project.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
/** Expo takes at most 100 notifications per request. */
const BATCH = 100;

type ExpoTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message?: string; details?: { error?: string } };

/** The Expo push tokens of every signed-in phone of these users. */
async function expoTokensFor(userIds: string[]) {
  if (!userIds.length) return [];
  const tokens: ApiToken[] = await db.apiToken.findMany({
    where: {
      userId: { in: userIds },
      clientId: MOBILE_CLIENT_ID,
      revokedAt: null,
    },
  });
  const now = new Date();
  return Array.from(
    new Set(
      tokens
        .filter((t) => !t.expiresAt || new Date(t.expiresAt) > now)
        .map((t) => t.expoPushToken)
        .filter((t): t is string => typeof t === 'string' && t !== ''),
    ),
  );
}

/** Everyone with a signed-in phone that takes notifications. */
export async function usersWithPhones(): Promise<string[]> {
  const tokens: ApiToken[] = await db.apiToken.findMany({
    where: { clientId: MOBILE_CLIENT_ID, revokedAt: null },
  });
  const now = new Date();
  return Array.from(
    new Set(
      tokens
        .filter(
          (t) =>
            (!t.expiresAt || new Date(t.expiresAt) > now) &&
            typeof t.expoPushToken === 'string' &&
            t.expoPushToken !== '',
        )
        .map((t) => t.userId),
    ),
  );
}

/** Phones that were uninstalled or turned notifications off. */
async function forgetExpoTokens(pushTokens: string[]) {
  if (!pushTokens.length) return;
  const records: ApiToken[] = await db.apiToken.findMany({
    where: { clientId: MOBILE_CLIENT_ID, expoPushToken: { in: pushTokens } },
  });
  const now = new Date().toISOString();
  await Promise.all(
    records.map((t) =>
      db.apiToken.update({
        where: { id: t.id },
        data: { expoPushToken: null, updatedAt: now },
      }),
    ),
  );
}

/** Send one notification to every phone of the given users. */
export async function sendExpoPushToUsers(
  userIds: string[],
  message: PushMessage,
) {
  const tokens = await expoTokensFor(Array.from(new Set(userIds)));
  let sent = 0;
  let failed = 0;
  const gone: string[] = [];

  for (let i = 0; i < tokens.length; i += BATCH) {
    const batch = tokens.slice(i, i + BATCH);
    const messages = batch.map((to) => ({
      to,
      title: message.title,
      body: message.body,
      sound: 'default',
      priority: 'high',
      ttl: 60 * 60 * 24,
      // The app opens `url` when the notification is tapped.
      data: {
        url: message.url ?? null,
        tag: message.tag ?? null,
        chat: message.chat ?? null,
      },
      ...(message.tag && { collapseId: message.tag }),
      // Android channels and the iPhone's "Mark as read" button live in the
      // app (mobile/src/lib/push.ts).
      channelId: message.chat ? 'messages' : 'default',
      ...(message.chat && { categoryId: 'chat' }),
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          ...(process.env.EXPO_ACCESS_TOKEN && {
            authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}`,
          }),
        },
        body: JSON.stringify(messages),
      });
      if (!res.ok) {
        failed += batch.length;
        console.error('Expo push failed:', res.status, await res.text());
        continue;
      }
      const tickets: ExpoTicket[] = (await res.json())?.data ?? [];
      tickets.forEach((ticket, index) => {
        if (ticket.status === 'ok') {
          sent++;
          return;
        }
        failed++;
        if (ticket.details?.error === 'DeviceNotRegistered')
          gone.push(batch[index]);
        else console.error('Expo push ticket error:', ticket);
      });
    } catch (error) {
      failed += batch.length;
      console.error('Expo push failed:', error);
    }
  }

  await forgetExpoTokens(gone);
  return { sent, failed };
}
