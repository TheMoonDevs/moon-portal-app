import { chatRoute, readJson } from '@/lib/chat/api';
import {
  listConversations,
  markDelivered,
  openDirectConversation,
  touchLastSeen,
} from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

/**
 * The signed-in user's chats, newest first. Opening the list also marks
 * every message waiting for them as delivered.
 */
export async function GET() {
  return chatRoute(async (user) => {
    await Promise.all([markDelivered(user.id), touchLastSeen(user.id)]);
    return { conversations: await listConversations(user.id) };
  });
}

/** Open (or start) the chat with `userId`. */
export async function POST(request: Request) {
  const body = await readJson(request);
  return chatRoute(async (user) => ({
    conversation: await openDirectConversation(
      user.id,
      String(body.userId ?? ''),
    ),
  }));
}
