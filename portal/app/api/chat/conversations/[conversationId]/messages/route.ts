import type { NextRequest } from 'next/server';

import { chatRoute, readJson } from '@/lib/chat/api';
import { listMessages, sendMessage } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

type Params = { params: { conversationId: string } };

/**
 * Messages, newest first: `?before=<ISO time>&limit=40` for older ones,
 * `?media=1` for only photos, videos and files.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const search = request.nextUrl.searchParams;
  return chatRoute((user) =>
    listMessages(user.id, params.conversationId, {
      before: search.get('before'),
      limit: Number(search.get('limit')) || 40,
      mediaOnly: search.get('media') === '1',
    }),
  );
}

/** Send a message: text, a file already uploaded to Spaces, or a forward. */
export async function POST(request: Request, { params }: Params) {
  const body = await readJson(request);
  return chatRoute(async (user) => ({
    message: await sendMessage(user.id, params.conversationId, {
      clientId: body.clientId,
      text: body.text,
      attachment: body.attachment ?? null,
      replyToId: body.replyToId ?? null,
      forwardOfId: body.forwardOfId ?? null,
      mentions: body.mentions ?? null,
    }),
  }));
}
