import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { enforcePermission } from '@/lib/permissions/server';

export async function GET() {
  const denied = await enforcePermission('shortlinks:read');
  if (denied) return denied;

  try {
    const shortLinks = await db.shortLink.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        slug: true,
        redirectTo: true,
        createdAt: true,
      },
    });
    return NextResponse.json(shortLinks);
  } catch (err) {
    console.error(err);
    return new NextResponse(JSON.stringify(err), {
      status: 500,
    });
  }
}
