import { chatRoute, readJson } from '@/lib/chat/api';
import { updateGroup } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

type Params = { params: { conversationId: string } };

/** Rename a group or change its photo (group admins). */
export async function PATCH(request: Request, { params }: Params) {
  const body = await readJson(request);
  return chatRoute(async (user) => ({
    conversation: await updateGroup(user.id, params.conversationId, {
      name: body.name,
      avatar: body.avatar,
    }),
  }));
}
