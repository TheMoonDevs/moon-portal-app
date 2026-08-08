import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { enforcePermission } from '@/lib/permissions/server';

export async function DELETE(request: NextRequest) {
  const denied = await enforcePermission('shortlinks:delete');
  if (denied) return denied;

  const id = request.nextUrl.searchParams.get('id');
  try {
    if (!id) {
      return new NextResponse(JSON.stringify({ error: 'Missing id' }), {
        status: 400,
      });
    }
    const deleted = await db.shortLink.delete({
      where: {
        id,
      },
    });
    return NextResponse.json(deleted);
  } catch (err) {
    console.error(err);
    return new NextResponse(JSON.stringify(err), {
      status: 500,
    });
  }
}
