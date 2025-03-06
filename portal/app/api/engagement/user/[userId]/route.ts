import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const engagements = await prisma.engagement.findMany({
      where: {
        developer_ids: {
          has: userId,
        },
      },
    });

    return NextResponse.json({
      status: "success",
      data: engagements,
    });
  } catch (error) {
    console.error("Error retrieving user engagements:", error);
    return NextResponse.json({ error: `Error retrieving engagements ${error}` }, { status: 500 });
  }
}
