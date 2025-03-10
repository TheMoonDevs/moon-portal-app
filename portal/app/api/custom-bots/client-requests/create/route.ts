import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';
import { REQUESTSTATUS, UPDATETYPE, UPDATEFROM } from '@prisma/client';
import { TEMPLATE_REPO_OWNER } from '@/utils/constants/customBots';
import { GithubSdk } from '@/utils/services/githubSdk';
import { GenAiSdk } from '@/utils/services/GenAiSdk';
import { SlackBotSdk, SlackChannels } from '@/utils/services/slackBotSdk';

const slackBotSdk = new SlackBotSdk();

export async function POST(request: Request) {
  const TMD_GITHUB_TOKEN = process.env.TMD_GITHUB_TOKEN;

  if (!TMD_GITHUB_TOKEN) {
    console.error('No GitHub token provided');
    return NextResponse.json(
      { error: 'GitHub token missing' },
      { status: 500 },
    );
  }

  const body = await request.json();
  let { requestDescription, clientId, botProjectId } = body;
  const initTime = new Date();

  if (!requestDescription || !clientId || !botProjectId) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  try {
    const botProject = await prisma.botProject.findUnique({
      where: { id: botProjectId },
    });

    if (!botProject) {
      return NextResponse.json(
        { error: 'Bot project not found' },
        { status: 404 },
      );
    }

    // 🔹 Use GenAI to generate a meaningful title for the request
    const generatedTitle = await GenAiSdk.generateShortTitle(
      `client's request: "${requestDescription}"`,
    );

    if (!generatedTitle) {
      return NextResponse.json(
        { error: 'Failed to generate title' },
        { status: 500 },
      );
    }

    const requestTitle = generatedTitle
      ?.toLowerCase()
      .replace(/ /g, '-')
      .substring(0, 50);

    requestDescription = `REQUEST: ${requestDescription}`;

    // 🔹 GitHub SDK Instance
    const appRepoSdk = new GithubSdk({
      owner: TEMPLATE_REPO_OWNER,
      repo: botProject.githubRepoName as string,
      token: TMD_GITHUB_TOKEN as string,
    });

    const newBranch = `request/${requestTitle}`;
    const targetBranch = botProject.githubRepoBranch || 'main';

    // 1️⃣ Create a new branch from the base branch
    await appRepoSdk.createBranch({
      branchName: newBranch,
      baseBranch: targetBranch,
    });

    const requestDir = `ProjectInfo/${requestTitle}`;
    const readmeFilePath = `${requestDir}/README.md`;

    // 2️⃣ Add a README file in the new branch
    await appRepoSdk.updateFile({
      path: readmeFilePath,
      content: requestDescription,
      commitMessage: `Add README for ${requestTitle}`,
      branch: newBranch,
    });

    // 3️⃣ Create a Pull Request
    const prResult: any = await appRepoSdk.createPullRequest({
      title: `New Request: ${generatedTitle}`,
      head: newBranch,
      base: targetBranch,
      body: requestDescription,
    });

    // 4️⃣ Create the `ClientRequest`
    const clientRequest = await prisma.clientRequest.create({
      data: {
        botProjectId,
        clientId,
        title: generatedTitle,
        description: requestDescription, // First message stored here
        requestDir,
        prUrl: prResult?.html_url || '',
        prNumber: prResult?.number || null,
        prBranch: newBranch,
        prTargetBranch: targetBranch,
        requestStatus: REQUESTSTATUS.UN_ASSIGNED,
        metadata: prResult,
        lastUpdatedAt: initTime,
        createdAt: initTime,
        updatedAt: initTime,
      },
    });

    const clientRequestFilePath = `${requestDir}/clientRequest.json`;
    // 5️⃣ Create the clientRequest.json file on the new branch with the updated ID.
    const clientRequestData = {
      id: clientRequest.id,
      botProjectId: clientRequest.botProjectId,
      clientId: clientRequest.clientId,
      title: clientRequest.title,
      description: clientRequest.description,
      requestDir: clientRequest.requestDir,
      prUrl: clientRequest.prUrl,
      prNumber: clientRequest.prNumber,
      prBranch: clientRequest.prBranch,
      prTargetBranch: clientRequest.prTargetBranch,
      metadata: clientRequest.metadata,
      createdAt: clientRequest.createdAt,
    };

    await appRepoSdk.updateFile({
      path: clientRequestFilePath,
      content: JSON.stringify(clientRequestData, null, 2),
      commitMessage: `Add clientRequest.json for ${requestTitle}`,
      branch: newBranch,
    });

    // 6️⃣ Create a `requestMessage` for the first message
    await prisma.requestMessage.create({
      data: {
        originClientRequestId: clientRequest.id,
        clientId,
        message: requestDescription,
        updateType: UPDATETYPE.MESSAGE,
        updateFrom: UPDATEFROM.CLIENT,
        createdAt: initTime,
        updatedAt: initTime,
      },
    });

    await prisma.requestMessage.create({
      data: {
        originClientRequestId: clientRequest.id,
        clientId,
        message:
          'Your request has been received. We will get back to you shortly.',
        updateType: UPDATETYPE.MESSAGE,
        updateFrom: UPDATEFROM.BOT,
      },
    });

    const slackMsg = `A new request has been created for the project: *${botProject.name}*\n\n*Title*: ${generatedTitle}\n*Description*: ${requestDescription}\n*PR Link*: ${prResult.html_url}`;

    await slackBotSdk.sendSlackMessageviaAPI({
      text: slackMsg,
      channel:
        process.env.NODE_ENV === 'production'
          ? SlackChannels.p_3_custombots
          : SlackChannels.test_slackbot,
    });
    return NextResponse.json({ prResult, clientRequest });
  } catch (error) {
    console.error('Error creating client request:', error);
    return NextResponse.json(
      { error: 'Failed to create client request' },
      { status: 500 },
    );
  }
}
