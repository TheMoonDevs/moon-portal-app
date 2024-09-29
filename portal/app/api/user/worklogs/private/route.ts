import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId") as string;
    const logType = request.nextUrl.searchParams.get("logType") as string;
    const date = request.nextUrl.searchParams.get("date") as string;
    // console.log("??????????", date);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { success: false, error: "date is required" },
        { status: 400 }
      );
    }

    const docId = `${userId}-privateWorklogs-${date}`;

    const docMarkdown = await prisma.docMarkdown.findUnique({
      where: {
        docId: docId,
        ...(logType && { logType }),
      },
    });

    if (!docMarkdown) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: docMarkdown },
      { status: 200 }
    );
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, logType, markdown, date } = body;
    // console.log(">>>>>>>>>>>>>>");
    // console.log(body);
    // console.log(">>>>>>>>>>>>>>");
    if (!userId || !logType || !markdown) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const docId = `${userId}-privateWorklogs-${date}`;

    const newDocMarkdown = await prisma.docMarkdown.upsert({
      where: {
        docId: docId,
      },
      update: {
        markdown: markdown,
        updatedAt: new Date(),
        date: date,
      },
      create: {
        docId: docId,
        logType: logType,
        userId: userId,
        markdown: markdown,
        date: date,
      },
    });

    return NextResponse.json(
      { success: true, data: newDocMarkdown },
      { status: 201 }
    );
  } catch (e) {
    console.log(e);
    return new NextResponse(JSON.stringify(e), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
