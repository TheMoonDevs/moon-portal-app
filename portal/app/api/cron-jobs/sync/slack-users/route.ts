export const dynamic = "force-dynamic"; // static by default, unless reading the request
import { prisma } from "@/prisma/prisma";
import { SlackBotSdk } from "@/utils/services/slackBotSdk";
import { JsonObject } from "@prisma/client/runtime/library";
import { NextRequest } from "next/server";

const slackBot = new SlackBotSdk();

export async function GET(request: NextRequest) {
  const allSlackUsers = await slackBot.getSlackUsers();
  const user = await prisma.user.findMany({
    where: {
      userType: "MEMBER",
      role: "CORETEAM",
      status: "ACTIVE",
    },
  });
  await Promise.all(
    user.map((userData) => {
      try {
        if (
          !userData.thirdPartyData ||
          !(userData.thirdPartyData as JsonObject).slackData
        ) {
          const slackUser = allSlackUsers.find(
            (slackUser: any) => slackUser?.profile?.email === userData?.email
          );
          // console.log(slackUser?.profile?.email, userData?.email);

          if (slackUser) {
            const newThirdPartyData = {
              ...(userData.thirdPartyData as JsonObject),
              slackData: slackUser,
            };

            return prisma.user.update({
              where: { id: userData.id },
              data: {
                thirdPartyData: newThirdPartyData,
                slackId: slackUser.id,
              },
            });
          }
        }
      } catch (error: any) {
        console.error(`Error updating user ${userData.id}: ${error.message}`);
      }
    }));
}
