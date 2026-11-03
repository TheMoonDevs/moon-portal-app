import { chatRoute, readJson } from '@/lib/chat/api';
import { getConversation, updateConversationPrefs } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

type Params = { params: { conversationId: string } };

export async function GET(_request: Request, { params }: Params) {
  return chatRoute(async (user) => ({
    conversation: await getConversation(user.id, params.conversationId),
  }));
}

/** Mute, pin or archive the chat, for the signed-in user only. */
export async function PATCH(request: Request, { params }: Params) {
  const body = await readJson(request);
  return chatRoute(async (user) => ({
    conversation: await updateConversationPrefs(
      user.id,
      params.conversationId,
      {
        muted: body.muted,
        pinned: body.pinned,
        archived: body.archived,
      },
    ),
  }));
}
