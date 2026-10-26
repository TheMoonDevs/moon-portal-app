import { NextResponse } from 'next/server';

import { runDayReminders } from '@/lib/push/dayReminders';

export const dynamic = 'force-dynamic';

/**
 * The 10pm "nothing logged today" and morning plan reminders, each in the
 * person's own timezone. vercel.json runs it twice a day, at 17:00 UTC
 * (22:30 IST) and 03:00 UTC (08:30 IST), because the Hobby plan only allows
 * daily crons; on Pro it can run every 30 minutes ("*\/30 * * * *") to cover
 * every timezone. When CRON_SECRET is set, Vercel sends it as a bearer token
 * and other callers are refused.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runDayReminders();
  return NextResponse.json({ status: 'success', data: result });
}
