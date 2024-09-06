import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: "Body not found" }), {
      status: 400,
    });
  }

  try {
    const {
      userId,
      badgeTemplateId,
      name,
      sequence,
      date,
      status,
      imageUrl,
      showsCounter,
    } = await req.json();

    if (!userId || !badgeTemplateId || !name || !sequence) {
      return new NextResponse(
        JSON.stringify({ error: "Required fields are missing" }),
        { status: 400 }
      );
    }

    const existingBadge = await prisma.badgeRewarded.findFirst({
      where: { userId, badgeTemplateId, status },
    });

    if (existingBadge) {
      return new NextResponse(
        JSON.stringify({
          message: `Badge already ${status.toLowerCase()}`,
        })
      );
    }

    const badgeRewarded = await prisma.badgeRewarded.create({
      data: {
        userId,
        badgeTemplateId,
        name,
        sequence,
        date,
        status,
        imageUrl,
        showsCounter,
      },
    });

    return new NextResponse(
      JSON.stringify({ status: "success", data: badgeRewarded }),
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error processing badge request:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

export async function PUT(req: NextRequest) {
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: "Body not found" }), {
      status: 400,
    });
  }

  try {
    const { id, userId, badgeTemplateId, name, sequence, date } =
      await req.json();

    if (!userId || !badgeTemplateId || !name || !sequence) {
      return new NextResponse(
        JSON.stringify({ error: "Required fields are missing" }),
        { status: 400 }
      );
    }

    const existingRewardedBadge = await prisma.badgeRewarded.findFirst({
      where: { userId, badgeTemplateId, status: "REWARDED" },
    });

    if (existingRewardedBadge) {
      return new NextResponse(
        JSON.stringify({
          status: "skipped",
          message: "Badge already rewarded",
        }),
        { status: 409 }
      );
    }

    const badgeRewarded = await prisma.badgeRewarded.update({
      where: {
        id,
        userId,
        badgeTemplateId,
        status: "ACTIVATED",
      },
      data: {
        status: "REWARDED",
        date: date || undefined,
        showsCounter: false,
      },
    });

    return new NextResponse(
      JSON.stringify({ status: "success", data: badgeRewarded }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating badge request:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return;
    const badges = await prisma.badgeRewarded.findMany({
      where: {
        userId: id,
      },
    });

    return new NextResponse(
      JSON.stringify({ status: "success", data: badges }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.log("Error getting badges rewarded", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
