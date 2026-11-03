import { chatRoute, readJson } from '@/lib/chat/api';
import { markDelivered, markRead } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

/**
 * Called by the service worker (app/sw.ts) when a message notification
 * arrives (delivered) or its "Mark as read" button is pressed. The service
 * worker can't send the portal API key, so this route is exempt from it
 * (middlewares/apiKey.ts); it still needs the signed-in session and can
 * only mark the user's own messages.
 */
export async function POST(request: Request) {
  const body = await readJson(request);
  return chatRoute(async (user) => {
    const conversationId = String(body.conversationId ?? '');
    if (!conversationId) return { ok: false };
    if (body.read) await markRead(user.id, conversationId);
    else await markDelivered(user.id, { conversationId });
    return { ok: true };
  });
}
