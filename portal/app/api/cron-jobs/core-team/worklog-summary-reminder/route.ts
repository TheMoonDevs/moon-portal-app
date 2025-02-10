export const dynamic = 'force-dynamic';
import { prisma } from '@/prisma/prisma';
import { User } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';
import { format } from 'date-fns';
import { APP_BASE_URL } from '../../../../../utils/constants/appInfo';
import { SlackBotSdk, SlackChannels } from '@/utils/services/slackBotSdk';
import { GenAiSdk } from '@/utils/services/GenAiSdk';

export const revalidate = 0;

const slackBot = new SlackBotSdk();

const formatDate = (date: Date) => format(date, 'EEEE, MMMM dd, yyyy');

const generateMessages = async (usersWithWorkLogs: any[]) => {
  const today = formatDate(new Date());
  const blocks: any[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Good morning team! ☀️ Today is ${today}*`,
      },
    },
    { type: 'divider' },
  ];

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

    const userSummaryLink =
      totalTasksYesterday > 0 || totalTasksToday > 0
        ? ` - <${APP_BASE_URL}/user/worklogs/summary/${userId}|View Worklogs>`
        : '';

    let message = `• ${slackId ? `<@${slackId}>` : userName}`;

    if (totalTasksYesterday === 0 && totalTasksToday === 0) {
      message += ' has no tasks logged for yesterday and today.🙅‍♂️';
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
      message += ` finished all tasks (${totalTasksYesterday}) yesterday 🚀 ${userSummaryLink}`;
    } else {
      message += ` completed ${completedTasksYesterday} tasks ✅, left ${incompleteTasksYesterday} unfinished 😢, and planned ${totalTasksToday} tasks for today 🎯${userSummaryLink}`;
    }

    const worklogBlock = {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${message}\n\n*Yesterday's Worklogs:*\n\`\`\`${yesterdayWorklogsContent}\`\`\``,
      },
    };
    blocks.push(worklogBlock);

    if (totalTasksYesterday > 2) {
      const aiSummary = await GenAiSdk.generateAISummary(
        userName,
        yesterdayWorklogsContent,
      );
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `📢 *AI Summary:* ${aiSummary}` },
      });
    }

    blocks.push({ type: 'divider' });
  }

  return blocks;
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
        role: 'CORETEAM',
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
        let totalTasksToday = 0;
        let yesterdayWorklogsContent = 'No worklogs available.';

        workLogs.forEach((log: any) => {
          const content = log?.works[0]?.content as string;
          if (content?.trim()) {
            const checks = (content.match(/✅/g) || []).length;
            const points = (content.match(/\n/g) || []).length + 1;
            if (log.date === formattedYesterday) {
              totalTasksYesterday += points;
              completedTasksYesterday += checks;
              yesterdayWorklogsContent = content;
            } else if (log.date === formattedToday) {
              totalTasksToday += points;
            }
          }
        });

        let incompleteTasksYesterday =
          totalTasksYesterday - completedTasksYesterday;

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

    const blocks = await generateMessages(usersWithWorkLogs);

    await slackBot.sendSlackMessageviaAPI({
      blocks,
      channel: SlackChannels.b_coreteam,
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
