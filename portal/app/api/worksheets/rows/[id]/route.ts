import { prisma } from '@/prisma/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getWorksheetConfig } from '@/lib/worksheets/registry';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as { rawPayload?: Record<string, unknown>; worksheetId?: string };

    const existing = await prisma.worksheetRow.findUnique({
      where: { id },
    });
    
    if (!existing) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    }

    const worksheetId = body.worksheetId ?? existing.worksheetId;
    const worksheetConfig = getWorksheetConfig(worksheetId);
    
    if (!worksheetConfig) {
      return NextResponse.json({ error: 'Worksheet not found in registry' }, { status: 404 });
    }

    let updatedData = existing.data as Record<string, unknown> || {};

    if (body.rawPayload) {
      updatedData = { ...updatedData, ...body.rawPayload };
    }

    const indexValue = worksheetConfig.indexKey ? String(updatedData[worksheetConfig.indexKey] || '') : undefined;

    const updated = await prisma.worksheetRow.update({
      where: { id },
      data: {
        worksheetId,
        indexValue: indexValue || undefined,
        data: updatedData as any,
      }
    });

    const rawPayload = (updated.data as Record<string, unknown>) || {};

    return NextResponse.json({ 
      status: 'success', 
      data: {
        id: updated.id,
        worksheetId: updated.worksheetId,
        indexValue: updated.indexValue,
        rawPayload,
        indexedFields: rawPayload,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      } 
    });
  } catch (e) {
    console.error('Row update error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update row' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.worksheetRow.delete({ where: { id } });
    return NextResponse.json({ status: 'success' });
  } catch (e) {
    console.error('Row delete error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to delete row' },
      { status: 500 }
    );
  }
}
