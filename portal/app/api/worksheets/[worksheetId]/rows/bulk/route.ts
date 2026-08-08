import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { enforcePermission } from '@/lib/permissions/server';
import { getWorksheetConfig } from '@/lib/worksheets';
import { bulkUpdateRows } from '@/lib/worksheets/core/db/worksheet-repository';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ worksheetId: string }> },
) {
  const denied = await enforcePermission('worksheets:edit');
  if (denied) return denied;

  try {
    const { worksheetId } = await params;
    const worksheetConfig = getWorksheetConfig(worksheetId);

    if (!worksheetConfig) {
      return NextResponse.json(
        { error: 'Worksheet not found in registry' },
        { status: 404 },
      );
    }

    const body = (await request.json()) as {
      updates: { id: string; rawPayload: Record<string, unknown> }[];
    };

    if (!body.updates || !Array.isArray(body.updates)) {
      return NextResponse.json(
        { error: 'Invalid updates payload' },
        { status: 400 },
      );
    }

    const successfulUpdates = await bulkUpdateRows(
      worksheetConfig.id,
      body.updates,
    );

    return NextResponse.json({
      status: 'success',
      data: successfulUpdates,
    });
  } catch (e) {
    console.error('Bulk update error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to bulk update rows' },
      { status: 500 },
    );
  }
}
