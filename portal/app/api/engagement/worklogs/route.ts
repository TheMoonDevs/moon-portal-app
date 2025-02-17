import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") as string;
  const userId = request.nextUrl.searchParams.get("userId") as string;
  const logType = request.nextUrl.searchParams.get("logType") as string;
  const startDate = request.nextUrl.searchParams.get("startDate") as string;
  const endDate = request.nextUrl.searchParams.get("endDate") as string;
  const date = request.nextUrl.searchParams.get("date") as string;
  const engagementId = request.nextUrl.searchParams.get("engagementId") as string;

  try {
    const _workLogs = await prisma.workLogs.findMany({
      where: {
        ...(id && { id }),
        ...(userId && { userId }),
        ...(logType && { logType }),
        ...(date && { date }),
        ...(startDate && { date: { gte: startDate } }),
        ...(endDate && { date: { lte: endDate } }),
        ...(startDate && endDate ? { date: { gte: startDate, lte: endDate } } : {}),
      },
      orderBy: {
        date: "desc",
      }
    });

    let filteredLogs = [];
    for (let i = 0; i < _workLogs.length; i++) {
      const worklog = _workLogs[i];
      const works = [];
      for (let j = 0; j < worklog.works.length; j++) {
        const work: any = worklog.works[j];
        if (work && work?.link_type === "engagement" && work?.link_id === engagementId) {
          works.push(work);
        }
      }
      if (works.length > 0) {
        filteredLogs.push({
          ...worklog,
          works
        });
      }
    }


    let json_response = {
      status: "success",
      data: {
        workLogs: filteredLogs,
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