import { NextResponse } from 'next/server';

import { runDueSchedules } from '@/lib/workspace/schedules';

export const dynamic = 'force-dynamic';

/**
 * Daily run of scheduled tasks (see vercel.json). When CRON_SECRET is set,
 * Vercel sends it as a bearer token and other callers are refused. It only
 * ever creates tasks that are already due, and tasks also catch up whenever
 * someone opens a project, so this is a safety net rather than the only path.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runDueSchedules();
  return NextResponse.json({ status: 'success', data: result });
}
