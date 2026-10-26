import { NextResponse } from 'next/server';

import { runDayReminders } from '@/lib/push/dayReminders';

export const dynamic = 'force-dynamic';

/**
 * Every 30 minutes (see vercel.json): the 10pm "nothing logged today" and
 * the morning plan reminders, each in the person's own timezone. When
 * CRON_SECRET is set, Vercel sends it as a bearer token and other callers
 * are refused.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runDayReminders();
  return NextResponse.json({ status: 'success', data: result });
}
