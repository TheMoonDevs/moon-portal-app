import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

export async function GET(req: NextRequest) {
  let error_response: any;

  try {
    const clients = await db.user.findMany({
      where: {
        userType: 'CLIENT',
      },
    });

    if (error_response) {
      return new NextResponse(JSON.stringify(error_response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const json_response = {
      status: 'success',
      data: {
        clients,
      },
    };

    return NextResponse.json(json_response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error Getting Client Shortcuts' },
      { status: 500 },
    );
  }
}
