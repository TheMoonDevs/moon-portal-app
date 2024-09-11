import { prisma } from "@/prisma/prisma";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const missionId = request.nextUrl.searchParams.get("missionId") as string;

  try {
    const tasks = await prisma.missionTask.findMany({
      where: {
        ...(missionId && { missionId }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      status: "success",
      data: { tasks },
    });
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      missionId,
      userId,
      title,
      description,
      indiePoints,
      expirable,
      expiresAt,
      avatar,
      name,
      email,
      userInfoId,
    } = await request.json();

    const task = await prisma.missionTask.create({
      data: {
        missionId,
        userId,
        title,
        description,
        indiePoints,
        expirable,
        expiresAt,
        avatar,
        name,
        email,
        userInfoId,
      },
    });

    return NextResponse.json({
      status: "success",
      data: { task },
    });
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...rest } = await request.json();

    const task = await prisma.missionTask.upsert({
      where: {
        id,
      },
      create: { ...rest },
      update: { ...rest },
    });

    const json_response = {
      status: "success",
      data: {
        task,
      },
    };

    return NextResponse.json(json_response);
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    const task = await prisma.missionTask.delete({
      where: { id },
    });

    return NextResponse.json({
      status: "success",
      data: { task },
    });
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}
