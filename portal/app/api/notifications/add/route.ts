import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { parseCreateInput } from '@/lib/mongodb/validation';
import { enforcePermission } from '@/lib/permissions/server';

export async function POST(request: Request) {
  const denied = await enforcePermission('notifications:create');
  if (denied) return denied;

  try {
    const data = parseCreateInput('notification', await request.json());

    const newNotification = await db.notification.create({
      data,
    });

    return NextResponse.json(newNotification, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
