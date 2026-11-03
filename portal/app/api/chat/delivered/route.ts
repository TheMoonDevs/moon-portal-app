import { chatRoute, readJson } from '@/lib/chat/api';
import { markDelivered } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

/** The user's browser received new messages: two grey ticks for senders. */
export async function POST(request: Request) {
  const body = await readJson(request);
  return chatRoute(async (user) => ({
    delivered: await markDelivered(user.id, {
      conversationId: body.conversationId ? String(body.conversationId) : null,
    }),
  }));
}
