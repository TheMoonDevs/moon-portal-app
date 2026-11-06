import { chatRoute, readJson } from '@/lib/chat/api';
import {
  addGroupMembers,
  makeGroupAdmin,
  removeGroupMember,
} from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

type Params = { params: { conversationId: string } };

/** Add people: `{ userIds }` (group admins). */
export async function POST(request: Request, { params }: Params) {
  const body = await readJson(request);
  return chatRoute(async (user) => ({
    conversation: await addGroupMembers(
      user.id,
      params.conversationId,
      body.userIds,
    ),
  }));
}

/** Make someone an admin: `{ userId, admin: true }` (group admins). */
export async function PATCH(request: Request, { params }: Params) {
  const body = await readJson(request);
  return chatRoute(async (user) => ({
    conversation: await makeGroupAdmin(
      user.id,
      params.conversationId,
      String(body.userId ?? ''),
    ),
  }));
}

/**
 * Take someone out (`?user=<id>`, group admins), or leave the group
 * (`?user=` the signed-in user).
 */
export async function DELETE(request: Request, { params }: Params) {
  const target = new URL(request.url).searchParams.get('user') ?? '';
  return chatRoute(async (user) => ({
    conversation: await removeGroupMember(
      user.id,
      params.conversationId,
      target || user.id,
    ),
  }));
}
