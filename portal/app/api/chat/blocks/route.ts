import { chatRoute, readJson } from '@/lib/chat/api';
import { blockPerson, listBlocked } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

/** The people the user has blocked, newest first. */
export async function GET() {
  return chatRoute(async (user) => ({ people: await listBlocked(user.id) }));
}

/** Block someone (`{ userId }`): their messages leave the user's chats. */
export async function POST(request: Request) {
  const body = await readJson(request);
  return chatRoute(async (user) => ({
    people: await blockPerson(user.id, body.userId),
  }));
}
