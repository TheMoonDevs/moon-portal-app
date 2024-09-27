import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";
import { BuffBadge, BUFF_LEVEL } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, title, points, buffLevel, month } = body;

    if (!userId || !title || !points || !buffLevel || !month) {
      return new NextResponse(
        JSON.stringify({ error: "Required fields are missing" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const existingBadge = await prisma.buffBadge.findUnique({
      where: {
        userId_month: { userId, month },
      },
    });

    if (existingBadge) {
      return new NextResponse(
        JSON.stringify({ status: "error", message: "Badge already exists" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    const newBuffBadge = await prisma.buffBadge.create({
      data: {
        userId,
        title,
        points,
        buffLevel,
        month,
      },
    });

    return new NextResponse(
      JSON.stringify({ status: "success", data: newBuffBadge }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error creating BuffBadge:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const buffLevel = searchParams.get("buffLevel") as BUFF_LEVEL | null;
    const month = searchParams.get("month");

    const query: any = {};
    if (userId) query.userId = userId;
    if (buffLevel) query.buffLevel = buffLevel;
    if (month) query.month = month;

    const buffBadges = await prisma.buffBadge.findMany({
      where: query,
    });

    return new NextResponse(
      JSON.stringify({ status: "success", data: buffBadges }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error fetching BuffBadges:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, userId, title, points, buffLevel } = body;

    if (!id || !userId || !points || !buffLevel || !title) {
      return new NextResponse(
        JSON.stringify({ error: "Required fields are missing for update" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const updatedBuffBadge = await prisma.buffBadge.update({
      where: { id },
      data: {
        userId,
        title,
        points,
        buffLevel,
      },
    });

    return new NextResponse(
      JSON.stringify({ status: "success", data: updatedBuffBadge }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error updating BuffBadge:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
