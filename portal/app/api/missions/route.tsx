import { prisma } from "@/prisma/prisma";
import GoogleSheetsAPI from "@/utils/services/googleSheetSdk";
import { SlackBotSdk } from "@/utils/services/slackBotSdk";
import { HOUSEID, USERROLE, USERSTATUS, USERTYPE } from "@prisma/client";
import { JsonObject } from "@prisma/client/runtime/library";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const id = request.nextUrl.searchParams.get("id") as string;
    const house = request.nextUrl.searchParams.get("house") as string;
    const month = request.nextUrl.searchParams.get("month") as string;
  
  try {
    //console.log("fetching user on server", id, userType, role);
    const missions = await prisma.mission.findMany({
      where: {
        ...(id && { id }),
        ...(house && { house: house as HOUSEID }),
        ...(month && { month }),
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
    const {id,...rest} = await request.json();
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
    console.log("mission error",e);
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
