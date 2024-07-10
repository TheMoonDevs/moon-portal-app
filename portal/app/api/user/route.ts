import { prisma } from "@/prisma/prisma";
import GoogleSheetsAPI from "@/utils/services/googleSheetSdk";
import { SlackBotSdk } from "@/utils/services/slackBotSdk";
import { HOUSEID, USERROLE, USERSTATUS, USERTYPE } from "@prisma/client";
import { JsonObject } from "@prisma/client/runtime/library";
import { NextResponse, NextRequest } from "next/server";

const sheetConfig = {
  clientEmail: process.env.GIAM_CLIENT_EMAIL || "",
  privateKey: process.env.GIAM_PRIVATE_KEY || "",
};

const sheetSDK = new GoogleSheetsAPI(sheetConfig);

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") as string;
  const userType = request.nextUrl.searchParams.get("userType") as USERTYPE;
  const role = request.nextUrl.searchParams.get("role") as USERROLE;
  const house = request.nextUrl.searchParams.get("house") as HOUSEID;
  const status = request.nextUrl.searchParams.get("status");

  let error_response: any;

  try {
    //console.log("fetching user on server", id, userType, role);
    const user = await prisma.user.findMany({
      where: {
        ...(id && { id }),
        ...(userType && { userType }),
        ...(role && { role }),
        ...(house && { house }),
        status: status ? (status as USERSTATUS) : USERSTATUS.ACTIVE,
      },
    });
    const slackBotSdk = new SlackBotSdk();
    const allSlackUsers = await slackBotSdk.getSlackUsers();

    await Promise.all(
      user.map((userData) => {
        try {
          if (
            !userData.thirdPartyData ||
            !(userData.thirdPartyData as JsonObject).slackData
          ) {
            const slackUser = allSlackUsers.find(
              (slackUser: any) => slackUser?.profile?.email === userData?.email
            );
            // console.log(slackUser?.profile?.email, userData?.email);

            if (slackUser) {
              const newThirdPartyData = {
                ...(userData.thirdPartyData as JsonObject),
                slackData: slackUser,
              };

              return prisma.user.update({
                where: { id: userData.id },
                data: {
                  thirdPartyData: newThirdPartyData,
                  slackId: slackUser.id,
                },
              });
            }
          }
        } catch (error: any) {
          console.error(`Error updating user ${userData.id}: ${error.message}`);
        }
      })
    );

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
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request: Request) {
  try {
    const { id, ...rest } = await request.json();
    const user = await prisma.user.create({
      data: {
        ...rest,
      },
    });

    const currentDate = new Date()
      .toLocaleDateString("en-GB")
      .split("/")
      .reverse()
      .join("-");

    const sheetData = [
      `${rest.username}${rest.password}`,
      rest.name,
      rest.email,
      rest.personalData.phone,
      rest.payData.upiId,
      "=(YEAR(NOW())-YEAR(G14))",
      rest.personalData.dateOfBirth,
      rest.vertical,
      rest.personalData.city,
      rest.workData.positionInternal,
      rest.personalData.workHourOverlap,
      rest.workData.workHours,
      currentDate,
      "---", //office email
      rest.personalData.address,
    ];

    await sheetSDK.appendSheetData({
      spreadsheetId: "1w2kCO6IIYHi7YJBqfeg9ytmiIDRGhOgGzUPb_0u-UZ0",
      targetId: "0",
      values: [sheetData],
      range: "A:A",
      majorDimension: "ROWS",
    });
    let json_response = {
      status: "success",
      data: {
        user,
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

export async function PUT(request: Request) {
  try {
    const { id, ...rest } = await request.json();

    const user = await prisma.user.upsert({
      where: {
        id,
      },
      create: { ...rest },
      update: { ...rest },
    });

    const currentDate = new Date()
      .toLocaleDateString("en-GB")
      .split("/")
      .reverse()
      .join("-");

    const sheetData = [
      `${rest.username}${rest.password}`,
      rest.name,
      rest.email,
      rest.personalData?.phone,
      rest.payData?.upiId,
      "=(YEAR(NOW())-YEAR(G14))",
      rest.personalData?.dateOfBirth,
      rest.vertical,
      rest.personalData?.city,
      rest.workData?.positionInternal,
      rest.personalData?.workHourOverlap,
      rest.workData?.workHours,
      currentDate,
      "---", //office email
      rest.personalData?.address,
    ];

    const sheet = await sheetSDK.getSheetData({
      spreadsheetId: "1w2kCO6IIYHi7YJBqfeg9ytmiIDRGhOgGzUPb_0u-UZ0",
      targetId: "0",
      range: "A:Z",
      majorDimension: "ROWS",
    });

    let isSheetDataUpdated = false;
    await Promise.all(
      sheet.values.map(async (row: any, index: number) => {
        console.log(row[0]);
        if (row[0] === `${rest.username}${rest.password}`) {
          await sheetSDK.updateSheetData({
            spreadsheetId: "1w2kCO6IIYHi7YJBqfeg9ytmiIDRGhOgGzUPb_0u-UZ0",
            targetId: "0",
            values: [sheetData],
            range: `A${index + 1}`,
            majorDimension: "ROWS",
          });
          isSheetDataUpdated = true;
        }
      })
    );

    if (!isSheetDataUpdated) {
      await sheetSDK.appendSheetData({
        spreadsheetId: "1w2kCO6IIYHi7YJBqfeg9ytmiIDRGhOgGzUPb_0u-UZ0",
        targetId: "0",
        values: [sheetData],
        range: "A:A",
        majorDimension: "ROWS",
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
    console.log(e);
    
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}
