export const dynamic = 'force-dynamic'; // static by default, unless reading the request
import type { JsonObject } from '@db/runtime';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { SlackBotSdk, SlackChannels } from '@/utils/services/slackBotSdk';

const slackBot = new SlackBotSdk();

const extractMonthDay = (dateStr: string): string => {
  const date = new Date(dateStr);
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const day = ('0' + date.getDate()).slice(-2);
  return `${month}-${day}`;
};

const currentDateStr = extractMonthDay(new Date().toISOString());
const dateInFourDaysStr = extractMonthDay(
  new Date(new Date().setDate(new Date().getDate() + 4)).toISOString(),
);

export async function GET(request: NextRequest) {
  try {
    const users = await db.user.findMany({
      where: {
        userType: 'MEMBER',
        role: 'CORETEAM',
        status: 'ACTIVE',
      },
    });

    for (const user of users) {
      const { personalData, slackId, name } = user;
      const dobStr = (personalData as JsonObject)?.dateOfBirth as string;

      if (!dobStr) {
        console.log('No date of birth found for user:', name);
        continue;
      }

      const dobMonthDay = extractMonthDay(dobStr);

      if (dobMonthDay === currentDateStr) {
        if (slackId) {
          const message = `Reminder: It's ${
            slackId ? `<@${slackId}>` : name
          }'s birthday today! 🎉 Let's make sure to send them some love and good wishes!`;
          await slackBot.sendSlackMessageviaAPI({
            text: message,
            channel: SlackChannels.executive_channel,
          });
        } else {
          console.log('No slackId found for user:', name);
        }
      }

      if (dobMonthDay === dateInFourDaysStr) {
        if (slackId) {
          const message = `Heads up everyone! ${
            slackId ? `<@${slackId}>` : name
          }'s birthday is coming up in 4 days! Let's not forget to prepare a gift 🎁 and make it a special day! 🎉`;
          await slackBot.sendSlackMessageviaAPI({
            text: message,
            channel: SlackChannels.management_channel,
          });
        }
      }
    }

    const jsonResponse = {
      status: 'success',
      message: 'Reminders Sent!',
    };

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Error in GET route:', error);
    return new NextResponse(
      JSON.stringify({ status: 'error', message: 'Internal Server Error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
