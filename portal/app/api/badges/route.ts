import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";
import { BadgeType } from "@prisma/client";

export async function POST(req: NextRequest) {
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: "Body not found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      badgeName,
      badgeDescription,
      imageurl,
      criteria,
      badgeType,
    } = body;

    if (!badgeName || !badgeDescription || !criteria) {
      return new NextResponse(
        JSON.stringify({ error: "Required fields are missing" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const newBadge = await prisma.badgeTemplate.create({
      data: {
        name: badgeName,
        description: badgeDescription,
        imageurl,
        criteria,
        badgeType
      },
    });

    return new NextResponse(
      JSON.stringify({
        status: "success",
        data: newBadge,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
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
    const badgeType = searchParams.get('badgeType') as BadgeType | null;
    const badges = await prisma.badgeTemplate.findMany({
      where: badgeType ? { badgeType } : {},
    });

    return new NextResponse(
      JSON.stringify({
        status: "success",
        data: badges,
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
