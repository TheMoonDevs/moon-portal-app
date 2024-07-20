import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  const { directory, direction } = await request.json();
  const directoryId = directory.id;

  if (!directoryId) {
    return NextResponse.json({ error: "Missing directoryId" }, { status: 400 });
  }

  if (!["UP", "DOWN"].includes(direction)) {
    return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
  }

  try {
    const currentDir = await prisma.parentDirectory.findUnique({
      where: { id: directoryId },
    });

    if (!currentDir) {
      return NextResponse.json(
        { error: "Directory not found" },
        { status: 404 }
      );
    }

    const siblingDir = await prisma.parentDirectory.findFirst({
      where: {
        type: currentDir.type,
        position:
          direction === "UP"
            ? { lt: currentDir.position }
            : { gt: currentDir.position },
      },
      orderBy: { position: direction === "UP" ? "desc" : "asc" },
    });

    if (!siblingDir) {
      return NextResponse.json(
        { error: "Cannot move further" },
        { status: 400 }
      );
    }

    const changed = await prisma.$transaction([
      prisma.parentDirectory.update({
        where: { id: currentDir.id },
        data: { position: siblingDir.position },
      }),
      prisma.parentDirectory.update({
        where: { id: siblingDir.id },
        data: { position: currentDir.position },
      }),
    ]);

    return NextResponse.json({
      status: "success",
      data: {
        message: `ParentDirectory moved ${direction} successfully`,
        changed,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
