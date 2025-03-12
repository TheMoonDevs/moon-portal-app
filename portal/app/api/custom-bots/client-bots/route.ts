// api/custom-bots/client-bots/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';
import { UPDATEFROM, UPDATETYPE } from '@prisma/client';
import { TEMPLATE_REPO_OWNER } from '@/utils/constants/customBots';
import { GithubSdk } from '@/utils/services/githubSdk';

// Create ClientBot
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { botProjectId, clientId, type, variables, clientRequestId, name } =
      body;

    console.log('body', body);

    if (!botProjectId || !clientId || !type || !variables || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create the ClientBot without a mode field (since it's not part of the schema)
    const clientBot = await prisma.clientBot.create({
      data: { botProjectId, clientId, type, variables, name, clientRequestIds: [clientRequestId] },
    });

    // If an originClientRequestId is provided, update that ClientRequest to add the new bot's id
    if (clientRequestId) {
      const clientRequest = await prisma.clientRequest.update({
        where: { id: clientRequestId },
        data: {
          mentionedClientBotIds: {
            push: clientBot.id,
          },
        },
        include: {
          requestUpdates: true,
        },
      });

      const TMD_GITHUB_TOKEN = process.env.TMD_GITHUB_TOKEN;

      if (!TMD_GITHUB_TOKEN) {
        console.error('No GitHub token provided');
        return NextResponse.json(
          { error: 'GitHub token missing' },
          { status: 500 },
        );
      }

      const repoName = clientRequest?.prUrl?.split('/')[4];

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


      const modeMap = clientBot.variables.reduce((acc: Record<string, string[]>, variable: any) => {
        if (variable.mode && Array.isArray(variable.mode) && variable.mode.length > 0) {
          variable.mode.forEach((mode: string) => {
            acc[mode] = acc[mode] || [];
            acc[mode].push(variable.key);
          });
        }
        return acc;
      }, {});

      // Format as markdown for GitHub PR comment
      const modeMapString = Object.entries(modeMap)
        .map(([mode, keys]) => `- **${mode}**: ${keys.join(', ')}`)
        .join('\n');

      const commentBody = `<Not for Client> **Client has added a new bot to their request:**  
**Bot Name:** ${clientBot.name}  
**Environment Variables:**  
${modeMapString}`;

      await appRepoSdk.createCommentOnPr(
        lastRequestPrNumber || clientRequest.prNumber,
        commentBody,
      );

      const variablesKeyString = variables.map((variable: any) => variable.key).join(', ');

      await prisma.requestMessage.create({
        data: {
          originClientRequestId: clientRequest.id,
          clientId,
          message: `${name} bot has been added to your request with the following variables: ${variablesKeyString}.`,
          updateType: UPDATETYPE.MESSAGE,
          updateFrom: UPDATEFROM.BOT,
        },
      });
    }
    return NextResponse.json(clientBot, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error creating ClientBot' },
      { status: 500 },
    );
  }
}

// Get ClientBot
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const clientId = searchParams.get('clientId');
    const botProjectId = searchParams.get('botProjectId');
    const clientRequestId = searchParams.get('clientRequestId');
    console.log(id, clientId, clientRequestId)

    if (clientRequestId) {
      const clientRequest = await prisma.clientRequest.findUnique({ where: { id: clientRequestId } })
      if (!clientRequest)
        return NextResponse.json({ error: 'ClientRequest not found' }, { status: 404 });

      if (!clientRequest.mentionedClientBotIds) {
        await prisma.clientRequest.update({
          where: { id: clientRequestId },
          data: {
            mentionedClientBotIds: {
              set: [],
            },
          },
        })
        return NextResponse.json({ clientBots: [] }, { status: 200 });
      }

      const mentionedClientBots = await Promise.all(clientRequest.mentionedClientBotIds.map(async (id) => {
        const clientBot = prisma.clientBot.findUnique({ where: { id } })
        return clientBot
      }))
      return NextResponse.json({ clientBots: mentionedClientBots }, { status: 200 })
    }
    if (botProjectId) {
      const clientBots = await prisma.clientBot.findMany({ where: { botProjectId } });
      return NextResponse.json({ clientBots }, { status: 200 });
    }
    if (clientId) {
      const clientBots = await prisma.clientBot.findMany({ where: { clientId } });
      return NextResponse.json({ clientBots }, { status: 200 });
    }
    if (id) {
      const clientBot = await prisma.clientBot.findUnique({ where: { id } });
      return NextResponse.json({ clientBots: [clientBot] }, { status: 200 });
    }

    else {
      return NextResponse.json({ error: 'Missing id or clientId or clientRequestId' }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json(
      { error: 'Error fetching ClientBot' },
      { status: 500 },
    );
  }
}

