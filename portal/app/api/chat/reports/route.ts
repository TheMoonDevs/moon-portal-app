import type { NextRequest } from 'next/server';

import { chatRoute } from '@/lib/chat/api';
import { ChatError, listReports } from '@/lib/chat/server';
import type { ChatReportStatus } from '@/models/chat';

export const dynamic = 'force-dynamic';

const STATUSES = ['open', 'removed', 'dismissed', 'all'] as const;

/** Reported messages, for portal admins: `?status=open|removed|dismissed|all`. */
export async function GET(request: NextRequest) {
  const asked = request.nextUrl.searchParams.get('status') ?? 'open';
  const status = (STATUSES as readonly string[]).includes(asked)
    ? (asked as ChatReportStatus | 'all')
    : 'open';
  return chatRoute(async (user) => {
    if (!user.isAdmin && !user.isSuperAdmin)
      throw new ChatError(403, 'Only portal admins can see reports.');
    return { reports: await listReports(status) };
  });
}
