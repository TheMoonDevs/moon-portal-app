import { prisma } from "@/prisma/prisma";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // const role = request.nextUrl.searchParams.get("role") as USERROLE;

  let error_response: any;

  try {
    //console.log("fetching user on server", id, userType, role);
    const user = await prisma.user.findMany({
      where: {
        role: "CORETEAM",
      },
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
    return new NextResponse(JSON.stringify(e), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}
