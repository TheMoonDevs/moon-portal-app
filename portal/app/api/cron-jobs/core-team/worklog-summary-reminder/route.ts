export const dynamic = "force-dynamic"; // static by default, unless reading the request
import { prisma } from "@/prisma/prisma";
import { User } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";
import { formatISO, startOfDay, subDays } from "date-fns";
import { APP_BASE_URL } from "../../../../../utils/constants/appInfo";
import { SlackBotSdk, SlackChannels } from "@/utils/services/slackBotSdk";
export const revalidate = 0;

//comments are added for better understanding 
const generateMessages = (usersWithWorkLogs: any[]) => {
  const messageParts = ["Good morning team!\n"];

  usersWithWorkLogs.forEach((user) => {
    const {
      userName,
      user: userId,
      totalTasksYesterDay,
      incompleteTasksYesterday,
      completedTasksYesterday,
      totalTasksToday,
      slackId
    } = user;

    const userSummaryLink =
      totalTasksYesterDay > 0 || totalTasksToday > 0
        ? ` - <${APP_BASE_URL}/user/worklogs/summary/${userId}|link>`
        : "";

    let message = `• ${slackId ? `<@${slackId}>` : userName}`;

    // Edge case when no tasks were logged for both yesterday and today
    if (totalTasksYesterDay === 0 && totalTasksToday === 0) {
      message += " has no tasks logged for yesterday and today.🙅‍♂️";
    } else if (incompleteTasksYesterday === totalTasksYesterDay && totalTasksToday === 0) {
      // If all tasks were incomplete yesterday and no tasks planned today
      message += ` had ${incompleteTasksYesterday} unfinished tasks since yesterday 🙅‍♂️`;
    } else if (totalTasksYesterDay > 0 && completedTasksYesterday === totalTasksYesterDay && totalTasksToday === 0) {
      // If all tasks were completed yesterday and no tasks planned today
      message += ` has finished all tasks (${totalTasksYesterDay}) yesterday 🚀 ${userSummaryLink}`;
    } else if (totalTasksYesterDay > 0 && completedTasksYesterday === totalTasksYesterDay && totalTasksToday > 0) {
      // If all tasks were completed yesterday and tasks are planned for today
      message += ` has finished all tasks (${totalTasksYesterDay}) yesterday 🚀 & planned out ${totalTasksToday} tasks for today 🎯${userSummaryLink}`;
    } else if (completedTasksYesterday > 0 && incompleteTasksYesterday > 0 && totalTasksToday > 0) {
      // If there were both completed and incomplete tasks yesterday, and tasks planned for today
      message += ` had finished ${completedTasksYesterday} task${completedTasksYesterday > 1 ? "s" : ""} yesterday ✅, but left ${incompleteTasksYesterday} unfinished 😢. & planned out ${totalTasksToday} tasks for today 🎯${userSummaryLink}`;
    } else if (completedTasksYesterday > 0 && incompleteTasksYesterday > 0 && totalTasksToday === 0) {
      // If there were both completed and incomplete tasks yesterday, and no tasks planned today
      message += ` had finished ${completedTasksYesterday} task${completedTasksYesterday > 1 ? "s" : ""} yesterday ✅, but left ${incompleteTasksYesterday} unfinished 😢`;
    } else if (incompleteTasksYesterday > 0 && totalTasksToday === 0) {
      // If there were only incomplete tasks from yesterday and no tasks planned today
      message += ` had ${incompleteTasksYesterday} unfinished tasks since yesterday 🙅‍♂️`;
    } else if (completedTasksYesterday > 0 && totalTasksToday === 0) {
      // If tasks were completed yesterday but no tasks planned today
      message += ` had ${completedTasksYesterday} task${completedTasksYesterday > 1 ? "s" : ""} finished yesterday ✅, but has no tasks planned for today.`;
    } else if (totalTasksYesterDay === 0 && totalTasksToday > 0) {
      // If no tasks were logged yesterday but tasks are planned for today
      message += ` has no tasks logged yesterday or was on leave🫥, but has ${totalTasksToday} tasks planned for today 🎯${userSummaryLink}`;
    } else {
      message += ` has ${incompleteTasksYesterday} unfinished tasks since yesterday😢  and ${totalTasksToday} tasks planned for today 🎯${userSummaryLink}`;
    }

    messageParts.push(message);
  });

  return messageParts.join("\n");
};

const getStatsOfContent = (content: string) => {
  const checks = (content?.match(/✅/g) || []).length;
  const points = (content?.match(/\n/g) || []).length + 1;
  return { checks, points };
};

const slackBot = new SlackBotSdk();

const isWeekend = (date: Date) => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sun -0 & Sat -6
};

export async function GET(request: NextRequest) {
  try {
    const today = formatISO(startOfDay(new Date())).split('T')[0];
    const yesterday = formatISO(startOfDay(subDays(new Date(), 1))).split('T')[0];
    const yesterdayDate = subDays(new Date(), 1);
    const isYesterdayWeekend = isWeekend(yesterdayDate);

    const users = await prisma.user.findMany({
      where: {
        userType: "MEMBER",
        role: "CORETEAM",
        status: "ACTIVE",
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
          slackId: user.slackId,
          totalTasksYesterDay: totalTasksYesterday,
          incompleteTasksYesterday: incompleteTasksYesterday,
          completedTasksYesterday: completedTasksYesterday,
          totalTasksToday: totalTasksToday
        };
      })
    );


    const filteredUsersWithWorkLogs = usersWithWorkLogs.filter((user) => {
      if (isYesterdayWeekend) {
        return user.totalTasksYesterDay > 0;
      }
      return true;
    });


    if (filteredUsersWithWorkLogs.length > 0) {
      const messages = generateMessages(filteredUsersWithWorkLogs);

      await slackBot.sendSlackMessageviaAPI({
        text: messages,
        channel: SlackChannels.b_coreteam, //change the channel id to Slack channel id where you want to send the message
      });
    }

    const jsonResponse = {
      status: "success",
      message: "Reminders Sent!",
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
