import { prisma } from '@/prisma/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getWorksheetConfig } from '@/lib/worksheets/registry';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const worksheetIdQuery = url.searchParams.get('worksheetId') ?? undefined;
    const worksheetSlugQuery = url.searchParams.get('worksheetSlug') ?? undefined;
    const secret = url.searchParams.get('secret') ?? request.headers.get('x-webhook-secret') ?? undefined;

    const body = await request.json() as Record<string, unknown>;
    const worksheetIdBody = body?.worksheetId as string | undefined;
    const worksheetSlugBody = body?.worksheetSlug as string | undefined;
    const worksheetIdOrSlug = worksheetIdQuery ?? worksheetIdBody ?? worksheetSlugQuery ?? worksheetSlugBody;

    if (!worksheetIdOrSlug) {
      return NextResponse.json(
        { error: 'worksheetId or worksheetSlug required (query or body)' },
        { status: 400 }
      );
    }

    const worksheetConfig = getWorksheetConfig(worksheetIdOrSlug);

    if (!worksheetConfig) {
      return NextResponse.json({ error: 'Worksheet not found in code registry' }, { status: 404 });
    }

    if (worksheetConfig.webhookSecret && worksheetConfig.webhookSecret !== secret) {
      return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
    }

    // Build zod schema dynamically
    const shape: z.ZodRawShape = {};
    worksheetConfig.columns.forEach(col => {
      // Skip computed and action columns for validation
      if (col.type === 'computed' || col.type === 'actions') return;

      let fieldSchema: z.ZodTypeAny;
      if (col.zodSchema) {
        fieldSchema = col.zodSchema;
      } else {
        // Fallback simple validation if not explicitly defined
        switch (col.type) {
          case 'number': fieldSchema = z.coerce.number(); break;
          case 'boolean': fieldSchema = z.union([z.boolean(), z.coerce.boolean()]); break;
          case 'email': fieldSchema = z.string().email(); break;
          default: fieldSchema = z.unknown();
        }
      }

      if (!col.required) {
        fieldSchema = fieldSchema.optional();
      }
      shape[col.field] = fieldSchema;
    });

    const schema = z.object(shape).passthrough();
    const parsed = schema.safeParse(body);

    let rawPayload: Record<string, unknown> = body as Record<string, unknown>;
    let validationErrors: Record<string, string[]> | null = null;

    if (!parsed.success) {
      validationErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
      if (typeof body === 'object' && body !== null) {
        rawPayload = body as Record<string, unknown>;
      }
    } else {
      rawPayload = parsed.data as Record<string, unknown>;
    }

    const indexValue = worksheetConfig.indexKey ? String(rawPayload[worksheetConfig.indexKey] || '') : undefined;

    const row = await prisma.worksheetRow.create({
      data: {
        worksheetId: worksheetConfig.id,
        indexValue: indexValue || undefined,
        validationErrors: validationErrors ?? undefined,
        data: rawPayload as any,
      },
    });

    return NextResponse.json(
      { status: 'success', data: { id: row.id, worksheetId: worksheetConfig.id } },
      { status: 200 }
    );
  } catch (e) {
    console.error('Worksheet webhook error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Webhook failed' },
      { status: 500 }
    );
  }
}
