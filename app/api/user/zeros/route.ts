import { prisma } from "@/prisma/prisma";
import { USERROLE, USERTYPE } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId") as string;
  const config = request.nextUrl.searchParams.get("config") as string;
  const year = request.nextUrl.searchParams.get("year") as string;

  //let error_response: any;
  //console.log("fetching zeros on server", userId, config);
  try {
    //console.log("fetching user on server", id, userType, role);
    const _zeroRecords = await prisma.zeroRecords.findMany({
      where: {
        ...(userId && { userId }),
        ...(config && { config }),
        ...(year && { year }),
      },
    });

    let json_response = {
      status: "success",
      data: {
        zeroRecords: _zeroRecords,
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

    console.log("updating zeros on server", id, rest);
    let zeroRecords;
    if (id)
      zeroRecords = await prisma.zeroRecords.upsert({
        where: {
          id,
        },
        create: { ...rest },
        update: { ...rest },
      });
    else
      zeroRecords = await prisma.zeroRecords.create({
        data: { ...rest },
      });

    let json_response = {
      status: "success",
      data: {
        zeroRecords,
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
