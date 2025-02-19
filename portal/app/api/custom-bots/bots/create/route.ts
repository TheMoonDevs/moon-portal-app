import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';
import { BOTSTATUS } from '@prisma/client';
import { CustomBotKickstarter } from '@/utils/constants/customBots';

export async function POST(request: Request) {
  const body = await request.json();
  let {
    repo,
    appName,
    appDescription,
    clientId,
    organizationId,
    assigneeId,
  } = body;

  appName = appName.toLowerCase().replace(/ /g, '-');

  if (!repo || !appName || !appDescription || !clientId || !organizationId) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  try {
    const result = await fetch(
      CustomBotKickstarter.createBot,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, appName, appDescription }),
      },
    );

    if (!result.ok) {
      throw new Error('Failed to create app');
    }

    const appData = await result.json();

    const bot = await prisma.bot.create({
      data: {
        organizationId,
        clientId,
        title: appName,
        description: appDescription,
        prUrl: appData?.pullRequest?.html_url,
        prNumber: appData?.pullRequest?.number,
        assigneeId,
        botStatus: BOTSTATUS.UN_ASSIGNED
      },
    });

    return NextResponse.json({ appData, bot });
  } catch (error) {
    console.error('Error creating bot:', error);
    return NextResponse.json(
      { error: 'Failed to create bot' },
      { status: 500 },
    );
  }
}
