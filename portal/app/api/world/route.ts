import { fail, ok, requireUser } from '@/lib/workspace/server';
import { buildWorld } from '@/lib/world/server';

export const dynamic = 'force-dynamic';

/** Towns, buildings, people and today's bots for the viewer's companies. */
export async function GET() {
  const { response, user } = await requireUser();
  if (response || !user) return response ?? fail(401, 'Sign in first.');
  return ok(await buildWorld(user));
}
