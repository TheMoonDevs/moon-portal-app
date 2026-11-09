import { NextResponse } from 'next/server';

import { runAgreementReminders } from '@/lib/agreements/reminders';

export const dynamic = 'force-dynamic';

/**
 * Automatic signing reminders: 2 and 5 days after someone's link went out,
 * and the day before the deadline (see lib/agreements/reminders). vercel.json
 * runs it daily at 03:30 UTC (09:00 IST). When CRON_SECRET is set, Vercel
 * sends it as a bearer token and other callers are refused; with the secret,
 * `?dryRun=1` lists what would go out without sending.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const data = await runAgreementReminders({
    dryRun: !!secret && params.get('dryRun') === '1',
  });
  return NextResponse.json({ status: 'success', data });
}
