import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';
import { GithubSdk } from '@/utils/services/githubSdk';
import { TEMPLATE_REPO_OWNER } from '@/utils/constants/customBots';
import { updateClientRequest } from '@/utils/services/customBots/clientRequests/updateClientRequest';
import { REQUESTSTATUS, UPDATEFROM, UPDATETYPE } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const { originClientRequestId, clientId, message } = await req.json();
    const initTime = new Date();

    if (!originClientRequestId || !clientId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const clientRequest = await prisma.clientRequest.findUnique({
      where: { id: originClientRequestId },
      include: { requestUpdates: true },
    });

    if (!clientRequest) {
      return NextResponse.json(
        { error: 'Client request not found' },
        { status: 404 },
      );
    }

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

    if (
      clientRequest.requestStatus === REQUESTSTATUS.CLOSED ||
      clientRequest.requestStatus === REQUESTSTATUS.COMPLETED
    ) {
      const newBranch = `reopen-${clientRequest?.requestUpdates?.length + 1}-${clientRequest?.prBranch}`;
      const requestUpdates = clientRequest?.requestUpdates;

      // find request update with largest prNumber
      const lastRequestPrNumber =
        requestUpdates.length > 0
          ? requestUpdates?.reduce((acc, curr) => {
              return acc?.prNumber > curr?.prNumber ? acc : curr;
            })?.prNumber
          : null;

      await appRepoSdk.createBranch({
        branchName: newBranch,
        baseBranch: clientRequest.prTargetBranch,
      });

      // 2️⃣ Add a README file in the new branch
      await appRepoSdk.updateFile({
        path: `${clientRequest.requestDir}/reopen-${clientRequest?.requestUpdates?.length + 1}.md`,
        content: `Reopen PR for Client Request #${lastRequestPrNumber || clientRequest?.prNumber}: ${message}`,
        commitMessage: `Add README for ${newBranch}`,
        branch: newBranch,
      });

      const prResult: any = await appRepoSdk.createPullRequest({
        title: `Reopen PR for Client Request #${lastRequestPrNumber || clientRequest.prNumber}: ${clientRequest?.title}`,
        head: newBranch,
        base: clientRequest.prTargetBranch,
        body: `Reopen PR for Client Request #${lastRequestPrNumber || clientRequest.prNumber}: ${message}`,
      });

      if (!prResult) {
        return NextResponse.json(
          { error: 'Failed to reopen PR' },
          { status: 500 },
        );
      }

      await prisma.requestUpdate.create({
        data: {
          originClientRequestId,
          botProjectId: clientRequest.botProjectId,
          clientId,
          prNumber: prResult.number,
          prUrl: prResult.html_url,
          prBranch: newBranch,
          prTargetBranch: clientRequest.prTargetBranch,
          metadata: prResult,
          createdAt: initTime,
          updatedAt: initTime,
        },
      });

      const updatedClientRequest = await prisma.clientRequest.update({
        where: { id: originClientRequestId },
        data: {
          requestStatus: REQUESTSTATUS.UN_ASSIGNED,
        },
        include: { requestUpdates: true },
      });

      const clientRequestFilePath = `${updatedClientRequest?.requestDir}/clientRequest.json`;
      // 5️⃣ Create the clientRequest.json file on the new branch with the updated ID.
      const updatedClientRequestData = {
        id: updatedClientRequest.id,
        botProjectId: updatedClientRequest.botProjectId,
        clientId: updatedClientRequest.clientId,
        title: updatedClientRequest.title,
        description: updatedClientRequest.description,
        requestDir: updatedClientRequest.requestDir,
        prUrl: updatedClientRequest.prUrl,
        prNumber: updatedClientRequest.prNumber,
        prBranch: updatedClientRequest.prBranch,
        prTargetBranch: updatedClientRequest.prTargetBranch,
        requestUpdates: updatedClientRequest.requestUpdates,
        metadata: updatedClientRequest.metadata,
        createdAt: updatedClientRequest.createdAt,
      };

      await appRepoSdk.updateFile({
        path: clientRequestFilePath,
        content: JSON.stringify(updatedClientRequestData, null, 2),
        commitMessage: `Updated clientRequest.json`,
        branch: newBranch,
      });

      // Fetch latest PR updates before saving message
      await updateClientRequest(clientRequest);

      await prisma.requestMessage.create({
        data: {
          originClientRequestId,
          clientId,
          message,
          updateType: UPDATETYPE.MESSAGE,
          updateFrom: UPDATEFROM.CLIENT,
          createdAt: initTime,
          updatedAt: initTime,
        },
      });

      await prisma.requestMessage.create({
        data: {
          originClientRequestId,
          clientId,
          message: `Your request has been reopened. We'll get back to you soon.`,
          updateType: UPDATETYPE.MESSAGE,
          updateFrom: UPDATEFROM.BOT,
        },
      });
    } else {
      await appRepoSdk.createCommentOnPr(
        clientRequest?.prNumber as number,
        `<Not for Client> Msg from Client: ${message}`,
      );

      // Fetch latest PR updates before saving message
      await updateClientRequest(clientRequest);

      await prisma.requestMessage.create({
        data: {
          originClientRequestId,
          clientId,
          message,
          updateType: UPDATETYPE.MESSAGE,
          updateFrom: UPDATEFROM.CLIENT,
          createdAt: initTime,
          updatedAt: initTime,
        },
      });
    }

    const updatedRequestMessages = await prisma.requestMessage.findMany({
      where: { originClientRequestId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(
      { requestMessages: updatedRequestMessages },
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
