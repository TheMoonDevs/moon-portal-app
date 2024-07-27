import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") as string;
  const userId = request.nextUrl.searchParams.get("userId") as string;
  const logType = request.nextUrl.searchParams.get("logType") as string;
  const date = request.nextUrl.searchParams.get("date") as string;
  const month = request.nextUrl.searchParams.get("month") as string;
  const year = request.nextUrl.searchParams.get("year") as string;
  // console.log(userId);
  // console.log(id);
  //let error_response: any;
  //console.log("fetching zeros on server", userId, config);
  try {
    let dateFilter: any = {};
    if (year && month && year !== "null" && month !== "null") {
      dateFilter = {
        startsWith: `${year}-${month}`,
      };
    } else if (year && year !== "null") {
      dateFilter = {
        startsWith: `${year}-`,
      };
    } else if (month && month !== "null") {
      dateFilter = {
        contains: `-${month}-`,
      };
    }

    // console.log(dateFilter);
    //console.log("fetching user on server", id, userType, role);
    const _workLogs = await prisma.workLogs.findMany({
      where: {
        ...(id && { id }),
        ...(userId && { userId }),
        ...(logType && { logType }),
        date: dateFilter,
      },

      orderBy: {
        date: "asc",
      },
    });

    // console.log(_workLogs);

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
