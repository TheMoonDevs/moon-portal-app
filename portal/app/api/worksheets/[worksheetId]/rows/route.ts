import { prisma } from '@/prisma/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getWorksheetConfig } from '@/lib/worksheets/registry';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ worksheetId: string }> }
) {
  try {
    const { worksheetId } = await params;
    const url = new URL(request.url);
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
      MAX_LIMIT
    );
    const cursor = url.searchParams.get('cursor') ?? undefined;
    const sortBy = url.searchParams.get('sortBy') ?? undefined;
    const sortOrder = (url.searchParams.get('sortOrder') ?? 'desc') as 'asc' | 'desc';

    const worksheetConfig = getWorksheetConfig(worksheetId);
    if (!worksheetConfig) {
      return NextResponse.json({ error: 'Worksheet not found in code registry' }, { status: 404 });
    }

    const filterObj: Record<string, string> = {};
    url.searchParams.forEach((v, k) => {
      const match = k.match(/^filter\[(.+)\]$/);
      if (match) filterObj[match[1]] = v;
    });

    const rows = await prisma.worksheetRow.findMany({
      where: { worksheetId: worksheetConfig.id },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
    });

    let result = rows.map((s) => {
      const rawPayload = (s.data as Record<string, any>) || {};
      
      return {
        id: s.id,
        worksheetId: s.worksheetId,
        indexValue: s.indexValue,
        rawPayload,
        indexedFields: rawPayload, // Fallback for frontend
        validationErrors: s.validationErrors,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });

    if (Object.keys(filterObj).length > 0) {
      result = result.filter((row) => {
        const payload = row.rawPayload;
        for (const [key, value] of Object.entries(filterObj)) {
          if (payload[key] === undefined || String(payload[key]) !== value) return false;
        }
        return true;
      });
    }

    if (sortBy) {
      result.sort((a, b) => {
        const ai = a.rawPayload[sortBy];
        const bi = b.rawPayload[sortBy];
        const cmp =
          ai == null && bi == null ? 0 : ai == null ? 1 : bi == null ? -1 : ai < bi ? -1 : ai > bi ? 1 : 0;
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }

    const hasMore = result.length > limit;
    if (hasMore) result = result.slice(0, limit);
    const nextCursor = hasMore && result.length > 0 ? result[result.length - 1].id : null;

    return NextResponse.json({
      status: 'success',
      data: result,
      nextCursor,
      hasMore: !!nextCursor,
    });
  } catch (e) {
    console.error('Rows list error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list rows' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ worksheetId: string }> }
) {
  try {
    const { worksheetId } = await params;
    const worksheetConfig = getWorksheetConfig(worksheetId);
    
    if (!worksheetConfig) {
      return NextResponse.json({ error: 'Worksheet not found in code registry' }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    
    const indexValue = worksheetConfig.indexKey ? String(body[worksheetConfig.indexKey] || '') : undefined;

    const row = await prisma.worksheetRow.create({
      data: {
        worksheetId: worksheetConfig.id,
        indexValue: indexValue || undefined,
        data: body as any,
      }
    });

    const rawPayload = (row.data as Record<string, unknown>) || {};

    return NextResponse.json(
      {
        status: 'success',
        data: {
          id: row.id,
          worksheetId: row.worksheetId,
          indexValue: row.indexValue,
          rawPayload,
          indexedFields: rawPayload,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    console.error('Create row error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create row' },
      { status: 500 }
    );
  }
}
