export const dynamic = "force-dynamic"; // static by default, unless reading the request
import { prisma } from "@/prisma/prisma";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { NotificationType } from "@prisma/client";
import { JsonObject } from "@prisma/client/runtime/library";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      where: {
        userType: "MEMBER",
        role: "CORETEAM",
        status: "ACTIVE",
        // id: "665bfefcc58926c7f6935c0c", //remove and add your user id for testing
      },
    });

    const usersWithoutWalletAddress = await Promise.all(
      users.map(async (user) => {
        if (!(user?.payData as JsonObject)?.walletAddres) {
          const matchId = `${user?.id}_onboard_walletAddress`;
          const data = {
            userId: user?.id,
            title: "Wallet Address Required",
            description: "Please add your wallet address to continue.",
            matchId: matchId,
            notificationType: "SELF_GENERATED" as NotificationType,
            notificationData: {
              actions: [
                {
                  title: "Add Wallet Address",
                  trigger_type: "url",
                  trigger: `${APP_BASE_URL}/member/onboarding/wallet`,
                },
              ],
              actionDone: false,
            },
          };

          const existingNotification = await prisma.notification.findUnique({
            where: { matchId },
          });

          if (
            existingNotification &&
            (existingNotification?.notificationData as JsonObject)?.actionDone
          ) {
            await prisma.notification.update({
              where: { matchId },
              data: { ...data, updatedAt: new Date() },
            });
            return user?.name;
          }
          if (!existingNotification) {
            await prisma.notification.create({
              data,
            });

            return user?.name;
          }
        }
      })
    );

    const jsonResponse = {
      status: "success",
      message:
        usersWithoutWalletAddress?.length > 0
          ? "Created Notifications!"
          : "No users to notify",
      notifiedUsers:
        usersWithoutWalletAddress?.length > 0
          ? usersWithoutWalletAddress
          : null,
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
