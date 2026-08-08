import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { enforcePermission } from '@/lib/permissions/server';

export async function GET(request: NextRequest) {
  const denied = await enforcePermission('tasks:read');
  if (denied) return denied;

  try {
    const tasks = await db.task.findMany();
    const json_response = {
      status: 'success',
      data: {
        tasks,
      },
    };
    return NextResponse.json(json_response);
  } catch (e) {
    console.log(e);
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
