import { prisma } from '@/prisma/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');

  try {
    if (!clientId) {
      return NextResponse.json(
        { status: 'error', message: 'client_id is required' },
        { status: 400 }
      );
    }

    const engagement = await prisma.engagement.findFirst({
      where: { client_id: clientId },
    });

    if (!engagement) {
      return NextResponse.json(
        { status: 'error', message: 'Engagement not found' },
        { status: 404 }
      );
    }

    const developers = await prisma.user.findMany({
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
      { status: 500 }
    );
  }
}
