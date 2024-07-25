import { prisma } from "@/prisma/prisma";
import GoogleSheetsAPI from "@/utils/services/googleSheetSdk";
import { USERROLE } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  let error_response: any;

  try {
    const {
      name,
      email,
      upiId,
      dateOfBirth,
      startDate,
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
      govtId,
    } = await request.json();

    const currentDate = new Date()
      .toLocaleDateString("en-GB")
      .split("/")
      .reverse()
      .join("-");

    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        avatar,
        timezone,
        password: passcode,
        vertical: userVertical,
        role: USERROLE.TRIAL_CANDIDATE,
        workData: {
          joining: startDate ? startDate : currentDate,
          workHours: "",
          positionPublic: position,
          positionInternal: "",
          grade: 0,
          gradeTag: "",
        },
        personalData: {
          dateOfBirth: dateOfBirth,
          phone: `${phone}`,
          address: address,
          city: city,
          workHourOverlap: `${workHourOverlap} ${timezone}`,
          countryCode: countryCode,
          govtId: govtId,
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

    const sheetConfig = {
      clientEmail: process.env.GIAM_CLIENT_EMAIL || "",
      privateKey: process.env.GIAM_PRIVATE_KEY || "",
    };

    const sheetSDK = new GoogleSheetsAPI(sheetConfig);

    // const sheetData = [
    //   `${username}${passcode}`,
    //   name,
    //   email,
    //   phone,
    //   upiId,
    //   "=(YEAR(NOW())-YEAR(G14))",
    //   dateOfBirth,
    //   userVertical,
    //   city,
    //   position,
    //   workHourOverlap,
    //   "---", //workhours
    //   currentDate,
    //   "---", //office email
    //   address,
    // ];
    const sheetData = [
      "=NOW()",
      `${username}${passcode}`,
      name,
      email,
      phone,
      dateOfBirth,
      city,
      position,
      startDate ? startDate : currentDate,
      workHourOverlap,
      address,
      govtId,
      upiId,
    ];

    await sheetSDK.appendSheetData({
      // original spreadsheet 1w2kCO6IIYHi7YJBqfeg9ytmiIDRGhOgGzUPb_0u-UZ0
      spreadsheetId: "1GpGa1ucc_HWnYjBVckBc8h4pnA0S8J7SZxrdDbcuMYI",
      // original target 531726613
      targetId: "2036707832",
      values: [sheetData],
      range: "A:A",
      majorDimension: "ROWS",
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
