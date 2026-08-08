import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { enforcePermission } from '@/lib/permissions/server';

export async function POST(request: Request) {
  const denied = await enforcePermission('notifications:read');
  if (denied) return denied;

  try {
    const { userId, newSubscription } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 },
      );
    }
    if (!newSubscription) {
      return NextResponse.json(
        { error: 'Missing push subscription in body' },
        { status: 400 },
      );
    }
    console.log('Received push subscription to add', newSubscription);
    const userSubscription = await db.subscription.findUnique({
      where: {
        userId,
      },
    });

    const updatedSubscription = userSubscription?.subscriptions.filter(
      (subscription: any) => subscription.endpoint !== newSubscription.endpoint,
    );
    updatedSubscription?.push(newSubscription);

    await db.subscription.upsert({
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
      { message: 'Push Subscription Saved!' },
      { status: 200 },
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const denied = await enforcePermission('notifications:read');
  if (denied) return denied;

  try {
    const {
      userId,
      subscriptionToDelete,
    }: { userId: string; subscriptionToDelete: PushSubscription | undefined } =
      await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 },
      );
    }

    if (!subscriptionToDelete) {
      return NextResponse.json(
        { error: 'Missing push subscription in body' },
        { status: 400 },
      );
    }
    console.log('Received push subscription to delete', subscriptionToDelete);

    const userSubscription = await db.subscription.findUnique({
      where: {
        userId,
      },
    });

    const updatedSubscription = userSubscription?.subscriptions.filter(
      (subscription: any) =>
        subscription.endpoint !== subscriptionToDelete.endpoint,
    );

    await db.subscription.update({
      where: {
        userId,
      },
      data: {
        subscriptions: updatedSubscription,
      },
    });

    return NextResponse.json(
      { message: 'Push Subscription Deleted!' },
      { status: 200 },
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
