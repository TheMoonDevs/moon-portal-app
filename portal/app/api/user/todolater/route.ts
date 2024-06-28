import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId") as string; 
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    }

    const docId = `${userId}-todolater`;

    const docMarkdown = await prisma.docMarkdown.findUnique({
      where: {
        userId: userId
      },
    });  
    
    if (!docMarkdown) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: docMarkdown }, { status: 200 });
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { userId, logType, markdown } = body;

    if (!userId || !logType || !markdown) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const docId = `${userId}-laterTodos`;

    const newDocMarkdown = await prisma.docMarkdown.upsert({
        where: {
            userId: userId
          },
          update: {
            markdown: markdown,
            updatedAt: new Date()
          },
          create: {
            docId: docId,
            logType: logType,
            userId: userId,
            markdown: markdown,
          }
    });
    
    return NextResponse.json({ success: true, data: newDocMarkdown }, { status: 201 });
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      });
  }
}