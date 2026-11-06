import { chatRoute, readJson } from '@/lib/chat/api';
import { createGroup } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

/** Start a group: `{ name, memberIds, avatar? }`. */
export async function POST(request: Request) {
  const body = await readJson(request);
  return chatRoute(async (user) => ({
    conversation: await createGroup(user.id, {
      name: body.name,
      memberIds: body.memberIds,
      avatar: body.avatar,
    }),
  }));
}
