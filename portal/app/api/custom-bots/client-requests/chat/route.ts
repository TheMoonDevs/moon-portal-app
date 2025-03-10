import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';
import { s3FileUploadSdk } from '@/utils/services/s3FileUploadSdk';
import { GithubSdk } from '@/utils/services/githubSdk';
import { TEMPLATE_REPO_OWNER } from '@/utils/constants/customBots';
import { updateClientRequest } from '@/utils/services/customBots/clientRequests/updateClientRequest';
import { REQUESTSTATUS, UPDATEFROM, UPDATETYPE } from '@prisma/client';
import { SlackBotSdk, SlackChannels } from '@/utils/services/slackBotSdk';

const slackBotSdk = new SlackBotSdk();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const originClientRequestId = formData
      .get('originClientRequestId')
      ?.toString();
    const clientId = formData.get('clientId')?.toString();
    const message = formData.get('message')?.toString();
    // Files are sent under key "file" (can be multiple)
    const files = formData.getAll('file') as unknown as File[];

    if (!originClientRequestId || !clientId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }
    const initTime = new Date();

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

    const repoName = clientRequest?.prUrl?.split('/')[4];

    if (!repoName) {
      console.error('No repo name found in PR URL');
      return NextResponse.json(
        { error: 'Repo name not found' },
        { status: 500 },
      );
    }

    // Process file uploads via S3 if files are provided.
    let mediaPayload: {
      mediaName: string;
      mediaType: string;
      mediaFormat: string;
      mediaUrl: string;
    }[] = [];

    if (files && files.length > 0) {
      const folderName =
        formData.get('folderName')?.toString() || 'customBots/clientMessages';
      const filePromises = files.map(async (file) => {
        const uniqueName = `${Date.now()}-${file.name}`;
        const newFile = new File([file], uniqueName, { type: file.type });
        const s3Response = await s3FileUploadSdk.uploadFile({
          file: newFile,
          userId: clientId,
          folder: folderName,
        });
        if (!s3Response || s3Response.$metadata.httpStatusCode !== 200) {
          throw new Error('Failed to upload file');
        }
        const fileUrl = s3FileUploadSdk.getPublicFileUrl({
          userId: clientId,
          file: newFile,
          folder: folderName,
        });
        return {
          mediaName: file.name,
          mediaType: file.type,
          mediaFormat: file.name.split('.').pop() || 'file',
          mediaUrl: fileUrl,
        };
      });
      mediaPayload = await Promise.all(filePromises);
    }

    // Build Markdown for GitHub preview of attached media.
    const mediaMarkdown =
      mediaPayload.length > 0
        ? '\n\n**Attached Media:**\n\n' +
          mediaPayload
            .map((m) =>
              m.mediaType.startsWith('image')
                ? `![${m.mediaName}](${m.mediaUrl})`
                : `[${m.mediaName}](${m.mediaUrl})`,
            )
            .join('\n')
        : '';

    const appRepoSdk = new GithubSdk({
      owner: TEMPLATE_REPO_OWNER,
      repo: repoName,
      token: TMD_GITHUB_TOKEN,
    });

    const requestUpdates = clientRequest.requestUpdates;

    // Find the update with the largest prNumber.
    const lastRequestPrNumber =
      requestUpdates.length > 0
        ? requestUpdates.reduce((acc, curr) =>
            acc.prNumber > curr.prNumber ? acc : curr,
          ).prNumber
        : null;

    // If the request has been completed (pr merged), perform reopening logic.
    if (clientRequest.requestStatus === REQUESTSTATUS.COMPLETED) {
      const newBranch = `reopen-${clientRequest.requestUpdates.length + 1}-${clientRequest.prBranch}`;

      await appRepoSdk.createBranch({
        branchName: newBranch,
        baseBranch: clientRequest.prTargetBranch,
      });

      const prBody = `Reopen PR for Client Request #${
        lastRequestPrNumber || clientRequest.prNumber
      }: ${message}${mediaMarkdown}`;

      // 2️⃣ Add a README file in the new branch
      await appRepoSdk.updateFile({
        path: `${clientRequest.requestDir}/reopen-${clientRequest.requestUpdates.length + 1}.md`,
        content: prBody,
        commitMessage: `Add README for ${newBranch}`,
        branch: newBranch,
      });

      // Create a new pull request.
      const prResult: any = await appRepoSdk.createPullRequest({
        title: `Reopen PR for Client Request #${
          lastRequestPrNumber || clientRequest.prNumber
        }: ${clientRequest.title}`,
        head: newBranch,
        base: clientRequest.prTargetBranch,
        body: prBody,
      });

      if (!prResult) {
        return NextResponse.json(
          { error: 'Failed to reopen PR' },
          { status: 500 },
        );
      }

      // Save the PR update.
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
        data: { requestStatus: REQUESTSTATUS.UN_ASSIGNED },
        include: { requestUpdates: true },
      });

      const clientRequestFilePath = `${updatedClientRequest.requestDir}/clientRequest.json`;
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

      // Refresh client request updates.
      await updateClientRequest(clientRequest);

      await prisma.requestMessage.create({
        data: {
          originClientRequestId,
          clientId,
          message,
          media: mediaPayload,
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

      const slackMsg = `A request with title: *${clientRequest.title}* has been reopened with message: ${message}. [View PR](${prResult.html_url})`;

      await slackBotSdk.sendSlackMessageviaAPI({
        text: slackMsg,
        channel:
          process.env.NODE_ENV === 'production'
            ? SlackChannels.p_3_custombots
            : SlackChannels.test_slackbot,
      });
    } else {
      // Normal case: add a comment to the PR with media preview.
      const commentBody = `<Not for Client> Msg from Client: ${message}${mediaMarkdown}`;
      await appRepoSdk.createCommentOnPr(
        lastRequestPrNumber || clientRequest.prNumber,
        commentBody,
      );
      await updateClientRequest(clientRequest);

      await prisma.requestMessage.create({
        data: {
          originClientRequestId,
          clientId,
          message,
          media: mediaPayload,
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
