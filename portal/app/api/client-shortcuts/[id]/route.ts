import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  try {
    const shortcuts = await db.clientUtilityLink.findMany({
      where: { clientId: id },
    });

    return NextResponse.json({
      status: 'success',
      data: shortcuts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error Getting Client Shortcuts' },
      { status: 500 },
    );
  }
}
