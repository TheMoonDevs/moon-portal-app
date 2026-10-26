import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { requireAuthedPermission } from '@/lib/permissions/server';

/**
 * Mark the signed-in user's notifications read or unread.
 * Body: `{ isRead: boolean, ids: string[] }` or `{ isRead: boolean, all: true }`.
 */
export async function PUT(request: NextRequest) {
  const { response, user } =
    await requireAuthedPermission('notifications:edit');
  if (response) return response;
  if (!user) {
    return NextResponse.json(
      { status: 'fail', error: 'Authentication required.' },
      { status: 401 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids)
      ? body.ids.filter((id: unknown) => typeof id === 'string')
      : [];
    if (typeof body?.isRead !== 'boolean' || (!body.all && !ids.length)) {
      return NextResponse.json(
        { status: 'fail', error: 'Send isRead and either ids or all.' },
        { status: 400 },
      );
    }

    const { count } = await db.notification.updateMany({
      where: {
        userId: user.id,
        ...(body.all ? {} : { id: { in: ids } }),
      },
      data: { isRead: body.isRead, updatedAt: new Date() },
    });

    return NextResponse.json({ status: 'success', data: { count } });
  } catch (error: any) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
