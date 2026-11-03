import { chatRoute } from '@/lib/chat/api';
import { clearConversation } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

/** "Clear chat": hide every message so far, for the signed-in user only. */
export async function POST(
  _request: Request,
  { params }: { params: { conversationId: string } },
) {
  return chatRoute(async (user) => {
    await clearConversation(user.id, params.conversationId);
    return { ok: true };
  });
}
