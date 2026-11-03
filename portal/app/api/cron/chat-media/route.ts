import { NextResponse } from 'next/server';

import { cleanupOldMedia } from '@/lib/chat/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Removes chat photos, videos and files older than 90 days from Spaces.
 * vercel.json runs it daily. With CRON_SECRET set, only Vercel may call it.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await cleanupOldMedia();
  return NextResponse.json({ status: 'success', data: result });
}
