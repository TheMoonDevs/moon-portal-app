export const dynamic = 'force-dynamic';
import { prisma } from '@/prisma/prisma';
import { User } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';
import { format } from 'date-fns';
import { APP_BASE_URL } from '../../../../../utils/constants/appInfo';
import { SlackBotSdk, SlackChannels } from '@/utils/services/slackBotSdk';
import { GenAiSdk } from '@/utils/services/GenAiSdk';
import dayjs from 'dayjs';

export const revalidate = 0;

const slackBot = new SlackBotSdk();
const doomsDay = dayjs('2025-07-01');

const formatDate = (date: Date) => format(date, 'EEEE -- MMMM dd, yyyy');

const generateMessages = async (usersWithWorkLogs: any[]) => {
  const today = formatDate(new Date());
  let messages = `Good morning team! ☀️ Today is ${today} --- We're *${
    doomsDay.diff(dayjs(), 'days') + 1
  } days* away from Public Launch! 🌍🔥\n\n`;

  let combinedWorklogsContent = '';

  for (const user of usersWithWorkLogs) {
    const {
      userName,
      user: userId,
      totalTasksYesterday,
      incompleteTasksYesterday,
      completedTasksYesterday,
      totalTasksToday,
      slackId,
      yesterdayWorklogsContent,
    } = user;

    const userSummaryLink = `- <${APP_BASE_URL}/user/worklogs/summary/${userId}|logs>`;

    let message = ` • ${slackId ? `<@${slackId}>` : userName}`;

    if (totalTasksYesterday === 0 && totalTasksToday === 0) {
      message += ` has no tasks logged for yesterday and today.🙅‍♂️`;
    } else if (
      incompleteTasksYesterday === totalTasksYesterday &&
      totalTasksToday === 0
    ) {
      message += ` had ${incompleteTasksYesterday} unfinished tasks since yesterday 🙅‍♂️`;
    } else if (
      totalTasksYesterday > 0 &&
      completedTasksYesterday === totalTasksYesterday &&
      totalTasksToday === 0
    ) {
      message += ` finished all *tasks (${totalTasksYesterday})* yesterday 🚀`;
    } else if (
      totalTasksYesterday > 0 &&
      completedTasksYesterday === totalTasksYesterday &&
      totalTasksToday > 0
    ) {
      message += ` finished *all tasks (${totalTasksYesterday})* yesterday 🚀, & planned ${totalTasksToday} tasks for today 🎯`;
    } else {
      message += ` completed *${completedTasksYesterday} tasks* ✅, left ${incompleteTasksYesterday} unfinished ${incompleteTasksYesterday === 0 ? '😀' : '🥲'}, and planned ${totalTasksToday} tasks for today 🎯`;
    }

    combinedWorklogsContent += `${userName}'s Worklogs\n${yesterdayWorklogsContent}\n\n`;

    messages += `${message} ${userSummaryLink}\n`;
  }

  const aiSummary = await GenAiSdk.generateAISummary(combinedWorklogsContent);
  messages += `\n\n📢 *AI Summary:* ${aiSummary}`;

  return messages;
};

export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const formattedToday = format(today, 'yyyy-MM-dd');
    const formattedYesterday = format(yesterday, 'yyyy-MM-dd');

    const users = await prisma.user.findMany({
      where: {
        userType: 'MEMBER',
        //role: 'CORETEAM',
        status: 'ACTIVE',
      },
    });

    const usersWithWorkLogs = await Promise.all(
      users.map(async (user: User) => {
        const workLogs = await prisma.workLogs.findMany({
          where: {
            userId: user.id,
            date: {
              gte: formattedYesterday,
              lte: formattedToday,
            },
          },
        });

        let totalTasksYesterday = 0;
        let completedTasksYesterday = 0;
        let incompleteTasksYesterday = 0;
        let totalTasksToday = 0;
        let yesterdayWorklogsContent = 'No worklogs available.';

        workLogs.forEach((log: any) => {
          const content = log?.works[0]?.content as string;
          if (content?.trim()) {
            if (log?.date === formattedYesterday) {
              yesterdayWorklogsContent = content;
              totalTasksYesterday = (content.match(/\n/g) || []).length + 1;
              completedTasksYesterday = (content.match(/✅/g) || []).length;
              incompleteTasksYesterday =
                totalTasksYesterday - completedTasksYesterday;
            } else if (log.date === formattedToday) {
              totalTasksToday = (content.match(/\n/g) || []).length + 1;
            }
          }
        });

        return {
          userName: user.name,
          user: user.id,
          slackId: user.slackId,
          totalTasksYesterday,
          incompleteTasksYesterday,
          completedTasksYesterday,
          totalTasksToday,
          yesterdayWorklogsContent,
        };
      }),
    );

    const message = await generateMessages(usersWithWorkLogs);

    await slackBot.sendSlackMessageviaAPI({
      text: message,
      channel: SlackChannels.b_coreteam,
      unfurl_links: false,
      unfurl_media: false,
      username: 'Worklog Summary Bot',
      icon_emoji: ':spiral_note_pad:',
    });

    return NextResponse.json({ status: 'success', message: 'Reminders Sent!' });
  } catch (error) {
    console.error('Something went wrong', error);
    return new NextResponse(
      JSON.stringify({ status: 'error', message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
