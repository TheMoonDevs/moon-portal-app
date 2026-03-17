import { NextRequest, NextResponse } from 'next/server';
import { getWorksheetConfig } from '@/lib/worksheets';
import { deleteRow, updateRow } from '@/lib/worksheets/core/db/worksheet-repository';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ worksheetId: string; id: string }> },
) {
  try {
    const { worksheetId: worksheetIdOrSlug, id } = await params;
    const worksheetConfig = getWorksheetConfig(worksheetIdOrSlug);
    if (!worksheetConfig) {
      return NextResponse.json(
        { error: 'Worksheet not found in registry' },
        { status: 404 },
      );
    }

    const body = (await request.json()) as {
      rawPayload?: Record<string, unknown>;
    };
    const updated = await updateRow(
      worksheetConfig.id,
      id,
      body.rawPayload ?? {},
    );
    if (!updated) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'success',
      data: {
        id: updated.id,
        worksheetId: updated.worksheetId,
        indexValue: updated.indexValue,
        rawPayload: updated.rawPayload,
        indexedFields: updated.indexedFields,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (e) {
    console.error('Row update error:', e);
    const message = e instanceof Error ? e.message : 'Failed to update row';
    const status = message.startsWith('Validation failed') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ worksheetId: string; id: string }> },
) {
  try {
    const { worksheetId: worksheetIdOrSlug, id } = await params;
    const worksheetConfig = getWorksheetConfig(worksheetIdOrSlug);
    if (!worksheetConfig) {
      return NextResponse.json(
        { error: 'Worksheet not found in registry' },
        { status: 404 },
      );
    }

    const deleted = await deleteRow(worksheetConfig.id, id);
    if (!deleted) {
      return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    }

    return NextResponse.json({ status: 'success' });
  } catch (e) {
    console.error('Row delete error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to delete row' },
      { status: 500 },
    );
  }
}
