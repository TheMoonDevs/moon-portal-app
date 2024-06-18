import { prisma } from "@/prisma/prisma";
import {
  PrismaClient,
  TRANSACTIONCATEGORY,
  TRANSACTIONSTATUS,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, res: NextResponse) {
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: "body not found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.text();
  const { userId, txStatus, txType, txCategory, amount, burnTxHash } =
    JSON.parse(body);
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
    const newTransaction = await prisma.payTransactions.create({
      data: {
        userId,
        user: user_data,
        txStatus,
        txType,
        txCategory,
        amount,
        burnTxHash,
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

export async function PUT(req: NextRequest, res: NextResponse) {
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: "body not found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.text();
  const { id, userId, txStatus, txType, txCategory, amount, burnTxHash } =
    JSON.parse(body);
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
    const newTransaction = await prisma.payTransactions.update({
      where: {
        id,
      },
      data: {
        userId,
        user: user_data,
        txStatus,
        txType,
        txCategory,
        amount,
        burnTxHash,
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

// to update txStatus of a particular transaction
export async function PATCH(req: NextRequest, res: NextResponse) {
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: "body not found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.text();
  const { id, txStatus } = JSON.parse(body);

  try {
    const updatedTransaction = await prisma.payTransactions.update({
      where: { id: id },
      data: {
        txStatus,
      },
    });

    return new NextResponse(JSON.stringify(updatedTransaction), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error updating PayTransaction:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    // console.log("HERE IAM");

    const userId = request.nextUrl.searchParams.get("userId") as string;
    const txStatus = request.nextUrl.searchParams.get(
      "txStatus"
    ) as TRANSACTIONSTATUS;
    const txCategory = request.nextUrl.searchParams.get(
      "txCategory"
    ) as TRANSACTIONCATEGORY;

    const transactions = await prisma.payTransactions.findMany({
      where: {
        ...(userId && { userId }),
        ...(txStatus && { txStatus }),
        ...(txCategory && { txCategory }),
      },
      // include: {
      //   user: true, // Include user data
      // },
    });
    // console.log(user);

    if (!transactions) {
      return new NextResponse(
        JSON.stringify({ error: "transactions not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const jsonResponse = {
      status: "success",
      data: {
        transactions,
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
