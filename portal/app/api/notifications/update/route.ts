import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

export async function PUT(request: NextRequest) {
  try {
    const { id, ...data } = await request.json();

    const updatedNotification = await db.notification.upsert({
      where: {
        id,
      },
      create: { id, ...data },
      update: { ...data, updatedAt: new Date() },
    });

    const json_response = {
      status: 'success',
      data: {
        notification: updatedNotification,
      },
    };

    return NextResponse.json(json_response, { status: 200 });
  } catch (error: any) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
