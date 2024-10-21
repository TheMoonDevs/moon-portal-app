import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: "Body not found" }), {
      status: 400,
    });
  }

  try {
    const { userId, targetUserId, content } = await req.json();

    if (!userId || !targetUserId || !content) {
      return new NextResponse(
        JSON.stringify({ error: "Required fields are missing" }),
        { status: 400 }
      );
    }

    const pointer = await prisma.pointer.create({
      data: {
        userId,
        targetUserId,
        content,
      },
    });

    return new NextResponse(
      JSON.stringify({ status: "success", data: pointer }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error creating pointer:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

export async function PUT(req: NextRequest) {
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: "Body not found" }), {
      status: 400,
    });
  }

  try {
    const { pointerId, reply } = await req.json();

    if (!pointerId || !reply || !reply.userId || !reply.content) {
      return new NextResponse(
        JSON.stringify({ error: "Pointer ID, user ID, and reply content are required" }),
        { status: 400 }
      );
    }

    const newReply = await prisma.reply.create({
      data: {
        pointerId,
        userId: reply.userId,
        content: reply.content,
      },
    });

    const updatedPointer = await prisma.pointer.update({
      where: { id: pointerId },
      data: {
        replies: {
          connect: { id: newReply.id },
        },
      },
      include: { replies: true },
    });

    return new NextResponse(
      JSON.stringify({ status: "success", data: updatedPointer }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating pointer:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return new NextResponse(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400 }
      );
    }

    const pointers = await prisma.pointer.findMany({
      where: { userId },
      include: {
        replies: {
          orderBy: {
            createdAt: 'desc', 
          },
        },
      },
    });

    return new NextResponse(
      JSON.stringify({ status: "success", data: pointers }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error getting pointers:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
