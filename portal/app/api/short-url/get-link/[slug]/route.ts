import { prisma } from "@/prisma/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } },
  res: Response
) {
  const { slug } = params;
  if (!slug || typeof slug !== "string") {
    return new NextResponse(
      JSON.stringify({ message: "Please provide a slug" }),
      {
        status: 404,
      }
    );
  }

  try {
    const data = await prisma.shortLink.findFirst({
      where: {
        slug: {
          equals: slug,
        },
      },
    });
    if (!data) {
      return new NextResponse(
        JSON.stringify({ message: "Short link not found!" }),
        {
          status: 404,
        }
      );
    }

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
        "Cache-Control": "s-maxage=1000000000, stale-while-revalidate",
      },
    });
  } catch (err) {
    return new NextResponse(JSON.stringify({ error: "Failed to fetch data" }), {
      status: 500,
    });
  }
}
