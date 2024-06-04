import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const slug = request.nextUrl.searchParams.get("slug");
  try {
    const directoryList = await prisma.directory.findMany({
      where: {
        ...(id && { id: id }),
        ...(slug && { slug: slug }),
      },
    });
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
    const directory = await prisma.directory.create({
      data: newDirectory,
    });
    let json_response = {
      status: "success",
      data: {
        directory,
      },
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
    const directory = await prisma.directory.delete({
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
    const directory = await prisma.directory.update({
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
