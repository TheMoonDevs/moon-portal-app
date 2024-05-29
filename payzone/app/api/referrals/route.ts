import { prisma } from "@/prisma/prisma";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const loggedInUserId = request.nextUrl.searchParams.get("userId");
  // const isAdmin = url.searchParams.get("isAdmin") as string;

  // console.log(loggedInUserId);
  try {
    let referrals;
    if (loggedInUserId) {
      referrals = await prisma.userReferrals.findMany({
        where: {
          userId: loggedInUserId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      referrals = await prisma.userReferrals.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    if (!referrals) {
      return new NextResponse(
        JSON.stringify({ error: "Referrals not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const jsonResponse = {
      status: "success",
      data: {
        referrals,
      },
    };

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const data = JSON.parse(body);
  console.log(data);
  try {
    const referral = await prisma.userReferrals.create({
      data: data,
    });
    const jsonResponse = {
      status: "success",
      data: {
        referral,
      },
    };
    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    console.log(error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PATCH(request: Request) {
  const body = await request.text();
  const data = JSON.parse(body);

  try {
    const updatedReferral = await prisma.userReferrals.update({
      where: {
        id: data.id,
      },
      data: {
        ...(data.currentReferralStatus && {
          currentReferralStatus: data.currentReferralStatus,
        }),
        ...(data.engagementSpan && { engagementSpan: data.engagementSpan }),
        ...(data.totalSpent && { totalSpent: data.totalSpent }),
        ...(data.referralName && { referralName: data.referralName }),
      },
    });
    const jsonResponse = {
      status: "success",
      data: {
        updatedReferral,
      },
    };
    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
