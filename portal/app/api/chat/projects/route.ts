import { chatRoute, readJson } from '@/lib/chat/api';
import { openProjectGroup } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

/**
 * Open the project's group, starting it the first time: `{ projectId }`.
 * Only people on the project's team are in it.
 */
export async function POST(request: Request) {
  const body = await readJson(request);
  return chatRoute(async (user) => ({
    conversation: await openProjectGroup(user.id, String(body.projectId ?? '')),
  }));
}
