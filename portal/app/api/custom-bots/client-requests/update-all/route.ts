import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';
import { updateClientRequest } from '../update/route';
import { PRSTATUS } from '@prisma/client';

export async function POST() {
  try {
    const clientRequests = await prisma.clientRequests.findMany({
      where: {
        requestStatus: { notIn: [PRSTATUS.CLOSED, PRSTATUS.COMPLETED] },
      },
    });

    // use promise.all to update all client requests in parallel
    await Promise.all(
      clientRequests.map(async (clientRequest) => {
        await updateClientRequest(clientRequest);
      }),
    );

    return NextResponse.json(
      { message: 'All Requests updated' },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
