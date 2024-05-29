import { prisma } from "@/prisma/prisma";
import { USERROLE, USERSTATUS, USERTYPE, USERVERTICAL } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // const role = request.nextUrl.searchParams.get("role") as USERROLE;
  const role = request.nextUrl.searchParams.get("role") as USERROLE;
  const userType = request.nextUrl.searchParams.get("userType") as USERTYPE;
  const status = request.nextUrl.searchParams.get("status") as USERSTATUS;
  const vertical = request.nextUrl.searchParams.get("vertical") as USERVERTICAL;

  let error_response: any;

  try {
    //console.log("fetching user on server", id, userType, role);
    const user = await prisma.user.findMany({
      where: {
        ...(role && { role }),
        ...(userType && { userType }),
        ...(status && { status }),
        ...(vertical && { vertical }),
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