// Update ClientBot
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, variables, clientRequestId } = body;

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const clientBot = await prisma.clientBot.findUnique({ where: { id } });
    if (!clientBot) return NextResponse.json({ error: 'ClientBot not found' }, { status: 404 });

    let updatedBot;

    // If clientRequestId is provided and not already in the array, add it
    if (clientRequestId && !clientBot.clientRequestIds.includes(clientRequestId)) {
      // Add bot to client request
      const clientRequest = await prisma.clientRequest.update({
        where: { id: clientRequestId },
        data: {
          mentionedClientBotIds: {
            push: id
          }
        },
        include: {
          requestUpdates: true,
        },
      });

      // Add client request to bot
      updatedBot = await prisma.clientBot.update({
        where: { id },
        data: {
          clientRequestIds: {
            push: clientRequestId
          },
          ...(variables ? { variables } : {})
        },
      });

      // Add comment to GitHub PR if available
      const TMD_GITHUB_TOKEN = process.env.TMD_GITHUB_TOKEN;
      if (TMD_GITHUB_TOKEN && clientRequest.prUrl) {
        // Create formatted string of variables with modes
        // Group variables by mode
        const modeMap: Record<string, string[]> = {};

        clientBot.variables.forEach((variable: any) => {
          const key = variable.key;

          if (variable.mode && Array.isArray(variable.mode) && variable.mode.length > 0) {
            // Add the key to each mode's array
            variable.mode.forEach((mode: string) => {
              if (!modeMap[mode]) {
                modeMap[mode] = [];
              }
              modeMap[mode].push(key);
            });
          } else {
            // Handle variables without mode
            if (!modeMap['default']) {
              modeMap['default'] = [];
            }
            modeMap['default'].push(key);
          }
        });

        const repoName = clientRequest?.prUrl?.split('/')[4];

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

        const modeMapString = Object.entries(modeMap)
          .map(([mode, keys]) => `- **${mode}**: ${keys.join(', ')}`)
          .join('\n');

        const commentBody = `<Not for Client> **Client has added their bot in this request:**  
**Bot Name:** ${clientBot.name}  
**Updated Environment Variables:**  
${modeMapString}`;

        await appRepoSdk.createCommentOnPr(
          lastRequestPrNumber || clientRequest.prNumber,
          commentBody,
        );

        // Create a simple key string without modes for client-facing message
        const variablesKeyString = clientBot.variables.map((variable: any) => variable.key).join(', ');

        await prisma.requestMessage.create({
          data: {
            originClientRequestId: clientRequest.id,
            clientId: clientBot.clientId,
            message: `${clientBot.name} bot has been added to this request with the following variables: ${variablesKeyString}.`,
            updateType: UPDATETYPE.MESSAGE,
            updateFrom: UPDATEFROM.BOT,
          },
        });
      }
    } else {
      // Just update variables if clientRequestId not provided or already exists
      updatedBot = await prisma.clientBot.update({
        where: { id },
        data: { variables: variables || clientBot.variables },
      });
    }

    return NextResponse.json(updatedBot, { status: 200 });
  } catch (error) {
    console.error('Error updating ClientBot:', error);
    return NextResponse.json(
      { error: 'Error updating ClientBot' },
      { status: 500 },
    );
  }
}

