import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    let error_response: any;

    const user = await db.user.findFirst({
      where: {
        username,
        password,
      },
    });

    if (!user) {
      error_response = {
        status: 'fail',
        message: 'User not found',
      };
    }

    if (error_response) {
      return new NextResponse(JSON.stringify(error_response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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
