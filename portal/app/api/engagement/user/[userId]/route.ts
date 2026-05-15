import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 },
      );
    }

    const engagements = await db.engagement.findMany({
      where: {
        developer_ids: {
          has: userId,
        },
      },
    });

    return NextResponse.json({
      status: 'success',
      data: engagements,
    });
  } catch (error) {
    console.error('Error retrieving user engagements:', error);
    return NextResponse.json(
      { error: `Error retrieving engagements ${error}` },
      { status: 500 },
    );
  }
}
