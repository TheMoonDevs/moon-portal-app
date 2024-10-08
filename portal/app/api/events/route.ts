import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: "Body not found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { title, subTitle, link, date, month, year } = body;

    if (!title || !subTitle || !link || !date || !month || !year) {
      return new NextResponse(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const newEvent = await prisma.event.create({
      data: {
        name: title,
        subTitle,
        link,
        date,
        month,
        year
      }
    })

    return new NextResponse(JSON.stringify(newEvent), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error creating badge details:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const events = await prisma.event.findMany({
      where: {
        month: month ? parseInt(month) : undefined,
        year: year ? parseInt(year) : undefined
      },
      orderBy: {
        date: 'asc'
      }
    });

    return new NextResponse(
      JSON.stringify({
        status: "success",
        data: events,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error fetching badges:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}