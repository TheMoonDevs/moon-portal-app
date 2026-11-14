import { chatRoute } from '@/lib/chat/api';
import { unblockPerson } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

type Params = { params: { userId: string } };

/** Unblock someone: their messages come back. */
export async function DELETE(_request: Request, { params }: Params) {
  return chatRoute(async (user) => ({
    people: await unblockPerson(user.id, params.userId),
  }));
}
