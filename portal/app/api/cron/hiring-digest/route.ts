import { NextResponse } from 'next/server';

import { runHiringDigest } from '@/lib/hiring/digest';

export const dynamic = 'force-dynamic';

/**
 * The every-other-morning hiring digest to each hiring lead. vercel.json
 * runs it daily at 02:30 UTC (08:00 IST) and it sends on every other day.
 * When CRON_SECRET is set, Vercel sends it as a bearer token and other
 * callers are refused. With the secret, `?dryRun=1` returns what would go
 * out without sending and `?force=1` sends on an off day; a dry run shows
 * applicant names, so it is refused while no secret is set.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const result = await runHiringDigest({
    force: !!secret && params.get('force') === '1',
    dryRun: !!secret && params.get('dryRun') === '1',
  });
  return NextResponse.json({ status: 'success', data: result });
}
