import type { NextRequest } from 'next/server';

import {
  buildReviewQueue,
  DEFAULT_UNSCREENED_DAYS,
  MAX_UNSCREENED_DAYS,
} from '@/lib/hiring/queue';
import { fail, ok, requireCompanyPermission } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * Everything waiting on the hiring team in one company (`?companyId=`):
 * tasks to review, people unscreened after `?days=` (3 by default), tasks
 * past due and emails that bounced.
 */
export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId');
  const { response, user } = await requireCompanyPermission(
    companyId,
    'hiring:read',
  );
  if (response || !user || !companyId)
    return response ?? fail(401, 'Authentication required.');

  const raw = Number(request.nextUrl.searchParams.get('days'));
  const days =
    Number.isFinite(raw) && raw >= 1
      ? Math.min(Math.round(raw), MAX_UNSCREENED_DAYS)
      : DEFAULT_UNSCREENED_DAYS;
  return ok({ ...(await buildReviewQueue(companyId, days)), days });
}
