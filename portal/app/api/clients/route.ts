import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  let error_response: any;

  try {
    const clients = await prisma.user.findMany({
      where: {
        userType: "CLIENT",
      },
    });

    if (error_response) {
      return new NextResponse(JSON.stringify(error_response), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    let json_response = {
      status: "success",
      data: {
        clients,
      },
    };

    return NextResponse.json(json_response);
  } catch (error) {
    return NextResponse.json(
      { error: "Error Getting Client Shortcuts" },
      { status: 500 }
    );
  }
}