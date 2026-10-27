import { NextResponse } from 'next/server';

import { enforcePermission, getSessionUser } from '@/lib/permissions/server';
import { setPointStatus } from '@/lib/worklogs/points';
import type { PointStatus } from '@/lib/worklogs/timeline';
import { POINT_STATUSES } from '@/lib/worklogs/timeline';

export const dynamic = 'force-dynamic';

const fail = (status: number, error: string) =>
  NextResponse.json({ status: 'fail', error }, { status });

/**
 * One click on a work point's status: `{ key, status }` with the day as
 * `worklogId` (the worklog screen) or `date` (the user page). The line's
 * emoji and its timeline both change; returns the saved worklog.
 */
export async function PATCH(request: Request) {
  const denied = await enforcePermission('worklogs:edit');
  if (denied) return denied;
  const user = await getSessionUser();
  if (!user) return fail(401, 'Authentication required.');

  const body = await request.json().catch(() => ({}));
  const { key, status, worklogId, date } = body ?? {};
  if (typeof key !== 'string' || !key) return fail(400, 'key is required.');
  if (!(status in POINT_STATUSES)) return fail(400, 'Unknown status.');
  const hasId = typeof worklogId === 'string' && worklogId.length > 2;
  const hasDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
  if (!hasId && !hasDate) return fail(400, 'worklogId or date is required.');

  const result = await setPointStatus(
    user.id,
    hasId ? { worklogId } : { date },
    key,
    status as PointStatus,
  );
  if ('error' in result) return fail(result.status ?? 400, result.error!);
  return NextResponse.json({
    status: 'success',
    data: { workLogs: result.worklog },
  });
}
