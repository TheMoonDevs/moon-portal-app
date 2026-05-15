import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');

  try {
    if (!clientId) {
      return NextResponse.json(
        { status: 'error', message: 'client_id is required' },
        { status: 400 },
      );
    }

    const engagement = await db.engagement.findFirst({
      where: { client_id: clientId },
    });

    if (!engagement) {
      return NextResponse.json(
        { status: 'error', message: 'Engagement not found' },
        { status: 404 },
      );
    }

    const developers = await db.user.findMany({
      where: {
        id: {
          in: engagement.developer_ids,
        },
      },
    });

    return NextResponse.json({ status: 'success', data: developers });
  } catch (error) {
    console.error('Error fetching developers:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 },
    );
  }
}
