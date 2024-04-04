import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const departments = await prisma.department.findMany({});
    let json_response = {
      status: "success",
      data: {
        departments,
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
export async function POST(request: Request) {
  const newDepartment = await request.json();
  //   return;

  try {
    const department = await prisma.department.create({
      data: newDepartment,
    });

    let json_response = {
      status: "success",
      data: {
        department,
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
    const department = await prisma.department.delete({
      where: {
        id: id,
      },
    });
    let json_response = {
      status: "success",
      data: {
        department,
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
  const { directoryId, newTitle, newSlug } = await request.json();
  if (!directoryId || !newTitle || !newSlug) {
    return new NextResponse(JSON.stringify({ error: "Missing id" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const department = await prisma.department.update({
      where: {
        id: directoryId,
      },
      data: {
        title: newTitle,
        slug: newSlug,
      },
    });
    let json_response = {
      status: "success",
      data: {
        department,
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
