import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';
import { GithubSdk } from '@/utils/services/githubSdk';
import { TEMPLATE_REPO_OWNER } from '@/utils/constants/customBots';
import { updateClientRequest } from '@/utils/services/customBots/clientRequests/updateClientRequest';

export async function POST(req: Request) {
  try {
    const { clientRequestId, clientId, message } = await req.json();
    const initTime = new Date();

    if (!clientRequestId || !clientId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const clientRequest = await prisma.clientRequests.findUnique({
      where: { id: clientRequestId },
    });

    const TMD_GITHUB_TOKEN = process.env.TMD_GITHUB_TOKEN;

    if (!TMD_GITHUB_TOKEN) {
      console.error('No GitHub token provided');
      return NextResponse.json(
        { error: 'GitHub token missing' },
        { status: 500 },
      );
    }

    const repoName = clientRequest?.prUrl?.split('/')[4] as string;

    if (!repoName) {
      console.error('No repo name found in PR URL');
      return NextResponse.json(
        { error: 'Repo name not found' },
        { status: 500 },
      );
    }

    // 🔹 GitHub SDK Instance
    const appRepoSdk = new GithubSdk({
      owner: TEMPLATE_REPO_OWNER,
      repo: repoName,
      token: TMD_GITHUB_TOKEN as string,
    });

    appRepoSdk.createCommentOnPr(
      clientRequest?.prNumber as number,
      `<Not for Client> Msg from Client: ${message}`,
    );

    // Fetch latest PR updates before saving message
    await updateClientRequest(clientRequestId);

    await prisma.requestUpdate.create({
      data: {
        clientRequestId,
        clientId,
        message,
        updateType: 'CLIENT_MSG',
        updateFrom: 'CLIENT',
        createdAt: initTime,
        updatedAt: initTime,
      },
    });

    const updatedRequestUpdates = await prisma.requestUpdate.findMany({
      where: { clientRequestId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(
      { requestUpdates: updatedRequestUpdates },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error saving chat message:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
