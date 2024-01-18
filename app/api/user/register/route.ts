import { prisma } from "@/prisma/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const user = await prisma.user.create({
      data: { ...json },
    });

    let json_response = {
      status: "success",
      data: {
        user,
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
