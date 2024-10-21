import { prisma } from "@/prisma/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId, newSubscription } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }
    if (!newSubscription) {
      return NextResponse.json(
        { error: "Missing push subscription in body" },
        { status: 400 }
      );
    }
    console.log("Received push subscription to add", newSubscription);
    const userSubscription = await prisma.subscription.findUnique({
      where: {
        userId,
      },
    });

    const updatedSubscription = userSubscription?.subscriptions.filter(
      (subscription) => subscription.endpoint !== newSubscription.endpoint
    );
    updatedSubscription?.push(newSubscription);

    await prisma.subscription.upsert({
      where: {
        userId,
      },
      update: {
        subscriptions: updatedSubscription,
      },
      create: {
        userId,
        subscriptions: [newSubscription],
      },
    });

    return NextResponse.json(
      { message: "Push Subscription Saved!" },
      { status: 200 }
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const {
      userId,
      subscriptionToDelete,
    }: { userId: string; subscriptionToDelete: PushSubscription | undefined } =
      await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    if (!subscriptionToDelete) {
      return NextResponse.json(
        { error: "Missing push subscription in body" },
        { status: 400 }
      );
    }
    console.log("Received push subscription to delete", subscriptionToDelete);

    const userSubscription = await prisma.subscription.findUnique({
      where: {
        userId,
      },
    });

    const updatedSubscription = userSubscription?.subscriptions.filter(
      (subscription) => subscription.endpoint !== subscriptionToDelete.endpoint
    );

    await prisma.subscription.update({
      where: {
        userId,
      },
      data: {
        subscriptions: updatedSubscription,
      },
    });

    return NextResponse.json(
      { message: "Push Subscription Deleted!" },
      { status: 200 }
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
