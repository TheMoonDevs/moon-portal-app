import { prisma } from '@/prisma/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ worksheetId: string }> }
) {
  try {
    const { worksheetId } = await params;
    const worksheet = await prisma.worksheet.findUnique({
      where: { id: worksheetId },
    });

    return NextResponse.json({
      status: 'success',
      data: worksheet?.uiState || null,
    });
  } catch (e) {
    console.error('Get UI state error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get UI state' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ worksheetId: string }> }
) {
  try {
    const { worksheetId } = await params;
    const body = await request.json() as { uiState: Record<string, unknown> };

    const worksheet = await prisma.worksheet.upsert({
      where: { id: worksheetId },
      update: { uiState: body.uiState as any },
      create: { id: worksheetId, uiState: body.uiState as any },
    });

    return NextResponse.json({
      status: 'success',
      data: worksheet.uiState,
    });
  } catch (e) {
    console.error('Update UI state error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update UI state' },
      { status: 500 }
    );
  }
}