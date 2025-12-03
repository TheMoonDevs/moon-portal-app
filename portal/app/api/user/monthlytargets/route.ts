import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId') as string;
    const month = request.nextUrl.searchParams.get('month') as string;
    const year = request.nextUrl.searchParams.get('year') as string;
    const logType = request.nextUrl.searchParams.get('logType') as string;

    if (!userId || !month || !year) {
      return NextResponse.json(
        { success: false, error: 'userId, month, and year are required' },
        { status: 400 },
      );
    }

    const docId = `${userId}-${year}-${month}-monthlyTargets`;

    const docMarkdown = await prisma.docMarkdown.findUnique({
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
  try {
    const body = await request.json();
    const { userId, logType, markdown, month, year } = body;

    if (!userId || !logType || !markdown || !month || !year) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required fields: userId, logType, markdown, month, and year',
        },
        { status: 400 },
      );
    }

    const docId = `${userId}-${year}-${month}-monthlyTargets`;

    const newDocMarkdown = await prisma.docMarkdown.upsert({
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
