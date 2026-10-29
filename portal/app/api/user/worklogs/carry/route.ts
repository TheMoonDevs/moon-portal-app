import { NextResponse } from 'next/server';

import { enforcePermission, getSessionUser } from '@/lib/permissions/server';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Once moved the caller's open points from earlier days into `today`. Kept
 * for screens still open from before; it moves nothing now.
 */
export async function POST(request: Request) {
  const denied = await enforcePermission('worklogs:edit');
  if (denied) return denied;
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json(
      { status: 'fail', error: 'Authentication required.' },
      { status: 401 },
    );
  const { today } = await request.json().catch(() => ({}));
  const valid =
    typeof today === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(today) &&
    Math.abs(Date.parse(`${today}T12:00:00Z`) - Date.now()) < 1.6 * DAY_MS;
  if (!valid)
    return NextResponse.json(
      { status: 'fail', error: 'today must be your current date.' },
      { status: 400 },
    );
  // Tasks first: an unfinished task stays pending until it is done or
  // archived, so nothing is carried any more.
  return NextResponse.json({ status: 'success', data: { moved: 0, added: 0 } });
}
