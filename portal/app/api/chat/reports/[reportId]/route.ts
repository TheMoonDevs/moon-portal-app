import { chatRoute, readJson } from '@/lib/chat/api';
import { ChatError, resolveReport } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

type Params = { params: { reportId: string } };

/**
 * A portal admin answers a report: `{ action: 'remove' }` deletes the message
 * for everyone, `{ action: 'dismiss' }` leaves it.
 */
export async function POST(request: Request, { params }: Params) {
  const body = await readJson(request);
  return chatRoute(async (user) => {
    if (!user.isAdmin && !user.isSuperAdmin)
      throw new ChatError(403, 'Only portal admins can answer reports.');
    return resolveReport(user.id, params.reportId, body.action);
  });
}
