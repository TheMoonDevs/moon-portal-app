import { prisma } from "@/prisma/prisma";
import {
  PrismaClient,
  TRANSACTIONCATEGORY,
  TRANSACTIONSTATUS,
  TRANSACTIONTYPE,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, res: NextResponse) {
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: "body not found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (
    req.headers.get("Authorization") !==
    `Bearer ${process.env.NEXT_PUBLIC_PAYZONE_API_KEY}`
  ) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.text();
  const { userId } = JSON.parse(body);
  // console.log("req.body",req.body);

  try {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });
    const user_data = {
      email: user?.email,
      name: user?.name,
      userType: user?.userType,
      avatar: user?.avatar,
      role: user?.role,
    };
    console.log("user_data", user_data, user);
    const newTransaction = await prisma.payTransactions.create({
      data: {
        userId,
        user: user_data,
        txStatus: TRANSACTIONSTATUS.DONE,
        txType: TRANSACTIONTYPE.FIAT,
        txCategory: TRANSACTIONCATEGORY.STIPEND,
        amount: (user?.payData as any).stipendAmount,
      },
    });

    return new NextResponse(JSON.stringify(newTransaction), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error creating PayTransaction:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
