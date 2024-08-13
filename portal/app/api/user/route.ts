import { prisma } from "@/prisma/prisma";
import { sheetMap, spreadsheetId } from "@/utils/constants/spreadsheetData";
import GoogleSheetsAPI from "@/utils/services/googleSheetSdk";
import { HOUSEID, USERROLE, USERSTATUS, USERTYPE } from "@prisma/client";
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
    const user = await prisma.user.findMany({
      where: {
        ...(id && { id }),
        ...(userType && { userType }),
        ...(role && { role }),
        ...(house && { house }),
        status: status ? (status as USERSTATUS) : USERSTATUS.ACTIVE,
      },
    });
    // console.log(user);

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
    console.log(e);
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

    const sheetData =
      rest.role == USERROLE.TRIAL_CANDIDATE
        ? [
            "=NOW()",
            `${rest.username}${rest.password}`,
            rest.name,
            rest.email,
            rest.personalData.phone,
            rest.personalData.dateOfBirth,
            rest.personalData.city,
            rest.workData?.positionInternal,
            rest.workData.joining ? rest.workData.joining : currentDate,
            rest.personalData?.workHourOverlap,
            rest.personalData?.address,
            rest.personalData.govtId ? rest.personalData.govtId : "---",
            rest.payData?.upiId,
          ]
        : [
            `${rest.username}${rest.password}`,
            rest.name,
            rest.email,
            rest.personalData.phone,
            rest.payData.upiId,
            `=(YEAR(NOW())-YEAR(INDIRECT("G" & ROW())))`,
            rest.personalData.dateOfBirth,
            rest.personalData.city,
            rest.vertical,
            rest.workData.positionInternal,
            rest.personalData.workHourOverlap,
            rest.workData.workHours,
            currentDate,
            "---", //office email
            rest.personalData.address,
          ];

    await sheetSDK.appendSheetData({
      spreadsheetId,
      targetId:
        rest.role == USERROLE.TRIAL_CANDIDATE
          ? sheetMap.Trial
          : sheetMap.CoreTeam,
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
    const oldUser = await prisma.user.findFirst({
      where: {
        id,
      },
    });
    // console.log("old user", oldUser);
    // console.log("rest ", rest);
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
    const sheetDataTrial = [
      "=NOW()",
      `${rest.username}${rest.password}`,
      rest.name,
      rest.email,
      rest.personalData?.phone,
      rest.personalData?.dateOfBirth,
      rest.personalData?.city,
      rest.workData?.positionInternal,
      rest.workData.joining ? rest.workData.joining : currentDate,
      rest.personalData?.workHourOverlap,
      rest.personalData?.address,
      rest.personalData?.govtId ? rest.personalData.govtId : "---",
      rest.payData?.upiId,
    ];
    const sheetDataCore = [
      `${rest.username}${rest.password}`,
      rest.name,
      rest.email,
      rest.personalData?.phone,
      rest.payData?.upiId,
      `=(YEAR(NOW())-YEAR(INDIRECT("G" & ROW())))`,
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
    // const sheetData =
    //   rest.role == USERROLE.TRIAL_CANDIDATE
    //     ? [
    //         "=NOW()",
    //         `${rest.username}${rest.password}`,
    //         rest.name,
    //         rest.email,
    //         rest.personalData.phone,
    //         rest.personalData.dateOfBirth,
    //         rest.personalData.city,
    //         rest.workData?.positionInternal,
    //         rest.workData.joining ? rest.workData.joining : currentDate,
    //         rest.personalData?.workHourOverlap,
    //         rest.personalData?.address,
    //         rest.personalData.govtId ? rest.personalData.govtId : "---",
    //         rest.payData?.upiId,
    //       ]
    //     : [
    //         `${rest.username}${rest.password}`,
    //         rest.name,
    //         rest.email,
    //         rest.personalData?.phone,
    //         rest.payData?.upiId,
    //         "=(YEAR(NOW())-YEAR(G14))",
    //         rest.personalData?.dateOfBirth,
    //         rest.vertical,
    //         rest.personalData?.city,
    //         rest.workData?.positionInternal,
    //         rest.personalData?.workHourOverlap,
    //         rest.workData?.workHours,
    //         currentDate,
    //         "---", //office email
    //         rest.personalData?.address,
    //       ];

    const newSheet = await sheetSDK.getSheetData({
      spreadsheetId,
      targetId:
        rest.status === "ACTIVE"
          ? rest.role == USERROLE.TRIAL_CANDIDATE
            ? sheetMap.Trial
            : sheetMap.CoreTeam
          : sheetMap.Archive,
      range: "A:Z",
      majorDimension: "ROWS",
    });
    const oldSheet = await sheetSDK.getSheetData({
      spreadsheetId,
      targetId:
        oldUser?.status === "ACTIVE"
          ? oldUser?.role == USERROLE.TRIAL_CANDIDATE
            ? sheetMap.Trial
            : sheetMap.CoreTeam
          : sheetMap.Archive,
      range: "A:Z",
      majorDimension: "ROWS",
    });
    let isSheetDataUpdated = false;
    let deleteOldData = false;
    await Promise.all(
      newSheet.values.map(async (row: any, index: number) => {
        if (
          row[rest.role == USERROLE.TRIAL_CANDIDATE ? 1 : 0] ===
          `${rest.username}${rest.password}`
        ) {
          if (oldUser?.role == rest.role && oldUser?.status == rest.status) {
            await sheetSDK.updateSheetData({
              spreadsheetId,
              targetId:
                rest.role == USERROLE.TRIAL_CANDIDATE
                  ? sheetMap.Trial
                  : sheetMap.CoreTeam,
              values: [
                oldUser?.role == USERROLE.TRIAL_CANDIDATE
                  ? sheetDataTrial
                  : sheetDataCore,
              ],
              range: `A${index + 1}`,
              majorDimension: "ROWS",
            });
          } else if (
            oldUser?.role != rest.role &&
            oldUser?.status == rest.status
          ) {
            await sheetSDK.updateSheetData({
              spreadsheetId,
              targetId:
                rest.role == USERROLE.TRIAL_CANDIDATE
                  ? sheetMap.Trial
                  : sheetMap.CoreTeam,
              values: [
                rest.role == USERROLE.TRIAL_CANDIDATE
                  ? sheetDataTrial
                  : sheetDataCore,
              ],
              range: `A${index + 1}`,
              majorDimension: "ROWS",
            });
            deleteOldData = true;
          }
          isSheetDataUpdated = true;
        }
      })
    );

    if (!isSheetDataUpdated) {
      await sheetSDK.appendSheetData({
        spreadsheetId,
        targetId:
          rest.status === "ACTIVE"
            ? rest.role == USERROLE.TRIAL_CANDIDATE
              ? sheetMap.Trial
              : sheetMap.CoreTeam
            : sheetMap.Archive,
        values: [
          rest.role == USERROLE.TRIAL_CANDIDATE
            ? sheetDataTrial
            : sheetDataCore,
        ],
        range: "A:A",
        majorDimension: "ROWS",
      });
      if (oldUser?.role != rest.role && oldUser?.status == rest.status) {
        deleteOldData = true;
      } else if (oldUser?.status != rest.status) {
        deleteOldData = true;
      }
    }
    if (deleteOldData) {
      await Promise.all(
        oldSheet.values.map(async (row: any, index1: number) => {
          if (
            row[oldUser?.role == USERROLE.TRIAL_CANDIDATE ? 1 : 0] ===
            `${rest.username}${rest.password}`
          ) {
            await sheetSDK.deleteRowOrColumn({
              spreadsheetId,
              targetId:
                oldUser?.status === "ACTIVE"
                  ? oldUser?.role == USERROLE.TRIAL_CANDIDATE
                    ? sheetMap.Trial
                    : sheetMap.CoreTeam
                  : sheetMap.Archive,
              majorDimension: "ROWS",
              indexes: [index1],
            });
          }
        })
      );
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
