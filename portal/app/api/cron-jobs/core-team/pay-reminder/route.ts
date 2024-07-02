import { prisma } from "@/prisma/prisma";
import { SlackBotSdk } from '@/utils/services/slackBotSdk';
import { JsonObject } from '@prisma/client/runtime/library';
import { NextResponse, NextRequest } from "next/server";

function calculateCompletedMonths(joiningDate: string) {
  const joinDate = new Date(joiningDate);
  const currentDate = new Date();

  const yearsDifference = currentDate.getFullYear() - joinDate.getFullYear();
  const monthsDifference = currentDate.getMonth() - joinDate.getMonth();
  const totalMonths = yearsDifference * 12 + monthsDifference;

  if (currentDate.getDate() < joinDate.getDate()) {
    return totalMonths - 1;
  }

  return totalMonths;
}

export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: "CORETEAM",
        status: "ACTIVE",
      },
    });

    const subhakarSlackId = 'U01H8NTAZD3';
    const today = new Date();
    const todayDate = today.getDate();

    const filteredUsers = users.filter(user => {
      const joiningDate = (user.workData as JsonObject)?.joining;
      if (!joiningDate) return false;

      const joinDate = new Date(joiningDate as string);
      return joinDate.getDate() === todayDate;
    });

    const usersWithMonths = filteredUsers.map(user => {
      const { workData, id, name, slackId, payData } = user;
      const joiningDate = (workData as JsonObject)?.joining;
      const completedMonths = calculateCompletedMonths(joiningDate as string);

      return {
        id,
        name,
        completedMonths,
        slackId,
        upiId: (payData as JsonObject)?.upiId as string || ''
      };
    });

    const msgBlock = usersWithMonths.map(user => {
      const upiText = user.upiId ? ` It's time to pay them through UPI - ${user.upiId}` : " It's time to pay them.";
      return {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Hey <@${subhakarSlackId}>! ${user.slackId ? `<@${user.slackId}>` : user.name
            } has just completed ${user.completedMonths} months with us.${upiText}`,
        },
      };
    });

    const slackBot = new SlackBotSdk();

    await slackBot.sendSlackMessageviaAPI({
      blocks: msgBlock,
      channel: 'C07A8AU5UKB',
    });

    const jsonResponse = {
      status: "success",
      message: 'Reminder sent to Subhakar!',
    };

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Error fetching CORETEAM users:", error);
    return new NextResponse(JSON.stringify({ status: "error", message: 'Internal Server Error' }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
