// import GoogleSheetsAPI from "@/utils/services/googleSheetSdk";
import type { HOUSEID, USERROLE, USERTYPE } from '@db/client';
import { USERSTATUS } from '@db/client';
import dayjs from 'dayjs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { checkPermission, enforcePermission } from '@/lib/permissions/server';
import {
  ADMIN_EMAIL,
  passcodeEmailTemplate,
  POST_EMAIL_API,
} from '@/utils/helpers/emailTemplates';

// const sheetConfig = {
//   clientEmail: process.env.GIAM_CLIENT_EMAIL || "",
//   privateKey: process.env.GIAM_PRIVATE_KEY || "",
// };

// const sheetSDK = new GoogleSheetsAPI(sheetConfig);

export async function GET(request: NextRequest) {
  const denied = await enforcePermission('users:read');
  if (denied) return denied;

  const id = request.nextUrl.searchParams.get('id') as string;
  const userType = request.nextUrl.searchParams.get('userType') as USERTYPE;
  const role = request.nextUrl.searchParams.get('role') as USERROLE;
  const house = request.nextUrl.searchParams.get('house') as HOUSEID;
  const status = request.nextUrl.searchParams.get('status');
  const month = request.nextUrl.searchParams.get('month');
  const currentMonth = month ?? dayjs().format('MMMM');
  const cache = request.nextUrl.searchParams.get('cache');

  let error_response: any;

  try {
    const user = await db.user.findMany({
      where: {
        ...(id && { id }),
        ...(userType && { userType }),
        ...(role && { role }),
        ...(house && { house }),
        // skip status filter when fetching a specific user by id
        ...(!id && {
          status: status ? (status as USERSTATUS) : USERSTATUS.ACTIVE,
        }),
        ...(id && status && { status: status as USERSTATUS }),
      },
      include: {
        ...(month && {
          buffBadge: {
            where: {
              month: currentMonth,
            },
          },
        }),
      },
    });

    // console.log(user);

    if (error_response) {
      return new NextResponse(JSON.stringify(error_response), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const json_response = {
      status: 'success',
      data: {
        user,
      },
    };

    const response = NextResponse.json(json_response);

    if (cache) {
      response.headers.set(
        'Cache-Control',
        'public, max-age=600, stale-while-revalidate=59',
      );
    }

    return response;
  } catch (e) {
    console.log(e);
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// DATA is restricted to created from onboarding page or admin page (ONLY)
export async function POST(request: Request) {
  const denied = await enforcePermission('users:create');
  if (denied) return denied;

  try {
    const { id, ...rest } = await request.json();
    const user = await db.user.create({
      data: {
        ...rest,
      },
    });

    const response = await fetch(POST_EMAIL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: rest.email,
        sender: ADMIN_EMAIL,
        subject: 'Your Passcode for The Moon Devs Portal',
        body: passcodeEmailTemplate(
          rest.name,
          `${rest.username} - ${rest.password}`,
        ),
        displayName: 'The Moon Devs',
      }),
    });
    console.log('Email sent successfully:', await response.json());
    if (!response.ok) {
      return new NextResponse(
        JSON.stringify({ error: 'Failed to send Passcode email' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    // const currentDate = new Date()
    //   .toLocaleDateString("en-GB")
    //   .split("/")
    //   .reverse()
    //   .join("-");

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
    //         rest.workData?.joining ? rest.workData.joining : currentDate,
    //         rest.personalData?.workHourOverlap,
    //         rest.personalData?.address,
    //         rest.personalData.govtId ? rest.personalData.govtId : "---",
    //         rest.payData?.upiId,
    //       ]
    //     : [
    //         `${rest.username}${rest.password}`,
    //         rest.name,
    //         rest.email,
    //         rest.personalData.phone,
    //         rest.payData.upiId,
    //         `=(YEAR(NOW())-YEAR(INDIRECT("G" & ROW())))`,
    //         rest.personalData.dateOfBirth,
    //         rest.personalData.city,
    //         rest.vertical,
    //         rest.workData.positionInternal,
    //         rest.personalData.workHourOverlap,
    //         rest.workData.workHours,
    //         currentDate,
    //         "---", //office email
    //         rest.personalData.address,
    //       ];

    // await sheetSDK.appendSheetData({
    //   spreadsheetId,
    //   targetId:
    //     rest.role == USERROLE.TRIAL_CANDIDATE
    //       ? sheetMap.Trial
    //       : sheetMap.CoreTeam,
    //   values: [sheetData],
    //   range: "A:A",
    //   majorDimension: "ROWS",
    // });
    const json_response = {
      status: 'success',
      data: {
        user,
      },
    };

    return NextResponse.json(json_response);
  } catch (e) {
    return new NextResponse(JSON.stringify(e), {
      status: 500,
      statusText: JSON.stringify(e),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...rest } = await request.json();

    // Owner-scoped: a user may edit their own record; editing anyone else's
    // requires `users:edit`.
    const {
      user: actor,
      allowed,
      response,
    } = await checkPermission('users:edit');
    const isSelf = !!actor && !!id && actor.id === id;
    if (!allowed && !isSelf && response) {
      return response;
    }

    // Privilege-escalation guard: only full admins may change access-control
    // fields through this generic endpoint. Policies are managed via
    // /api/user/permissions. (When there is no session — internal/service
    // call — `actor` is null and we leave the payload untouched.)
    if (actor && !actor.isAdmin) {
      delete (rest as Record<string, unknown>).permissions;
      delete (rest as Record<string, unknown>).deniedPermissions;
      delete (rest as Record<string, unknown>).isAdmin;
    }

    const oldUser = await db.user.findFirst({
      where: {
        id,
      },
    });

    if (
      rest.updatedAt &&
      oldUser?.updatedAt &&
      new Date(rest.updatedAt) < new Date(oldUser.updatedAt)
    ) {
      return new NextResponse(
        JSON.stringify({ error: 'User Data is outdated', latestUser: oldUser }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    // console.log("old user", oldUser);
    // console.log("rest ", rest);
    const user = await db.user.update({
      where: {
        id,
      },
      data: { ...rest, updatedAt: new Date() },
    });
    // const currentDate = new Date()
    //   .toLocaleDateString("en-GB")
    //   .split("/")
    //   .reverse()
    //   .join("-");
    // const sheetDataTrial = [
    //   "=NOW()",
    //   `${rest.username}${rest.password}`,
    //   rest.name,
    //   rest.email,
    //   rest.personalData?.phone,
    //   rest.personalData?.dateOfBirth,
    //   rest.personalData?.city,
    //   rest.workData?.positionInternal,
    //   rest.workData?.joining ? rest.workData.joining : currentDate,
    //   rest.personalData?.workHourOverlap,
    //   rest.personalData?.address,
    //   rest.personalData?.govtId ? rest.personalData.govtId : "---",
    //   rest.payData?.upiId,
    // ];
    // const sheetDataCore = [
    //   `${rest.username}${rest.password}`,
    //   rest.name,
    //   rest.email,
    //   rest.personalData?.phone,
    //   rest.payData?.upiId,
    //   `=(YEAR(NOW())-YEAR(INDIRECT("G" & ROW())))`,
    //   rest.personalData?.dateOfBirth,
    //   rest.vertical,
    //   rest.personalData?.city,
    //   rest.workData?.positionInternal,
    //   rest.personalData?.workHourOverlap,
    //   rest.workData?.workHours,
    //   rest.workData?.joining ? rest.workData.joining : currentDate,
    //   "---", //office email
    //   rest.personalData?.address,
    // ];
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

    // const newSheet = await sheetSDK.getSheetData({
    //   spreadsheetId,
    //   targetId:
    //     rest.status === "ACTIVE"
    //       ? rest.role == USERROLE.TRIAL_CANDIDATE
    //         ? sheetMap.Trial
    //         : sheetMap.CoreTeam
    //       : sheetMap.Archive,
    //   range: "A:Z",
    //   majorDimension: "ROWS",
    // });
    // const oldSheet = await sheetSDK.getSheetData({
    //   spreadsheetId,
    //   targetId:
    //     oldUser?.status === "ACTIVE"
    //       ? oldUser?.role == USERROLE.TRIAL_CANDIDATE
    //         ? sheetMap.Trial
    //         : sheetMap.CoreTeam
    //       : sheetMap.Archive,
    //   range: "A:Z",
    //   majorDimension: "ROWS",
    // });
    // let isSheetDataUpdated = false;
    // let deleteOldData = false;
    // await Promise.all(
    //   newSheet.values.map(async (row: any, index: number) => {
    //     if (
    //       row[rest.role == USERROLE.TRIAL_CANDIDATE ? 1 : 0] ===
    //       `${rest.username}${rest.password}`
    //     ) {
    //       if (oldUser?.role == rest.role && oldUser?.status == rest.status) {
    //         await sheetSDK.updateSheetData({
    //           spreadsheetId,
    //           targetId:
    //             rest.role == USERROLE.TRIAL_CANDIDATE
    //               ? sheetMap.Trial
    //               : sheetMap.CoreTeam,
    //           values: [
    //             oldUser?.role == USERROLE.TRIAL_CANDIDATE
    //               ? sheetDataTrial
    //               : sheetDataCore,
    //           ],
    //           range: `A${index + 1}`,
    //           majorDimension: "ROWS",
    //         });
    //       } else if (
    //         oldUser?.role != rest.role &&
    //         oldUser?.status == rest.status
    //       ) {
    //         await sheetSDK.updateSheetData({
    //           spreadsheetId,
    //           targetId:
    //             rest.role == USERROLE.TRIAL_CANDIDATE
    //               ? sheetMap.Trial
    //               : sheetMap.CoreTeam,
    //           values: [
    //             rest.role == USERROLE.TRIAL_CANDIDATE
    //               ? sheetDataTrial
    //               : sheetDataCore,
    //           ],
    //           range: `A${index + 1}`,
    //           majorDimension: "ROWS",
    //         });
    //         deleteOldData = true;
    //       }
    //       isSheetDataUpdated = true;
    //     }
    //   })
    // );

    // if (!isSheetDataUpdated) {
    //   await sheetSDK.appendSheetData({
    //     spreadsheetId,
    //     targetId:
    //       rest.status === "ACTIVE"
    //         ? rest.role == USERROLE.TRIAL_CANDIDATE
    //           ? sheetMap.Trial
    //           : sheetMap.CoreTeam
    //         : sheetMap.Archive,
    //     values: [
    //       rest.role == USERROLE.TRIAL_CANDIDATE
    //         ? sheetDataTrial
    //         : sheetDataCore,
    //     ],
    //     range: "A:A",
    //     majorDimension: "ROWS",
    //   });
    //   if (oldUser?.role != rest.role && oldUser?.status == rest.status) {
    //     deleteOldData = true;
    //   } else if (oldUser?.status != rest.status) {
    //     deleteOldData = true;
    //   }
    // }
    // if (deleteOldData) {
    //   await Promise.all(
    //     oldSheet.values.map(async (row: any, index1: number) => {
    //       if (
    //         row[oldUser?.role == USERROLE.TRIAL_CANDIDATE ? 1 : 0] ===
    //         `${rest.username}${rest.password}`
    //       ) {
    //         await sheetSDK.deleteRowOrColumn({
    //           spreadsheetId,
    //           targetId:
    //             oldUser?.status === "ACTIVE"
    //               ? oldUser?.role == USERROLE.TRIAL_CANDIDATE
    //                 ? sheetMap.Trial
    //                 : sheetMap.CoreTeam
    //               : sheetMap.Archive,
    //           majorDimension: "ROWS",
    //           indexes: [index1],
    //         });
    //       }
    //     })
    //   );
    // }
    const json_response = {
      status: 'success',
      data: {
        user,
      },
    };

    return NextResponse.json(json_response);
  } catch (e) {
    console.log('error', e);
    return new NextResponse(JSON.stringify(e), {
      status: 500,
      statusText: JSON.stringify(e),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
