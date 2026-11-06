import * as Ably from 'ably';

import type { ChatEvent } from '@/models/chat';

/*
 * Live updates for messages, through Ably (https://ably.com).
 *
 * Vercel functions cannot keep WebSocket connections open, so browsers
 * connect to Ably instead and the server publishes to it after each change.
 * Channels:
 *   chat:inbox:<userId>   events for one person (new messages, ticks, edits).
 *                         Only the server publishes here; the person subscribes.
 *   chat:dm:<chatId>      typing, between the people in a chat (or group),
 *                         while it is open.
 *   chat:online:<userId>  presence: the person is in the portal right now.
 *
 * Without ABLY_API_KEY the portal still works: browsers fall back to asking
 * the server every few seconds while a chat is open.
 */

export const INBOX_EVENT = 'chat';

export const inboxChannel = (userId: string) => `chat:inbox:${userId}`;
export const dmChannel = (conversationId: string) =>
  `chat:dm:${conversationId}`;
export const onlineChannel = (userId: string) => `chat:online:${userId}`;

let rest: Ably.Rest | null = null;

export const realtimeEnabled = () => !!process.env.ABLY_API_KEY;

const client = () => {
  if (!process.env.ABLY_API_KEY) return null;
  rest ??= new Ably.Rest({ key: process.env.ABLY_API_KEY });
  return rest;
};

/** Send an event to each person's inbox. Failures are logged, never thrown. */
export async function publishToUsers(userIds: string[], event: ChatEvent) {
  const ably = client();
  if (!ably) return;
  await Promise.all(
    Array.from(new Set(userIds)).map((userId) =>
      ably.channels
        .get(inboxChannel(userId))
        .publish(INBOX_EVENT, event)
        .catch((error: unknown) =>
          console.error('[chat] Ably publish failed:', error),
        ),
    ),
  );
}

/**
 * A token request for one browser: it may read its own inbox, be present
 * as online, and, for the chat that is open (`chat`), see whether the other
 * person is online and send and receive typing.
 */
export async function createTokenRequest(
  userId: string,
  chat?: { conversationId: string; partnerId: string | null } | null,
) {
  const ably = client();
  if (!ably) return null;
  const capability: Record<string, Ably.CapabilityOp[]> = {
    [inboxChannel(userId)]: ['subscribe'],
    [onlineChannel(userId)]: ['presence', 'subscribe'],
  };
  if (chat) {
    capability[dmChannel(chat.conversationId)] = ['publish', 'subscribe'];
    if (chat.partnerId)
      capability[onlineChannel(chat.partnerId)] = ['subscribe'];
  }
  return ably.auth.createTokenRequest({
    clientId: userId,
    capability: JSON.stringify(capability),
    ttl: 60 * 60 * 1000,
  });
}
