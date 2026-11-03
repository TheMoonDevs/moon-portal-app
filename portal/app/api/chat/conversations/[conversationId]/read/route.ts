import { chatRoute } from '@/lib/chat/api';
import { markRead } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

/** The signed-in user has seen the chat: blue ticks for the sender. */
export async function POST(
  _request: Request,
  { params }: { params: { conversationId: string } },
) {
  return chatRoute(async (user) => {
    await markRead(user.id, params.conversationId);
    return { ok: true };
  });
}
