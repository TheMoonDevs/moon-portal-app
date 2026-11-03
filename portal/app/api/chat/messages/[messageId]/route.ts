import type { NextRequest } from 'next/server';

import { chatRoute, readJson } from '@/lib/chat/api';
import { deleteMessage, editMessage } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

type Params = { params: { messageId: string } };

/** Edit a message's text, within 15 minutes of sending it. */
export async function PATCH(request: Request, { params }: Params) {
  const body = await readJson(request);
  return chatRoute(async (user) => ({
    message: await editMessage(user.id, params.messageId, body.text),
  }));
}

/** `?for=me` hides it for the user; `?for=everyone` deletes it for both. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const scope =
    request.nextUrl.searchParams.get('for') === 'everyone' ? 'everyone' : 'me';
  return chatRoute(async (user) => ({
    message: await deleteMessage(user.id, params.messageId, scope),
  }));
}
