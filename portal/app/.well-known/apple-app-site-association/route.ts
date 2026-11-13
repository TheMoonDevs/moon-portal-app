import { NextResponse } from 'next/server';

import { appleAppSiteAssociation } from '@/lib/mobile/appLinks';

export const dynamic = 'force-dynamic';

/** Lets the iPhone app open the website's links (lib/mobile/appLinks.ts). */
export function GET() {
  const body = appleAppSiteAssociation();
  if (!body) return new NextResponse('Not found', { status: 404 });
  return NextResponse.json(body);
}
