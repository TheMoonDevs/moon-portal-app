import { NextResponse } from 'next/server';

import { runHiringDigest } from '@/lib/hiring/digest';
import { runHiringFollowUps } from '@/lib/hiring/followUps';

export const dynamic = 'force-dynamic';

/**
 * The hiring digest to each hiring lead. vercel.json runs it daily at 02:30
 * UTC (08:00 IST); each lead gets it as often as their Hiring preferences say
 * (every 2 days by default). Before it, the task follow-ups openings turn
 * on (check-ins, reminders, closing no-shows) are sent; see lib/hiring/followUps.
 * When CRON_SECRET is set, Vercel sends it as a bearer token and other
 * callers are refused. With the secret, `?dryRun=1` returns what would go
 * out without sending and `?force=1` sends to every lead not set to off, due or not; a dry run shows
 * applicant names, so it is refused while no secret is set.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const dryRun = !!secret && params.get('dryRun') === '1';
  // Task follow-ups go first, so the digest shows where people are after them.
  const followUps = await runHiringFollowUps({ dryRun });
  const result = await runHiringDigest({
    force: !!secret && params.get('force') === '1',
    dryRun,
  });
  return NextResponse.json({
    status: 'success',
    data: { ...result, followUps },
  });
}
