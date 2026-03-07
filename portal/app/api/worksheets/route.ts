import { NextRequest, NextResponse } from 'next/server';
import { worksheetRegistry } from '@/lib/worksheets/registry';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug') ?? undefined;

    let worksheets = Object.values(worksheetRegistry);

    if (slug) {
      worksheets = worksheets.filter(f => f.slug === slug);
    }

    // Strip out functions (valueGetter, action, getOptions, zodSchema) for safe JSON serialization
    const safeWorksheets = worksheets.map(f => {
      const safeColumns = f.columns.map(col => {
        const { zodSchema, ...rest } = col as any;
        if (rest.type === 'computed') {
          delete rest.valueGetter;
        } else if (rest.type === 'actions') {
          rest.actions = rest.actions?.map((a: any) => ({
            id: a.id,
            label: a.label,
            variant: a.variant,
            // Action function stripped
          }));
        } else if (rest.type === 'asyncSelect') {
          delete rest.getOptions;
        }
        return rest;
      });

      return {
        id: f.id,
        name: f.name,
        slug: f.slug,
        indexKey: f.indexKey,
        columnDefinitions: safeColumns,
        // userFunctions stripped for now, we only use 'actions' on columns
      };
    });

    return NextResponse.json({
      status: 'success',
      data: safeWorksheets,
    });
  } catch (e) {
    console.error('Worksheets list error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list worksheets' },
      { status: 500 }
    );
  }
}
