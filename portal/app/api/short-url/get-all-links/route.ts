import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

export async function GET() {
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
