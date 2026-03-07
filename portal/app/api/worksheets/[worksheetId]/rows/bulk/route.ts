import { prisma } from '@/prisma/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getWorksheetConfig } from '@/lib/worksheets/registry';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ worksheetId: string }> }
) {
  try {
    const { worksheetId } = await params;
    const worksheetConfig = getWorksheetConfig(worksheetId);
    
    if (!worksheetConfig) {
      return NextResponse.json({ error: 'Worksheet not found in registry' }, { status: 404 });
    }

    const body = await request.json() as { updates: { id: string; rawPayload: Record<string, unknown> }[] };
    
    if (!body.updates || !Array.isArray(body.updates)) {
      return NextResponse.json({ error: 'Invalid updates payload' }, { status: 400 });
    }

    // Since Prisma doesn't have a single bulk update with different data per row,
    // we use a transaction to run multiple updates efficiently.
    const updatePromises = body.updates.map(async (update) => {
      // First, fetch existing data to merge
      const existing = await prisma.worksheetRow.findUnique({
        where: { id: update.id },
      });
      
      if (!existing) return null;

      const updatedData = {
        ...(existing.data as Record<string, unknown> || {}),
        ...update.rawPayload
      };

      const indexValue = worksheetConfig.indexKey ? String(updatedData[worksheetConfig.indexKey] || '') : undefined;

      return prisma.worksheetRow.update({
        where: { id: update.id },
        data: {
          indexValue: indexValue || undefined,
          data: updatedData as any,
        }
      });
    });

    const results = await prisma.$transaction(async () => {
      return await Promise.all(updatePromises);
    });

    const successfulUpdates = results.filter(Boolean).map(updated => ({
      id: updated!.id,
      worksheetId: updated!.worksheetId,
      indexValue: updated!.indexValue,
      rawPayload: (updated!.data as Record<string, unknown>) || {},
      indexedFields: (updated!.data as Record<string, unknown>) || {},
      createdAt: updated!.createdAt,
      updatedAt: updated!.updatedAt,
    }));

    return NextResponse.json({ 
      status: 'success', 
      data: successfulUpdates 
    });
  } catch (e) {
    console.error('Bulk update error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to bulk update rows' },
      { status: 500 }
    );
  }
}
