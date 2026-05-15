import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');

  if (!clientId) {
    return NextResponse.json(
      { error: 'Client ID is required' },
      { status: 400 },
    );
  }

  try {
    const clientRequest = await db.clientRequest.findFirst({
      where: { clientId },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(clientRequest);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 },
    );
  }
}
