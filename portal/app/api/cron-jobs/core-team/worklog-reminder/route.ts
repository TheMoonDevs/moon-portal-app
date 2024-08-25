import { prisma } from "@/prisma/prisma";
import { SlackBotSdk } from "@/utils/services/slackBotSdk";
import dayjs from "dayjs";
import { NextResponse, NextRequest } from "next/server";
import { getMissedLogs } from "@/components/screens/Worklogs/WorklogBreakdown/BreakdownMetrics";

const slackBot = new SlackBotSdk();

function isWeekend(day: dayjs.Dayjs): boolean {
  const dayOfWeek = day.day();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function getConsecutiveMissedDays(
  missedDays: dayjs.Dayjs[],
  minSequence: number
) {
  if (missedDays.length === 0) return [];

  let streak = 0;
  let lastDay: dayjs.Dayjs = missedDays[0];
  const sequences: dayjs.Dayjs[][] = [];
  let currentSequence: dayjs.Dayjs[] = [lastDay];

  for (let i = 1; i < missedDays.length; i++) {
    const day = missedDays[i];
    const daysDiff = day.diff(lastDay, "day");

    // Check if the current day is consecutive or a Monday following a Friday
    if (
      daysDiff === 1 ||
      (daysDiff === 3 && isWeekend(lastDay) && !isWeekend(day))
    ) {
      currentSequence.push(day);
      streak++;
    } else {
      if (streak + 1 >= minSequence) {
        sequences.push([...currentSequence]);
      }
      streak = 0;
      currentSequence = [day];
    }
    lastDay = day;
  }

  if (streak + 1 >= minSequence) {
    sequences.push([...currentSequence]);
  }

  return sequences;
}

function isWorklogEmpty(workLogs: any[]): boolean {
  return workLogs.every((workLog) => workLog.content.trim() === "*");
}

export async function GET(request: NextRequest) {
  try {
    const startOfMonth = dayjs().startOf("month");
    const endOfMonth = dayjs().endOf("month");

    const users = await prisma.user.findMany({
      where: {
        userType: "MEMBER",
        role: "CORETEAM",
        status: "ACTIVE",
        // id: "665bfefcc58926c7f6935c0c", //remove and add your user id for testing
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

        const nonEmptyWorkLogs = workLogs.filter(
          (workLog) => !isWorklogEmpty(workLog.works)
        );
        const missedDays = getMissedLogs(nonEmptyWorkLogs, true);
        const missedDaysDayjs = missedDays.map((date) => dayjs(date));

        return {
          user,
          slackId: user.slackId,
          missedDays: missedDaysDayjs,
        };
      })
    );

    for (const user of usersWithWorkLogs) {
      // Get missed sequences, excluding today
      const missedSequences = getConsecutiveMissedDays(
        user.missedDays.filter(day => !day.isSame(dayjs(), 'day')),
        2
      );

      console.log(missedSequences.length);
      
    
      if (missedSequences.length > 0) {
        const lastSequence = missedSequences[missedSequences.length - 1].filter(day => !isWeekend(day));
        const lastDayInSequence = lastSequence[lastSequence.length - 1];
        const yesterday = dayjs().subtract(1, 'day');
        console.log(lastSequence, lastDayInSequence, yesterday);
        console.log(lastDayInSequence.isSame(yesterday, 'day'));
        // Check if the last day of the sequence is yesterday (active sequence)
        if (lastDayInSequence.isSame(yesterday, 'day')) {
          const startDay = lastSequence[0].format('DD');
          const endDay = lastDayInSequence.format('DD');
          const title = `Missed Worklog Reminder`;
          const description = `Hello @${user.user.name}, It appears that you have missed your worklogs for ${lastSequence.length} consecutive working days, from ${startDay}${
            startDay !== endDay ? ` to ${endDay}` : ""
          }. Please update your worklogs as soon as possible.`;
          console.log(startDay, endDay);
          
    
          const notification = await prisma.notification.create({
            data: {
              userId: user.user.id, // uncomment this for prod
              // userId: "665bfefcc58926c7f6935c0c", // Remove and add your user id for testing
              title,
              description,
              notificationType: "SELF_GENERATED",
            },
          });
          console.log(notification);
    
          const slack = await slackBot.sendSlackMessageviaAPI({
            text: `Hello <@${user?.slackId}>, It appears that you have missed your worklogs for ${lastSequence.length} consecutive working days, from ${startDay}${
              startDay !== endDay ? ` to ${endDay}` : ""
            }. Please update your worklogs as soon as possible.`,
            channel: user?.slackId ?? undefined, // Uncomment this for prod
            // channel: "U06NE7XFEJU", // Remove and add your user id for testing
          });
          console.log(slack);
          
        }
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
