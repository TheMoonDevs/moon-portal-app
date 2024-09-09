import { prisma } from "@/prisma/prisma";
import { HOUSEID } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") as string;
  const house = request.nextUrl.searchParams.get("house") as string;
  const month = request.nextUrl.searchParams.get("month") as string; // YYYY-MM
  const quarter = request.nextUrl.searchParams.get("quarter") as string;
  const year = request.nextUrl.searchParams.get("year") as string;

  let monthFilter: any = {};

  if (month) {
    monthFilter = { month };
  } else if (quarter) {
    const quarterNumber = parseInt(quarter);
    if (isNaN(quarterNumber) || quarterNumber < 1 || quarterNumber > 4) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid quarter format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    const startMonth = ((quarterNumber - 1) * 3 + 1)
      .toString()
      .padStart(2, "0");
    const endMonth = (quarterNumber * 3).toString().padStart(2, "0");

    monthFilter = {
      month: {
        gte: `${year}-${startMonth}`,
        lte: `${year}-${endMonth}`,
      },
    };
  } else if (year) {
    monthFilter = {
      month: {
        gte: `${year}-01`,
        lte: `${year}-12`,
      },
    };
  }

  // let month_filter:any = month ? {month} : {};
  // if(quarter.length> 0 && month.length === 0) {
  //   month_filter = {
  //     lte: `${new Date().getFullYear()}-03`,
  //     gte: `${new Date().getFullYear()}-01`
  //   }
  // }

  try {
    //console.log("fetching user on server", id, userType, role);
    const missions = await prisma.mission.findMany({
      where: {
        ...(id && { id }),
        ...(house && { house: house as HOUSEID }),
        ...monthFilter,
      },
    });

    let json_response = {
      status: "success",
      data: {
        missions: missions,
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

export async function POST(request: NextRequest) {
  try {
    const { id, ...rest } = await request.json();
    console.log("rest", rest);

    const mission = await prisma.mission.create({
      data: {
        ...rest,
      },
    });

    //console.log("user", mission);

    let json_response = {
      status: "success",
      data: {
        mission,
      },
    };

    return NextResponse.json(json_response);
  } catch (e) {
    console.log("mission error", e);
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...rest } = await request.json();

    const mission = await prisma.mission.upsert({
      where: {
        id,
      },
      create: { ...rest },
      update: { ...rest },
    });

    let json_response = {
      status: "success",
      data: {
        mission,
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

export async function DELETE(request: Request) {
  try {
    const { id, ...rest } = await request.json();

    const mission = await prisma.mission.delete({
      where: {
        id,
      },
    });

    let json_response = {
      status: "success",
      data: {
        mission,
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
