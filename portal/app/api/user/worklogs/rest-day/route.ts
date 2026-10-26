import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { enforcePermission, getSessionUser } from '@/lib/permissions/server';
import { localClock } from '@/lib/push/dayReminders';
import { markRestDay } from '@/lib/worklogs/restDay';

/** Mark one of the signed-in user's days (today or earlier) as a rest day. */
export async function POST(request: Request) {
  const denied = await enforcePermission('worklogs:edit');
  if (denied) return denied;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { date } = await request.json();
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'date must be YYYY-MM-DD' },
      { status: 400 },
    );
  }
  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { timezone: true },
  });
  if (date > localClock(record?.timezone, new Date()).date) {
    return NextResponse.json(
      { error: 'Only today or earlier days can be rest days' },
      { status: 400 },
    );
  }

  const workLog = await markRestDay(user.id, date);
  return NextResponse.json({ status: 'success', data: { workLog } });
}
