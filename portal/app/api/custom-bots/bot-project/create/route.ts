import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';
import {
  TEMPLATE_REPO,
  TEMPLATE_REPO_OWNER,
} from '@/utils/constants/customBots';
import { GithubSdk } from '@/utils/services/githubSdk';

export async function POST(request: Request) {
  const body = await request.json();
  let { userId, projectName, projectDescription } = body;

  if (!projectName || !userId) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  try {
    const TOKEN = process.env.TMD_GITHUB_TOKEN;

    if (!TOKEN) {
      console.error('No Github token provided');
    }

    // Create an instance for the template repository.
    const templateRepoSdk = new GithubSdk({
      owner: TEMPLATE_REPO_OWNER,
      repo: TEMPLATE_REPO,
      token: TOKEN as string,
    });

    const newBranch = `botProject/${projectName.toLowerCase().replace(/ /g, '-')}`;

    // 1. Create a new branch from "main"
    await templateRepoSdk.createBranch({
      branchName: newBranch,
      baseBranch: 'main',
    });

    const filePath = `botProject/${projectName.toLowerCase().replace(/ /g, '-')}/README.md`;

    // 2. Construct the file path and update the README.md file on the new branch.
    await templateRepoSdk.updateFile({
      path: filePath,
      content: `DESCRIPTION: ${projectDescription}`,
      commitMessage: `Add README for ${projectName}`,
      branch: newBranch,
    });

    // 3. Create a pull request from the new branch to "main"
    const prTitle = `Project: ${projectName}`;
    const prBody = `DESCRIPTION: ${projectDescription}`;
    const prResult:any = await templateRepoSdk.createPullRequest({
      title: prTitle,
      head: newBranch,
      base: 'main',
      body: prBody,
    });

    const botProject = await prisma.botProject.create({
      data: {
        clientId: userId,
        name: projectName,
        githubRepoName: TEMPLATE_REPO,
        githubRepoUrl: prResult?.head?.repo?.html_url as string || `https://github.com/${TEMPLATE_REPO_OWNER}/${TEMPLATE_REPO}`,
        githubRepoBranch: newBranch,
        prUrl: prResult?.html_url as string || '',
        prNumber: prResult?.number as number || null,
        description: projectDescription,
      },
    });

    return NextResponse.json({ prResult, botProject });
  } catch (error) {
    console.error('Error creating bot project:', error);
    return NextResponse.json(
      { error: 'Failed to create bot project' },
      { status: 500 },
    );
  }
}
