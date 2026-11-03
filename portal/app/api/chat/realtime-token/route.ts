import type { NextRequest } from 'next/server';

import { chatRoute } from '@/lib/chat/api';
import { createTokenRequest } from '@/lib/chat/realtime';
import { requireConversation } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

/**
 * An Ably token request for the user's browser (lib/chat/realtime.ts).
 * `?chat=<id>` adds the open chat's typing and the partner's online status.
 * `enabled: false` when Ably isn't set up; browsers then poll instead.
 */
export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.searchParams.get('chat');
  return chatRoute(async (user) => {
    let chat: { conversationId: string; partnerId: string } | null = null;
    if (chatId) {
      try {
        const { partnerId } = await requireConversation(user.id, chatId);
        chat = { conversationId: chatId, partnerId };
      } catch {
        chat = null;
      }
    }
    const tokenRequest = await createTokenRequest(user.id, chat);
    return { enabled: !!tokenRequest, tokenRequest };
  });
}
