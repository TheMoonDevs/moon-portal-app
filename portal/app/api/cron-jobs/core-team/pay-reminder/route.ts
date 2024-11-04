export const dynamic = "force-dynamic"; // static by default, unless reading the request
import { prisma } from "@/prisma/prisma";
import {
  SlackBotSdk,
  SlackChannels,
  SlackUsers,
} from "@/utils/services/slackBotSdk";
import { JsonObject } from "@prisma/client/runtime/library";
import { NextResponse, NextRequest } from "next/server";

function getUserDuration(joiningDate: string): string | null {
  const joinDate = new Date(joiningDate);
  const currentDate = new Date();

  let yearsDifference = currentDate.getFullYear() - joinDate.getFullYear();
  let monthsDifference = currentDate.getMonth() - joinDate.getMonth();

  if (currentDate.getDate() < joinDate.getDate()) {
    monthsDifference--;
  }
  if (monthsDifference < 0) {
    yearsDifference--;
    monthsDifference += 12;
  }

  const yearText = yearsDifference === 1 ? "year" : "years";
  const monthText = monthsDifference === 1 ? "month" : "months";

  const durationText = `${
    yearsDifference > 0 ? `${yearsDifference} ${yearText} ` : ""
  }${monthsDifference > 0 ? `${monthsDifference} ${monthText}` : ""}`.trim();

  return durationText || "[error in calculating duration]";
}

const slackBot = new SlackBotSdk();

export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      where: {
        userType: "MEMBER",
        role: "CORETEAM",
        status: "ACTIVE",
      },
    });

    const today = new Date();
    const todayDate = today.getDate();

    const filteredUsers = users.filter((user) => {
      const joiningDate = (user.workData as JsonObject)?.joining;
      if (!joiningDate) return false;

      const joinDate = new Date(joiningDate as string);
      if (joinDate.getDate() === todayDate) {
        return true;
      }

      if (todayDate === 1 && new Date(today.getFullYear(), today.getMonth(), 0).getDate() < joinDate.getDate()) {
        return true;
      }

      return false;
    });

    for (const user of filteredUsers) {
      const { workData, name, slackId, payData } = user;

      if (slackId === SlackUsers.subhakar) continue; //edge case for not sending notifications to subhakar

      const joiningDate = (workData as JsonObject)?.joining;
      const userDuration = getUserDuration(joiningDate as string);
      const upiId = ((payData as JsonObject)?.upiId as string) || "";

      const upiText = upiId
        ? ` It's time to pay them through UPI - ${upiId}`
        : " It's time to pay them.";

      const msgBlock = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Hey <@${SlackUsers.subhakar}>! ${
              slackId ? `<@${slackId}>` : name
            } has just completed ${userDuration} with us.${upiText}`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Please confirm if the payment is done.",
          },
        },
        {
          type: "actions",
          block_id: "confirm-payment",
          elements: [
            {
              type: "button",
              action_id: "confirm",
              text: {
                type: "plain_text",
                text: "Yes",
                emoji: true,
              },
              style: "primary",
              value: JSON.stringify({
                slackId: slackId,
                userDuration: userDuration,
              }),
            },
            {
              type: "button",
              action_id: "deny",
              style: "danger",
              text: {
                type: "plain_text",
                text: "No",
                emoji: true,
              },
              value: "no",
            },
          ],
        },
      ];

      await slackBot.sendSlackMessageviaAPI({
        blocks: msgBlock,
        channel: SlackChannels.y_pay_reminders,
      });
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
