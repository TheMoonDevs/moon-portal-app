import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const jobPost = await prisma.jobPost.findMany({});

    let json_response = {
      status: "success",
      data: {
        jobPost,
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
