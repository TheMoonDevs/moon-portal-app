import { prisma } from "@/prisma/prisma";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const userEmail = request.nextUrl.searchParams.get("email") as string;
  // console.log(userEmail);

  try {
    // console.log("HERE IAM");
    
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        email: userEmail,
      },
      // include: {
      //   payTransactions: true, // Include payTransactions records
      // },
    });
    // console.log(user);

    if (!user) {
      return new NextResponse(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const jsonResponse = {
      status: "success",
      data: {
        user,
      },
    };

    return new NextResponse(JSON.stringify(jsonResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // console.log(error);
    return new NextResponse(JSON.stringify({ error }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("id") as string;
  const body = await request.text();
  const updatedData = JSON.parse(body || "");

  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return new NextResponse(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: updatedData,
    });

    const jsonResponse = {
      status: "success",
      data: {
        user: updatedUser,
      },
    };

    return new NextResponse(JSON.stringify(jsonResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.log(error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
