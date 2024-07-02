import { prisma } from "@/prisma/prisma";
import { SlackBotSdk } from "@/utils/services/slackBotSdk";
import { JsonObject } from "@prisma/client/runtime/library";
import { NextResponse, NextRequest } from "next/server";

function extractMonthDay(dateStr: string): string {
  const date = new Date(dateStr);
  const month = ("0" + (date.getMonth() + 1)).slice(-2);
  const day = ("0" + date.getDate()).slice(-2);
  return `${month}-${day}`;
}

export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: "CORETEAM",
        status: "ACTIVE",
      },
    });
    
    const today = new Date();
    const fourDaysLater = new Date();
    fourDaysLater.setDate(today.getDate() + 4);

    const todayStr = extractMonthDay(today.toISOString());
    const fourDaysLaterStr = extractMonthDay(fourDaysLater.toISOString());

    const slackBot = new SlackBotSdk();

    for (const user of users) {
      const { personalData, email } = user;
      // const dateOfBirth = (personalData as JsonObject)?.dateOfBirth;
      // console.log(dateOfBirth);

      // const dateOfBirthStr = extractMonthDay(dateOfBirth as string);
      const dateOfBirthStr = extractMonthDay('1999-06-12')
      const todayDate = extractMonthDay('1999-06-12')
      // console.log(dateOfBirthStr, todayDate);
      if (email && dateOfBirthStr) {
        if (dateOfBirthStr === todayDate) {
          if (user?.slackId) {
            const message = `<@${user?.slackId}> has a birthday today!`;
            await slackBot.sendSlackMessageviaAPI({ text: message, channel: 'C07A8AU5UKB' }); //C066K6FKU1X
          }
        }

        if (dateOfBirthStr === fourDaysLaterStr) {
          if (user?.slackId) {
            const message = `<@${user?.slackId}> has a birthday in 4 days. Don't forget the gift!`;
            await slackBot.sendSlackMessageviaAPI({ text: message, channel: 'C07A8AU5UKB' }); //C06944N1NQ7
          }
        }
      }
    }

    const jsonResponse = {
      status: "success",
      message:
        'reminder sent to the group'
    };

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Error in GET route:", error);
    return new NextResponse(JSON.stringify({ status: "error", message: 'Internal Server Error' }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
