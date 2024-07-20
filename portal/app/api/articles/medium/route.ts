import { prisma } from "@/prisma/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const blogs = await prisma.article.findMany({
      where: { articleType: "medium" },
    });
    console.log(blogs);
    return NextResponse.json({ blogs });
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching blogs" },
      { status: 500 }
    );
  }
}
