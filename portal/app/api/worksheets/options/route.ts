import { NextRequest, NextResponse } from 'next/server';
import { resolveOptionsFetcher } from '@/lib/worksheets';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') ?? '';
    const query = url.searchParams.get('query') ?? '';
    const worksheetId = url.searchParams.get('worksheetId') ?? '';
    const field = url.searchParams.get('field') ?? '';

    const fetcher = resolveOptionsFetcher({
      worksheetId: worksheetId || undefined,
      field: field || undefined,
      type: type || undefined,
    });
    if (!fetcher) {
      return NextResponse.json(
        worksheetId && field
          ? {
              error: `No options config for worksheet ${worksheetId} field ${field}`,
            }
          : { error: `Unknown options type: ${type}` },
        { status: 400 }
      );
    }

    const options = await fetcher(query);
    return NextResponse.json({ options });
  } catch (e) {
    console.error('Options fetch error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch options' },
      { status: 500 }
    );
  }
}
