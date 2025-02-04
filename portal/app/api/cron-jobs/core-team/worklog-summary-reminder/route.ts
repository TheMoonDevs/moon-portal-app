import { prisma } from "@/prisma/prisma";
import { NextResponse, NextRequest } from "next/server";


export async function GET(request: NextRequest) {
  try {
    const jsonResponse = {
      status: "success",
      message: "Reminders Sent!",
    };

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Error fetching CORETEAM users:", error);
    return new NextResponse(
      JSON.stringify({ status: "error", message: "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
