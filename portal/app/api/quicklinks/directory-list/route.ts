import { prisma } from "@/prisma/prisma";
import { ROOTTYPE } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const slug = request.nextUrl.searchParams.get("slug");
  const tabType = request.nextUrl.searchParams.get("tabType") as ROOTTYPE;
  const userId = request.nextUrl.searchParams.get("userId") as string;
  let directoryList = [];
  try {
    if (!userId) {
      directoryList = await prisma.directoryList.findMany({
        where: {
          ...(id && { id: id }),
          ...(slug && { slug: slug }),
          ...(tabType && { tabType: tabType }),
        },
      });
    } else {
      directoryList = await prisma.directoryList.findMany({
        where: {
          ...(id && { id: id }),
          ...(slug && { slug: slug }),
        },

        include: {
          userDirectory: {
            where: {
              userId: userId,
              directoryType: "FAVORITED",
            },
            select: {
              directoryId: true,
            },
          },
        },
      });
    }
    let json_response = {
      status: "success",
      data: {
        directoryList,
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

export async function POST(request: Request) {
  const newDirectory = await request.json();

  try {
    const lastDirectory = await prisma.directoryList.findFirst({
      where: { parentDirId: newDirectory.parentDirId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const newPosition = lastDirectory ? lastDirectory.position + 10 : 10;
    const directory = await prisma.directoryList.create({
      data: {
        ...newDirectory,
        position: newPosition,
      },
    });
    let json_response = {
      status: "success",
      data: directory,
    };
    return NextResponse.json(json_response);
  } catch (e) {
    console.log(e);
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return new NextResponse(JSON.stringify({ error: "Missing id" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const directory = await prisma.directoryList.delete({
      where: {
        id: id,
      },
    });
    let json_response = {
      status: "success",
      data: {
        directory,
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

export async function PUT(request: NextRequest) {
  const { id, ...rest } = await request.json();
  if (!id) {
    return new NextResponse(JSON.stringify({ error: "Missing id" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const directory = await prisma.directoryList.update({
      where: {
        id: id,
      },
      data: {
        ...rest,
      },
    });
    let json_response = {
      status: "success",
      data: {
        directory,
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
