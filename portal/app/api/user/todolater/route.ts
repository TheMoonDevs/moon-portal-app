import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { enforcePermission } from '@/lib/permissions/server';

export async function GET(request: NextRequest) {
  const denied = await enforcePermission('worklogs:read');
  if (denied) return denied;

  try {
    const userId = request.nextUrl.searchParams.get('userId') as string;
    const logType = request.nextUrl.searchParams.get('logType') as string;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 },
      );
    }

    const docId = `${userId}-todoLater`;

    const docMarkdown = await db.docMarkdown.findUnique({
      where: {
        docId: docId,
        ...(logType && { logType }),
      },
    });

    if (!docMarkdown) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, data: docMarkdown },
      { status: 200 },
    );
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

export async function PUT(request: NextRequest) {
  const denied = await enforcePermission('worklogs:edit');
  if (denied) return denied;

  try {
    const body = await request.json();
    const { userId, logType, markdown } = body;

    if (!userId || !logType || !markdown) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const docId = `${userId}-todoLater`;

    const newDocMarkdown = await db.docMarkdown.upsert({
      where: {
        docId: docId,
      },
      update: {
        markdown: markdown,
        updatedAt: new Date(),
      },
      create: {
        docId: docId,
        logType: logType,
        userId: userId,
        markdown: markdown,
      },
    });

    return NextResponse.json(
      { success: true, data: newDocMarkdown },
      { status: 201 },
    );
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
