import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const shortcuts = await prisma.clientUtilityLink.findMany({
      where: { clientId: id },
    });

    return NextResponse.json({
      status: "success",
      data: shortcuts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error Getting Client Shortcuts" },
      { status: 500 }
    );
  }
}