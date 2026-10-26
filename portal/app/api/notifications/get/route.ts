import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { ensureNotificationsReset } from '@/lib/notifications/server';
import { requireAuthedPermission } from '@/lib/permissions/server';

/** The signed-in user's notifications, newest first. */
export async function GET() {
  const { response, user } =
    await requireAuthedPermission('notifications:read');
  if (response) return response;
  if (!user) {
    return NextResponse.json(
      { status: 'fail', error: 'Authentication required.' },
      { status: 401 },
    );
  }

  try {
    await ensureNotificationsReset();
    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 200,
    });

    return NextResponse.json(
      { status: 'success', data: { notifications } },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
