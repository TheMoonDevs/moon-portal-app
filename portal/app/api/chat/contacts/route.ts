import { chatRoute } from '@/lib/chat/api';
import { listContacts } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

/** People the signed-in user can message: everyone in a company with them. */
export async function GET() {
  return chatRoute(async (user) => ({ contacts: await listContacts(user.id) }));
}
