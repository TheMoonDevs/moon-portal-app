import { prisma } from "@/prisma/prisma";
import { NextResponse, NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  let error_response: any;

  try {
    const {
      name,
      email,
      upiId,
      dateOfBirth,
      city,
      position,
      workHourOverlap,
      address,
      username,
      passcode,
      userVertical,
      timezone,
      countryCode,
      avatar,
      banner,
      phone,
    } = await request.json();

    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        avatar,
        timezone,
        password: passcode,
        vertical: userVertical,
        workData: {
          joining: new Date(),
          workHours: "",
          positionPublic: position,
          positionInternal: "",
          grade: 0,
          gradeTag: "",
        },
        personalData: {
          dateOfBirth: dateOfBirth,
          phone: `${countryCode} ${phone}`,
          address: address,
          city: city,
          workHourOverlap: `${workHourOverlap} ${timezone}`,
          countryCode: countryCode,
        },
        payData: {
          upiId: upiId,
          payMethod: "",
          walletAddress: "",
          stipendWalletAddress: "",
          stipendAmount: "",
          stipendCurrency: "",
        },
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
        user,
      },
    };

    return NextResponse.json(json_response);
  } catch (e) {
    error_response = {
      status: "error",
      message: "Failed to create user",
      error: e,
    };
    return new NextResponse(JSON.stringify(error_response), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const password = searchParams.get("password");

  if (!username || !password) {
    return NextResponse.json(
      { message: "Username is required" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        username: username,
        password,
      },
    });

    if (user) {
      return NextResponse.json(
        { message: "Username is already taken" },
        { status: 409 }
      );
    } else {
      return NextResponse.json(
        { message: "Username is available" },
        { status: 200 }
      );
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
