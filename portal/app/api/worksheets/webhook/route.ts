import { NextRequest, NextResponse } from 'next/server';
import { getWorksheetConfig } from '@/lib/worksheets';
import { createRowLenient } from '@/lib/worksheets/core/db/worksheet-repository';
import type { WorksheetFieldMeta } from '@/lib/worksheets/core/db/zod-meta';
import { z } from 'zod';

function mapGoogleFormAnswersToPayload(
  worksheetConfig: NonNullable<ReturnType<typeof getWorksheetConfig>>,
  answers: Record<string, unknown>
) {
  const payload: Record<string, unknown> = {};
  const schema = worksheetConfig.rowSchema as z.ZodObject<any>;
  const shape = (schema as any).shape as Record<string, z.ZodTypeAny>;

  for (const [field, fieldSchema] of Object.entries(shape)) {
    const meta = (fieldSchema as unknown as { meta?: () => unknown }).meta?.() as
      | WorksheetFieldMeta
      | undefined;
    const title = meta?.googleForm?.questionTitle?.trim();
    if (!title) continue;
    if (!(title in answers)) continue;
    payload[field] = answers[title];
  }

  return payload;
}

function coerceCommonWebhookValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(coerceCommonWebhookValue);
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;

  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    if (Number.isFinite(n)) return n;
  }
  return value;
}

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

    const answers = body?.answers;
    const rawPayload =
      answers && typeof answers === 'object' && !Array.isArray(answers)
        ? mapGoogleFormAnswersToPayload(
            worksheetConfig,
            answers as Record<string, unknown>
          )
        : (() => {
            const out = { ...body };
            delete out.worksheetId;
            delete out.worksheetSlug;
            delete out.answers;
            return out;
          })();

    let payload: Record<string, unknown>;
    payload = {};
    for (const [k, v] of Object.entries(rawPayload)) {
      payload[k] = coerceCommonWebhookValue(v);
    }

    const row = await createRowLenient(worksheetConfig.id, payload);

    return NextResponse.json(
      {
        status: 'success',
        data: {
          id: row.id,
          worksheetId: worksheetConfig.id,
          validationErrors: row.validationErrors,
        },
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('Worksheet webhook error:', e);
    const message = e instanceof Error ? e.message : 'Webhook failed';
    const status = message.startsWith('Validation failed') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
