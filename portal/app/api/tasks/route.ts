import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const tasks = await prisma.task.findMany();
    let json_response = {
      status: "success",
      data: {
        tasks,
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
