import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId") as string;
    const logType = request.nextUrl.searchParams.get("logType") as string;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    // Admin tasks are user-specific
    const docId = `${userId}-adminTasks`;

    const docMarkdown = await prisma.docMarkdown.findUnique({
      where: {
        docId: docId,
        ...(logType && { logType }),
      },
    });

    // Return empty document structure if not found (instead of 404)
    if (!docMarkdown) {
      return NextResponse.json(
        {
          success: true,
          data: {
            docId: docId,
            userId: userId,
            logType: logType || "adminTasks",
            markdown: { content: "*" },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: true, data: docMarkdown },
      { status: 200 }
    );
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
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields: userId, logType, and markdown" 
        },
        { status: 400 }
      );
    }

    // Admin tasks are user-specific
    const docId = `${userId}-adminTasks`;

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
        userId: userId, // User-specific admin tasks
        markdown: markdown,
      },
    });

    return NextResponse.json(
      { success: true, data: newDocMarkdown },
      { status: 201 }
    );
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
