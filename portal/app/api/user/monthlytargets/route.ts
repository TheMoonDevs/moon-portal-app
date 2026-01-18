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

    // Return empty document structure if not found (instead of 404)
    // This allows the frontend to handle new months gracefully
    if (!docMarkdown) {
      return NextResponse.json(
        {
          success: true,
          data: {
            docId: docId,
            userId: userId,
            logType: logType || 'monthlyTargets',
            markdown: { content: '*' },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { status: 200 },
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

    // Better validation with detailed error messages
    const errors: string[] = [];
    
    if (!userId || typeof userId !== 'string') {
      errors.push('userId is required and must be a string');
    }
    if (!logType || typeof logType !== 'string') {
      errors.push('logType is required and must be a string');
    }
    if (!markdown || typeof markdown !== 'object' || !markdown.content) {
      errors.push('markdown.content is required');
    }
    // Month can be 0 (January), so check for null/undefined specifically
    if (month === undefined || month === null) {
      errors.push('month is required');
    }
    // Year must be a valid number
    if (year === undefined || year === null || (typeof year !== 'number' && typeof year !== 'string')) {
      errors.push('year is required and must be a number');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: errors,
          received: { 
            userId: userId ? 'present' : 'missing', 
            logType: logType ? 'present' : 'missing', 
            hasMarkdown: !!markdown,
            hasMarkdownContent: !!(markdown?.content),
            month: month,
            monthType: typeof month,
            year: year,
            yearType: typeof year,
          },
        },
        { status: 400 },
      );
    }

    // Ensure month and year are numbers for consistent docId format
    const monthNum = typeof month === 'string' ? parseInt(month, 10) : Number(month);
    const yearNum = typeof year === 'string' ? parseInt(year, 10) : Number(year);
    const docId = `${userId}-${yearNum}-${monthNum}-monthlyTargets`;

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
