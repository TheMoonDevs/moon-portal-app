import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { enforcePermission } from '@/lib/permissions/server';
import {
  getUiState,
  setUiState,
} from '@/lib/worksheets/core/db/ui-state-repository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ worksheetId: string }> },
) {
  const denied = await enforcePermission('worksheets:read');
  if (denied) return denied;

  try {
    const { worksheetId } = await params;
    const uiState = await getUiState(worksheetId);

    return NextResponse.json({
      status: 'success',
      data: uiState || null,
    });
  } catch (e) {
    console.error('Get UI state error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get UI state' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ worksheetId: string }> },
) {
  const denied = await enforcePermission('worksheets:edit');
  if (denied) return denied;

  try {
    const { worksheetId } = await params;
    const body = (await request.json()) as { uiState: Record<string, unknown> };
    const uiState = await setUiState(worksheetId, body.uiState);

    return NextResponse.json({
      status: 'success',
      data: uiState,
    });
  } catch (e) {
    console.error('Update UI state error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update UI state' },
      { status: 500 },
    );
  }
}
