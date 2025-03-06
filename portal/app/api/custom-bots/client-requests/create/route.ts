import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';
import { PRSTATUS, UPDATETYPE, UPDATEFROM } from '@prisma/client';
import { TEMPLATE_REPO_OWNER } from '@/utils/constants/customBots';
import { GithubSdk } from '@/utils/services/githubSdk';
import { GenAiSdk } from '@/utils/services/GenAiSdk';

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
  let { requestDescription, clientId, botProjectId, assigneeId } = body;
  console.log(body);
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

    const filePath = `ProjectInfo/${requestTitle}/README.md`;

    // 2️⃣ Add a README file in the new branch
    await appRepoSdk.updateFile({
      path: filePath,
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
    const clientRequest = await prisma.clientRequests.create({
      data: {
        botProjectId,
        clientId,
        assigneeId,
        title: generatedTitle,
        description: requestDescription, // First message stored here
        prUrl: prResult?.html_url || '',
        prNumber: prResult?.number || null,
        requestStatus: PRSTATUS.UN_ASSIGNED,
        lastUpdatedAt: initTime,
        createdAt: initTime,
        updatedAt: initTime,
      },
    });

    // 5️⃣ Create a `RequestUpdate` for the first message
    await prisma.requestUpdate.create({
      data: {
        clientRequestId: clientRequest.id,
        clientId,
        message: requestDescription,
        updateType: UPDATETYPE.CLIENT_MSG,
        updateFrom: UPDATEFROM.CLIENT,
        createdAt: initTime,
        updatedAt: initTime,
      },
    });

    await prisma.requestUpdate.create({
      data: {
        clientRequestId: clientRequest.id,
        clientId,
        message:
          'Your request has been received. We will get back to you shortly.',
        updateType: UPDATETYPE.BOT_MSG,
        updateFrom: UPDATEFROM.BOT,
      },
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
