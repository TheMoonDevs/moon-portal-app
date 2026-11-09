import { NextResponse } from 'next/server';

import { runAgreementReminders } from '@/lib/agreements/reminders';
import { runEndAlerts } from '@/lib/agreements/renewals';
import { syncOpenRollouts } from '@/lib/agreements/rollouts';
import { APP_BASE_URL } from '@/utils/constants/appInfo';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * The daily agreements run (vercel.json, 03:30 UTC, 09:00 IST):
 *   - signing reminders, 2 and 5 days after someone's link went out and the
 *     day before the deadline (lib/agreements/reminders);
 *   - open policy rollouts go out to people who joined since
 *     (lib/agreements/rollouts);
 *   - alerts 30 and 7 days before a contract or NDA ends
 *     (lib/agreements/renewals).
 * When CRON_SECRET is set, Vercel sends it as a bearer token and other
 * callers are refused; with the secret, `?dryRun=1` lists what would go out
 * without sending.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const dryRun = !!secret && params.get('dryRun') === '1';
  const origin = APP_BASE_URL.replace(/\/$/, '');
  const reminders = await runAgreementReminders({ dryRun });
  const rollouts = await syncOpenRollouts(origin, dryRun).catch((e) => {
    console.error('[agreements] rollouts', e);
    return { error: 'failed' };
  });
  const endings = await runEndAlerts(origin, dryRun).catch((e) => {
    console.error('[agreements] end alerts', e);
    return { error: 'failed' };
  });
  return NextResponse.json({
    status: 'success',
    data: { ...reminders, rollouts, endings },
  });
}
