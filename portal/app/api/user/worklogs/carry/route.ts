import { NextResponse } from 'next/server';

import { enforcePermission, getSessionUser } from '@/lib/permissions/server';
import { addTasksToDay } from '@/lib/worklogs/dayTasks';
import { carryOpenPoints } from '@/lib/worklogs/points';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Moves the caller's points still open on earlier days into `today` (their
 * own date, YYYY-MM-DD, which may be a day off from the server's), and puts
 * their tasks for today on it.
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
  const result = await carryOpenPoints(user.id, today);
  const { added } = await addTasksToDay(user.id, today, { due: true });
  return NextResponse.json({ status: 'success', data: { ...result, added } });
}
