import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

export async function GET(req: NextRequest, res: NextResponse) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      const response = await db.devProfile.findMany();

      return new NextResponse(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      const response = await db.devProfile.findUnique({
        where: {
          userId,
        },
      });

      return new NextResponse(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (error: any) {
    console.error('Error fetching dev profile:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

export async function POST(req: NextRequest, res: NextResponse) {
  try {
    const body = await req.json();
    const { userId, ...rest } = body;

    // upsert

    const response = await db.devProfile.upsert({
      where: {
        userId,
      },
      create: {
        userId,
        ...rest,
      },
      update: {
        ...rest,
      },
    });
    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Error updating dev profile:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

export async function DELETE(req: NextRequest, res: NextResponse) {
  try {
    const body = await req.json();
    const { userId } = body;

    const response = await db.devProfile.delete({
      where: {
        userId,
      },
    });

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Error deleting dev profile:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
