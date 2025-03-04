import { prisma } from '@/prisma/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { BuffBadge, BUFF_LEVEL } from '@prisma/client';
import { SlackBotSdk, SlackChannels } from '@/utils/services/slackBotSdk';
import { getBuffLevelAndTitle } from '@/utils/helpers/badges';
import { APP_BASE_URL, IN_DEV } from '@/utils/constants/appInfo';

const slackBotSdk = new SlackBotSdk();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, title, points, buffLevel, month } = body;

    if (!userId || !title || !points || !buffLevel || !month) {
      return new NextResponse(
        JSON.stringify({ error: 'Required fields are missing' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const existingBadge = await prisma.buffBadge.findUnique({
      where: {
        userId_month: { userId, month },
      },
    });

    if (existingBadge) {
      return new NextResponse(
        JSON.stringify({ status: 'error', message: 'Badge already exists' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const newBuffBadge = await prisma.buffBadge.create({
      data: {
        userId,
        title,
        points,
        buffLevel,
        month,
      },
    });

    return new NextResponse(
      JSON.stringify({ status: 'success', data: newBuffBadge }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('Error creating BuffBadge:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const buffLevel = searchParams.get('buffLevel') as BUFF_LEVEL | null;
    const month = searchParams.get('month');

    const query: any = {};
    if (userId) query.userId = userId;
    if (buffLevel) query.buffLevel = buffLevel;
    if (month) query.month = month;

    const buffBadges = await prisma.buffBadge.findMany({
      where: query,
    });

    return new NextResponse(
      JSON.stringify({ status: 'success', data: buffBadges }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('Error fetching BuffBadges:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, userId, title, points, buffLevel } = body;

    if (
      !id ||
      !userId ||
      !buffLevel ||
      !title ||
      points === undefined ||
      points === null
    ) {
      return new NextResponse(
        JSON.stringify({
          error: 'Required fields are missing for update',
          data: body,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    const updatedPoints = points && points > 0 ? points : 0;
    const updatedBuffBadge = await prisma.buffBadge.update({
      where: { id },
      data: {
        userId,
        title,
        points: updatedPoints,
        buffLevel,
      },
    });

    // fetch all buff badges of this month and if the current badge is the highest, send slack notifiaction
    const month = updatedBuffBadge.month;
    const allBuffBadges = await prisma.buffBadge.findMany({
      where: { month },
    });
    let badgeConfig: any = await prisma.configData.findFirst({
      where: { configId: 'buffBadgeUnlocking' },
    });

    if (!badgeConfig) {
      badgeConfig = {
        configId: 'buffBadgeUnlocking',
        configData: {
          lastUnlockedLevel: BUFF_LEVEL.TRUTH_SEEKER,
          lastUnlockedMarker: 0,
          lastMonth: month,
        },
      };
    }

    // check if the current badge level is already unlocked.
    let unlocked =
      allBuffBadges.filter(
        (badge) =>
          badge.points > updatedBuffBadge.points && badge.userId != userId,
      ).length == 0;

    // check if notification is already sent for this badge level in this month
    let notified =
      badgeConfig.configData.lastMonth == month &&
      badgeConfig.configData.lastUnlockedMarker >=
        getBuffLevelAndTitle(updatedBuffBadge.points).marker;

    if (unlocked && !notified && !IN_DEV) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      await prisma.configData.upsert({
        where: { configId: 'buffBadgeUnlocking' },
        update: {
          configData: {
            lastMonth: month,
            lastUnlockedLevel: getBuffLevelAndTitle(updatedBuffBadge.points)
              .level,
            lastUnlockedMarker: getBuffLevelAndTitle(updatedBuffBadge.points)
              .marker,
          },
        },
        create: {
          configId: 'buffBadgeUnlocking',
          configData: {
            lastMonth: month,
            lastUnlockedLevel: getBuffLevelAndTitle(updatedBuffBadge.points)
              .level,
            lastUnlockedMarker: getBuffLevelAndTitle(updatedBuffBadge.points)
              .marker,
          },
        },
      });
      if (user?.slackId) {
        await slackBotSdk.sendSlackMessageviaAPI({
          text: `Achievement unlocked: <@${user?.slackId}> is the first to unlock *${getBuffLevelAndTitle(points).title}* with *${updatedBuffBadge.points} points*`,
          channel: SlackChannels.b_coreteam,
          unfurl_links: false,
          unfurl_media: false,
          username: 'Badge Update',
          icon_url: `${APP_BASE_URL}${getBuffLevelAndTitle(updatedBuffBadge.points).src}`,
        });
      }
    }

    return new NextResponse(
      JSON.stringify({ status: 'success', data: updatedBuffBadge }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('Error updating BuffBadge:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
