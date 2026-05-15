import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const user = await db.user.create({
      data: { ...json },
    });

    const json_response = {
      status: 'success',
      data: {
        user,
      },
    };

    return NextResponse.json(json_response);
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
