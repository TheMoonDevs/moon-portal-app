import { chatRoute } from '@/lib/chat/api';
import { touchLastSeen } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

/** The user is leaving or hiding the portal: keeps "last seen" accurate. */
export async function POST() {
  return chatRoute(async (user) => {
    await touchLastSeen(user.id);
    return { ok: true };
  });
}
