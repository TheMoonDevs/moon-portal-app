import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';
import { PRSTATUS } from '@prisma/client';
import {
  TEMPLATE_REPO,
  TEMPLATE_REPO_OWNER,
} from '@/utils/constants/customBots';
import { GithubSdk } from '@/utils/services/githubSdk';

export async function POST(request: Request) {
  const body = await request.json();
  let { requestTite, requestDescription, clientId, botProjectId, assigneeId } =
    body;

  requestTite = requestTite.toLowerCase().replace(/ /g, '-');

  if (!requestTite || !requestDescription || !clientId || !botProjectId) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  try {
    const TMD_GITHUB_TOKEN = process.env.TMD_GITHUB_TOKEN;

    if (!TMD_GITHUB_TOKEN) {
      console.error('No Github token provided');
    }

    // Create an instance for the template repository.
    const appRepoSdk = new GithubSdk({
      owner: TEMPLATE_REPO_OWNER,
      repo: TEMPLATE_REPO,
      token: TMD_GITHUB_TOKEN as string,
    });
    const newBranch = `request/${requestTite}-${Date.now()}`;

    const botProject = await prisma.botProject.findUnique({
      where: { id: botProjectId },
    });
    if (!botProject) {
      return NextResponse.json(
        { error: 'Bot project not found' },
        { status: 404 },
      );
    }

    const targetbranch = botProject?.githubRepoBranch || 'main';


    // 1. Create a new branch from "main"
    await appRepoSdk.createBranch({
      branchName: newBranch,
      baseBranch: targetbranch,
    });

    const filePath = `botProject/${botProject?.name?.toLowerCase().replace(/ /g, '-')}/requests/${requestTite}-${Date.now()}/README.md`;

    // 2. Construct the file path and update the README.md file on the new branch.
    await appRepoSdk.updateFile({
      path: filePath,
      content: `REQUEST: ${requestDescription}`,
      commitMessage: `Add README for ${requestTite}`,
      branch: newBranch,
    });

    // 3. Create a pull request from the new branch to "main"
    const prTitle = `New Request: ${requestTite}`;
    const prBody = `REQUEST: ${requestDescription}`;
    const prResult:any = await appRepoSdk.createPullRequest({
      title: prTitle,
      head: newBranch,
      base: targetbranch,
      body: prBody,
    });

    const bot = await prisma.clientRequests.create({
      data: {
        botProjectId,
        clientId,
        assigneeId,
        title: requestTite,
        description: requestDescription,
        prUrl: prResult?.html_url as string || '',
        prNumber: prResult?.number as number || null,
        requestStatus: PRSTATUS.UN_ASSIGNED,
      },
    });

    return NextResponse.json({ prResult, bot });
  } catch (error) {
    console.error('Error creating client request:', error);
    return NextResponse.json(
      { error: 'Failed to create client request' },
      { status: 500 },
    );
  }
}
