import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { enforcePermission } from '@/lib/permissions/server';
import { getWorksheetConfig } from '@/lib/worksheets';
import {
  createRow,
  listRows,
} from '@/lib/worksheets/core/db/worksheet-repository';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ worksheetId: string }> },
) {
  const denied = await enforcePermission('worksheets:read');
  if (denied) return denied;

  try {
    const { worksheetId } = await params;
    const url = new URL(request.url);
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) ||
        DEFAULT_LIMIT,
      MAX_LIMIT,
    );
    const cursor = url.searchParams.get('cursor') ?? undefined;
    const sortBy = url.searchParams.get('sortBy') ?? undefined;
    const sortOrder = (url.searchParams.get('sortOrder') ?? 'desc') as
      | 'asc'
      | 'desc';

    const worksheetConfig = getWorksheetConfig(worksheetId);
    if (!worksheetConfig) {
      return NextResponse.json(
        { error: 'Worksheet not found in code registry' },
        { status: 404 },
      );
    }

    const filterObj: Record<string, unknown> = {};
    url.searchParams.forEach((v, k) => {
      const match = k.match(/^filter\[(.+)\]$/);
      if (match) filterObj[match[1]] = v;
    });

    const { rows, nextCursor } = await listRows(worksheetConfig.id, {
      filter: Object.keys(filterObj).length > 0 ? filterObj : undefined,
      sortBy: sortBy ?? 'createdAt',
      sortOrder,
      limit,
      cursor,
    });

    return NextResponse.json({
      status: 'success',
      data: rows,
      nextCursor,
      hasMore: !!nextCursor,
    });
  } catch (e) {
    console.error('Rows list error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list rows' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ worksheetId: string }> },
) {
  const denied = await enforcePermission('worksheets:append');
  if (denied) return denied;

  try {
    const { worksheetId } = await params;
    const worksheetConfig = getWorksheetConfig(worksheetId);

    if (!worksheetConfig) {
      return NextResponse.json(
        { error: 'Worksheet not found in code registry' },
        { status: 404 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const row = await createRow(worksheetConfig.id, body);

    return NextResponse.json(
      {
        status: 'success',
        data: {
          id: row.id,
          worksheetId: row.worksheetId,
          indexValue: row.indexValue,
          rawPayload: row.rawPayload,
          indexedFields: row.indexedFields,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    console.error('Create row error:', e);
    const message = e instanceof Error ? e.message : 'Failed to create row';
    const status = message.startsWith('Validation failed') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
