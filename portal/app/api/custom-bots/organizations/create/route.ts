import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';
import { CustomBotKickstarter } from '@/utils/constants/customBots';

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, name, description } = body;

  if (!name || !userId) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  try {
    const newRepoName = `CustomBots-${name}`;
    const result = await fetch(
      CustomBotKickstarter.createRepo,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRepoName, description }),
      },
    );

    if (!result.ok) {
      throw new Error('Failed to create repository');
    }

    const repoData = await result.json();
    const organization = await prisma.organization.create({
      data: {
        clientId: userId,
        name: name,
        githubName: newRepoName,
        githubUrl: repoData?.html_url,
        description,
      },
    });

    return NextResponse.json({ repoData, organization });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 },
    );
  }
}
