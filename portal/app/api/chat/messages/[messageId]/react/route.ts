import { chatRoute, readJson } from '@/lib/chat/api';
import { reactToMessage } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

/** Set the user's reaction (`emoji`), or remove it with an empty one. */
export async function POST(
  request: Request,
  { params }: { params: { messageId: string } },
) {
  const body = await readJson(request);
  return chatRoute(async (user) => ({
    message: await reactToMessage(
      user.id,
      params.messageId,
      body.emoji ?? null,
    ),
  }));
}
