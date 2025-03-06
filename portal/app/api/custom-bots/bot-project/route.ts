import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');

  if (!clientId) {
    return NextResponse.json(
      { error: 'Client ID is required' },
      { status: 400 },
    );
  }

  try {
    const botProjects = await prisma.botProject.findMany({
      where: { clientId },
      include: { clientRequests: true },
    });
    return NextResponse.json(botProjects);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 },
    );
  }
}
