"use server";

import { prisma } from "@/prisma/prisma";
import { Subscription } from "@prisma/client";
import webpush from "web-push";

webpush.setVapidDetails(
  `mailto:${process.env.WEB_PUSH_EMAIL}`,
  process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY!,
  process.env.WEB_PUSH_PRIVATE_KEY!
);

export async function sendNotification({
  userId,
  message,
}: {
  userId: string[];
  message: { title: string; body: string; url: string };
}) {
  const subscriptionsDocByUserPromises: Promise<Subscription | null>[] =
    userId.map(async (id) =>
      prisma.subscription.findUnique({
        where: {
          userId: id,
        },
      })
    );

  const subscriptionsDocByUser = await Promise.all(
    subscriptionsDocByUserPromises
  );

  const allSubscriptions = subscriptionsDocByUser.flatMap(
    (doc) => doc?.subscriptions
  );

  try {
    const subscriptionPromises = allSubscriptions.map((sub) => {
      if (!sub) return;
      return webpush.sendNotification(
        sub,

        JSON.stringify({
          title: message.title,
          body: message.body,
          url: message.url,
        } as NotificationOptions)
      );
    });

    await Promise.all(subscriptionPromises);
    return { success: true };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: "Failed to send notification" };
  }
}
