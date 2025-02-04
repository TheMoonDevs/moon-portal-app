import { prisma } from "@/prisma/prisma";
import { User } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";
import { formatISO, startOfDay, subDays } from "date-fns";

const getStatsOfContent = (content: string) => {
  const checks = (content?.match(/✅/g) || []).length;
  const points = (content?.match(/\n/g) || []).length + 1;
  return { checks, points };
};

export async function GET(request: NextRequest) {
  try {
    const today = formatISO(startOfDay(new Date())).split('T')[0];
    const yesterday = formatISO(startOfDay(subDays(new Date(), 1))).split('T')[0];

    const users = await prisma.user.findMany({
      where: {
        userType: "MEMBER",
        role: "CORETEAM",
        status: "ACTIVE",
        id: "6617afcef8b582365497c198", //remove and add your user id for testing
      },
    });

    const usersWithWorkLogs = await Promise.all(
      users.map(async (user: User) => {
        const workLogs = await prisma.workLogs.findMany({
          where: {
            userId: user.id,
            date: {
              gte: yesterday,
              lte: today
            },
          },
        });

        let totalTasksYesterday = 0;
        let completedTasksYesterday = 0;
        let totalTasksToday = 0;

        workLogs.forEach((log) => {
          const markdownData = log?.works[0];
          if (markdownData && typeof markdownData === 'object' && 'content' in markdownData) {
            const content = markdownData.content as string;
            const nonEmptyContent = content.split('\n').filter(line => line.trim() !== '*' && line.trim() !== '').join('\n');

            if (nonEmptyContent.trim()) {
              const { checks, points } = getStatsOfContent(nonEmptyContent);
              if (log.date === yesterday) {
                totalTasksYesterday += points;
                completedTasksYesterday += checks;
              } else if (log.date === today) {
                totalTasksToday += points;
              }
            }
          }
        });


        let incompleteTasksYesterday = totalTasksYesterday - completedTasksYesterday;

        return {
          userName: user.name,
          user: user.id,
          // workLogs,
          // slackId: user.slackId,
          totalTasksYesterDay: totalTasksYesterday,
          incompleteTasksYesterday: incompleteTasksYesterday,
          completedTasksYesterday: completedTasksYesterday,
          totalTasksToday: totalTasksToday
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
    console.error("Something went wrong", error);
    return new NextResponse(
      JSON.stringify({ status: "error", message: "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
