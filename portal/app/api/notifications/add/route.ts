import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const newNotification = await prisma.notification.create({
      data
    });

    return NextResponse.json(newNotification, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
