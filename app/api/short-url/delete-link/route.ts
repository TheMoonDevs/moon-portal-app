import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  try {
    if (!id) {
      return new NextResponse(JSON.stringify({ error: "Missing id" }), {
        status: 400,
      });
    }
    const deleted = await prisma.shortLink.delete({
      where: {
        id,
      },
    });
    return NextResponse.json(deleted);
  } catch (err) {
    console.error(err);
    return new NextResponse(JSON.stringify(err), {
      status: 500,
    });
  }
}
