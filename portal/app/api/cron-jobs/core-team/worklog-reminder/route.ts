import { prisma } from "@/prisma/prisma";
import {
  SlackBotSdk,
} from "@/utils/services/slackBotSdk";
import dayjs from "dayjs";
import { NextResponse, NextRequest } from "next/server";
import { getMissedLogs } from "@/components/screens/Worklogs/WorklogBreakdown/BreakdownMetrics";

const slackBot = new SlackBotSdk();

function isWeekend(day: dayjs.Dayjs): boolean {
  const dayOfWeek = day.day();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function getConsecutiveMissedDays(missedDays: dayjs.Dayjs[], minSequence: number) {
  if (missedDays.length === 0) return [];

  let streak = 0;
  let lastDay: dayjs.Dayjs = missedDays[0];
  const sequences: dayjs.Dayjs[][] = [];

  for (let i = 1; i < missedDays.length; i++) {
    const day = missedDays[i];
    const daysDiff = day.diff(lastDay, 'day');

    if (daysDiff === 1 || (daysDiff === 3 && isWeekend(lastDay) && !isWeekend(day))) {
      streak++;
    } else {
      if (streak + 1 >= minSequence) {
        sequences.push(missedDays.slice(i - streak - 1, i));
      }
      streak = 0;
    }
    lastDay = day;
  }

  if (streak + 1 >= minSequence) {
    sequences.push(missedDays.slice(missedDays.length - streak - 1));
  }

  return sequences;
}

function isWorklogEmpty(workLogs: any[]): boolean {
  return workLogs.every(workLog => workLog.content.trim() === '*');
}

export async function GET(request: NextRequest) {
  try {
    const startOfMonth = dayjs().startOf('month');
    const endOfMonth = dayjs().endOf('month');
    let title, description;

    const users = await prisma.user.findMany({
      where: {
        userType: "MEMBER",
        role: "CORETEAM",
        status: "ACTIVE",
        id: "6617afcef8b582365497c198"  //remove and add your user id for testing
      },
    });

    const usersWithWorkLogs = await Promise.all(
      users.map(async (user) => {
        const workLogs = await prisma.workLogs.findMany({
          where: {
            userId: user.id,
            date: {
              gte: startOfMonth.toISOString(),
              lte: endOfMonth.toISOString(),
            },
          },
        });

        const nonEmptyWorkLogs = workLogs.filter(workLog => !isWorklogEmpty(workLog.works));
        const missedDays = getMissedLogs(nonEmptyWorkLogs, true);
        const missedDaysDayjs = missedDays.map(date => dayjs(date)).filter(date => !isWeekend(date));

        return {
          user,
          slackId: user.slackId,
          // workLogs, //remove
          missedDays: missedDaysDayjs
        };
      })
    );

    for (const user of usersWithWorkLogs) {
      const missedSequences = getConsecutiveMissedDays(user.missedDays, 3);

      for (const sequence of missedSequences) {
        const startDay = sequence[0].format('DD');
        const endDay = sequence[sequence.length - 1].format('DD');
        title = `Missed Worklog Reminder`;
        description = `Hello @${user.user.name}!, You missed logging work for ${sequence.length} consecutive working days: ${startDay}${startDay !== endDay ? ` - ${endDay}` : ''}. Please update your logs.`;

        await prisma.notification.create({
          data: {
            // userId: user.user.id, uncomment this for prod
            userId: "6617afcef8b582365497c198", //remove and add your user id for testing
            title,
            description,
            notificationType: "SELF_GENERATED",
          },
        });

        await slackBot.sendSlackMessageviaAPI({
          text: `Hello <@${user?.slackId}>!, You missed logging work for ${sequence.length} consecutive working days: ${startDay}${startDay !== endDay ? ` - ${endDay}` : ''}. Please update your logs.`,
          // channel: user?.slackId ?? undefined, // uncomment this for prod
          channel: "U06SUSLLBPS", //remove and add your user id for testing
        });
      }
    }

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
