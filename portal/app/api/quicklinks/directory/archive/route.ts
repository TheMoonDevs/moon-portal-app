import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const directories = await prisma.directory.findMany({
      where: {
        archive: { not: null },
      },
    });
    let json_response = {
      status: "success",
      data: {
        directories,
      },
    };
    return NextResponse.json(json_response);
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req: Request) {
    const { parentDirId, archive, id } = await req.json();
  
    // Validate inputs
    if (!id || (parentDirId === null && archive === null)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
  
    try {
      // Update the directory entry
      const updatedDirectory = await prisma.directory.updateMany({
        where: {
          id: id,
        },
        data: {
          parentDirId: parentDirId ?? null,
          archive: archive ?? null,
        },
      });
  
      let json_response = {
        status: "success",
        data: {
          id,
        },
      };
      return NextResponse.json(json_response);
    } catch (error) {
      console.error("Error updating directory:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }