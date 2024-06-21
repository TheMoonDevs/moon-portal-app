import { prisma } from "@/prisma/prisma";
import { SlackBotSdk } from "@/utils/services/slackBotSdk";
import { USERROLE, USERSTATUS, USERTYPE } from "@prisma/client";
import { JsonObject } from "@prisma/client/runtime/library";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") as string;
  const userType = request.nextUrl.searchParams.get("userType") as USERTYPE;
  const role = request.nextUrl.searchParams.get("role") as USERROLE;

  let error_response: any;

  try {
    //console.log("fetching user on server", id, userType, role);
    const user = await prisma.user.findMany({
      where: {
        ...(id && { id }),
        ...(userType && { userType }),
        ...(role && { role }),
        status: USERSTATUS.ACTIVE,
      },
    });
    const slackBotSdk = new SlackBotSdk();
    const allSlackUsers = await slackBotSdk.getSlackUsers();

    await Promise.all(
      user.map((userData) => {
        try {
          if (
            !userData.thirdPartyData ||
            !(userData.thirdPartyData as JsonObject).slackData
          ) {
            const slackUser = allSlackUsers.find(
              (slackUser:any) => slackUser?.profile?.email === userData?.email
            );
            console.log(slackUser?.profile?.email, userData?.email);
    
            if (slackUser) {
              const newThirdPartyData = {
                ...userData.thirdPartyData as JsonObject,
                slackData: slackUser,
              };
    
              return prisma.user.update({
                where: { id: userData.id },
                data: { thirdPartyData: newThirdPartyData },
              });
            }
          }
        } catch (error:any) {
          console.error(`Error updating user ${userData.id}: ${error.message}`);
        }
      })
    );

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

export async function POST(request: Request) {
  try {
    const { id, ...rest } = await request.json();

    const user = await prisma.user.create({
      data: {
        ...rest,
      },
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

    const user = await prisma.user.upsert({
      where: {
        id,
      },
      create: { ...rest },
      update: { ...rest },
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
