import { chatRoute, readJson } from '@/lib/chat/api';
import { reportMessage } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

type Params = { params: { messageId: string } };

/**
 * Report someone else's message to the portal's admins: `{ reason, block }`.
 * It's hidden for the user at once; `block: true` also blocks its sender.
 */
export async function POST(request: Request, { params }: Params) {
  const body = await readJson(request);
  return chatRoute((user) =>
    reportMessage(user.id, params.messageId, {
      reason: body.reason,
      block: body.block,
    }),
  );
}
