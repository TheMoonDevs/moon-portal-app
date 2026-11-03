import type { NextRequest } from 'next/server';

import { chatRoute } from '@/lib/chat/api';
import { searchMessages } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';

/** Messages matching `?q=`, across chats or in one (`?chat=<id>`). */
export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  return chatRoute(async (user) => ({
    messages: await searchMessages(
      user.id,
      search.get('q') ?? '',
      search.get('chat'),
    ),
  }));
}
