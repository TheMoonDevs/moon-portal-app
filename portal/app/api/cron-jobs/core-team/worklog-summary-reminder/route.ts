import { prisma } from "@/prisma/prisma";
import { User } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";
import { formatISO, startOfDay, subDays } from "date-fns";


export async function GET(request: NextRequest) {
  try {
    const today = formatISO(startOfDay(new Date()));
    const yesterday = formatISO(startOfDay(subDays(new Date(), 1)));

    const users = await prisma.user.findMany({
      where: {
        userType: "MEMBER",
        role: "CORETEAM",
        status: "ACTIVE",
        // id: "665bfefcc58926c7f6935c0c", //remove and add your user id for testing
      },
    });

    const usersWithWorkLogs = await Promise.all(
      users.map(async (user: User) => {
        const workLogs = await prisma.workLogs.findMany({
          where: {
            userId: user.id,
            date: {
              gte: yesterday.split('T')[0],
              lte: today.split('T')[0],
            },
          },
        });

        return {
          userName: user.name,
          workLogs,
          slackId: user.slackId,
        };
      })
    );

    const jsonResponse = {
      status: "success",
      message: "Reminders Sent!",
      usersWithWorkLogs,
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
