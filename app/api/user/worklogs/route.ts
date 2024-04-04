import { prisma } from "@/prisma/prisma";
import { USERROLE, USERTYPE } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId") as string;
  const logType = request.nextUrl.searchParams.get("logType") as string;
  const date = request.nextUrl.searchParams.get("date") as string;

  //let error_response: any;
  //console.log("fetching zeros on server", userId, config);
  try {
    //console.log("fetching user on server", id, userType, role);
    const _workLogs = await prisma.workLogs.findMany({
      where: {
        ...(userId && { userId }),
        ...(logType && { logType }),
        ...(date && { date }),
      },
    });

    let json_response = {
      status: "success",
      data: {
        workLogs: _workLogs,
      },
    };

    return NextResponse.json(json_response);
  } catch (e) {
    console.log(e);
    return new NextResponse(JSON.stringify(e), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...rest } = await request.json();

    //console.log("updating worklogs on server", id, rest);
    let workLogs;
    if (id && id.length > 2)
      workLogs = await prisma.workLogs.upsert({
        where: {
          id,
        },
        create: { ...rest },
        update: { ...rest },
      });
    else
      workLogs = await prisma.workLogs.create({
        data: { ...rest },
      });

    let json_response = {
      status: "success",
      data: {
        workLogs,
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
