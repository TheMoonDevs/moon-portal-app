export const dynamic = 'force-dynamic'; // static by default, unless reading the request
import type { JsonObject } from '@db/runtime';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { SlackBotSdk } from '@/utils/services/slackBotSdk';

const slackBot = new SlackBotSdk();

export async function GET(request: NextRequest) {
  try {
    const allSlackUsers = await slackBot.getSlackUsers();
    const user = await db.user.findMany({
      where: {
        userType: 'MEMBER',
        role: 'CORETEAM',
        status: 'ACTIVE',
      },
    });
    await Promise.all(
      user.map((userData: any) => {
        if (
          !userData.thirdPartyData ||
          !(userData.thirdPartyData as JsonObject).slackData
        ) {
          const slackUser = allSlackUsers.find(
            (slackUser: any) => slackUser?.profile?.email === userData?.email,
          );

          if (slackUser) {
            const newThirdPartyData = {
              ...(userData.thirdPartyData as JsonObject),
              slackData: slackUser,
            };

            return db.user.update({
              where: { id: userData.id },
              data: {
                thirdPartyData: newThirdPartyData,
                slackId: slackUser.id,
                updatedAt: new Date(),
              },
            });
          }
        }
      }),
    );
    return NextResponse.json({
      status: 'success',
      message: 'Slack users updated successfully',
    });
  } catch (error: any) {
    console.log('Error updating slack users', error);
    return new NextResponse(JSON.stringify(error), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
