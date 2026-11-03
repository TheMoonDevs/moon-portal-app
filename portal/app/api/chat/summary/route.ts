import { chatRoute } from '@/lib/chat/api';
import { markDelivered, touchLastSeen, unreadSummary } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

/**
 * Unread messages for the nav badge. The portal calls it when it opens, so
 * it also marks waiting messages delivered and updates "last seen".
 */
export async function GET() {
  return chatRoute(async (user) => {
    await Promise.all([markDelivered(user.id), touchLastSeen(user.id)]);
    return unreadSummary(user.id);
  });
}