// Delete ClientBot or remove bot from client request
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const clientRequestId = searchParams.get('clientRequestId');
    const removeOnly = searchParams.get('removeOnly') === 'true';

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const clientBot = await prisma.clientBot.findUnique({ where: { id } });
    if (!clientBot) return NextResponse.json({ error: 'ClientBot not found' }, { status: 404 });

    // If clientRequestId is provided and removeOnly is true, just remove the association
    if (clientRequestId && removeOnly) {
      // Remove clientRequestId from the bot's clientRequestIds array
      await prisma.clientBot.update({
        where: { id },
        data: {
          clientRequestIds: {
            set: clientBot.clientRequestIds.filter(reqId => reqId !== clientRequestId)
          }
        },
      });

      // Remove botId from the clientRequest's mentionedClientBotIds array
      const clientRequest = await prisma.clientRequest.findUnique({
        where: { id: clientRequestId },
        include: {
          requestUpdates: true,
        },
      });

      if (clientRequest) {
        await prisma.clientRequest.update({
          where: { id: clientRequestId },
          data: {
            mentionedClientBotIds: {
              set: clientRequest.mentionedClientBotIds.filter(botId => botId !== id)
            }
          },
        });

        // Add a message to notify that the bot was removed
        await prisma.requestMessage.create({
          data: {
            originClientRequestId: clientRequestId,
            clientId: clientBot.clientId,
            message: `${clientBot.name} with keys ${clientBot.variables.map((variable: any) => variable.key).join(', ')} has been removed from this request.`,
            updateType: UPDATETYPE.MESSAGE,
            updateFrom: UPDATEFROM.BOT,
          },
        });

        // Add a comment to GitHub PR if available
        const TMD_GITHUB_TOKEN = process.env.TMD_GITHUB_TOKEN;
        if (TMD_GITHUB_TOKEN && clientRequest.prUrl) {
          const repoName = clientRequest?.prUrl?.split('/')[4];

          const appRepoSdk = new GithubSdk({
            owner: TEMPLATE_REPO_OWNER,
            repo: repoName,
            token: TMD_GITHUB_TOKEN,
          });

          const requestUpdates = clientRequest.requestUpdates;

          // Find the update with the largest prNumber
          const lastRequestPrNumber =
            requestUpdates.length > 0
              ? requestUpdates.reduce((acc, curr) =>
                acc.prNumber > curr.prNumber ? acc : curr,
              ).prNumber
              : null;

          const modeMap = clientBot.variables.reduce((acc: Record<string, string[]>, variable: any) => {
            if (variable.mode && Array.isArray(variable.mode) && variable.mode.length > 0) {
              variable.mode.forEach((mode: string) => {
                acc[mode] = acc[mode] || [];
                acc[mode].push(variable.key);
              });
            }
            return acc;
          }, {});

          // Format the modeMap into a markdown-friendly string for GitHub comment
          const modeMapString = Object.entries(modeMap)
            .map(([mode, keys]) => `- **${mode}**: ${keys.join(', ')}`)
            .join('\n');

          const commentBody = `<Not for Client> **Client has removed the following bot from their request:**  
**Bot Name:** ${clientBot.name}  
**Environment Variables:**  
${modeMapString}`;

          await appRepoSdk.createCommentOnPr(
            lastRequestPrNumber || clientRequest.prNumber,
            commentBody,
          );
        }
      }

      return NextResponse.json(
        { message: 'Bot removed from request successfully' },
        { status: 200 },
      );
    }
    // Otherwise, delete the bot entirely
    else {
      // First remove the bot from all client requests it's associated with
      await Promise.all(clientBot.clientRequestIds.map(async (reqId) => {
        const clientRequest = await prisma.clientRequest.findUnique({ where: { id: reqId } });
        if (clientRequest) {
          await prisma.clientRequest.update({
            where: { id: reqId },
            data: {
              mentionedClientBotIds: {
                set: clientRequest.mentionedClientBotIds.filter(botId => botId !== id)
              }
            },
          });
        }
      }));

      // Then delete the bot
      await prisma.clientBot.delete({ where: { id } });

      return NextResponse.json(
        { message: 'Bot deleted successfully' },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error('Error handling ClientBot deletion:', error);
    return NextResponse.json(
      { error: 'Error processing delete operation' },
      { status: 500 },
    );
  }
}
