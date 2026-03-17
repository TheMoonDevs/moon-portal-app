import { ObjectId } from "mongodb";
import { z } from "zod";
import { getWorksheetCollection } from "./mongo";
import { getBuiltRowSchema, ensureIndexes } from "./schema-builder";
import { getWorksheetConfig } from "@/lib/worksheets";
import type { WorksheetFieldMeta, WorksheetSchemaMeta } from "./zod-meta";
import { executeComputedPipelineSync } from "../functions/compute/pipeline";
import type { ComputeKey } from "@/lib/worksheets/functions";

function applyPersistedComputed(
  worksheetId: string,
  schema: z.ZodObject<any>,
  schemaMeta: WorksheetSchemaMeta | undefined,
  baseRow: Record<string, unknown>,
): Record<string, unknown> {
  const shape = (schema as any).shape as Record<string, z.ZodTypeAny>;
  const next: Record<string, unknown> = { ...baseRow };

  for (const [field, fieldSchema] of Object.entries(shape)) {
    const meta = (fieldSchema as unknown as { meta?: () => unknown }).meta?.() as
      | WorksheetFieldMeta
      | undefined;
    const computed = meta?.computed;
    if (!computed?.persist || !computed.pipeline?.length) continue;

    const value = executeComputedPipelineSync(
      {
        row: next,
        worksheetId,
        field,
      },
      computed.pipeline as ComputeKey[],
    );
    if (value !== undefined) next[field] = value;
  }

  for (const ui of schemaMeta?.uiColumns ?? []) {
    const computed = ui.computed;
    if (!computed?.persist || !computed.pipeline?.length) continue;
    if (!ui.field) continue;

    const value = executeComputedPipelineSync(
      {
        row: next,
        worksheetId,
        field: ui.field,
      },
      computed.pipeline as ComputeKey[],
    );
    if (value !== undefined) next[ui.field] = value;
  }

  return next;
}

export interface WorksheetRowResult {
  id: string;
  worksheetId: string;
  indexValue?: string | null;
  rawPayload: Record<string, unknown>;
  indexedFields: Record<string, unknown>;
  validationErrors?: Record<string, string[]> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListRowsOptions {
  filter?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  cursor?: string;
}

function docToResult(
  doc: Record<string, unknown>,
  worksheetId: string,
  indexField?: string,
): WorksheetRowResult {
  const { _id, worksheetId: _wid, createdAt, updatedAt, validationErrors, ...payload } = doc;
  const id = _id instanceof ObjectId ? _id.toString() : String(_id);
  const rawPayload = payload as Record<string, unknown>;
  const indexValue =
    indexField && rawPayload[indexField] != null ? String(rawPayload[indexField]) : undefined;
  return {
    id,
    worksheetId,
    indexValue: indexValue ?? null,
    rawPayload,
    indexedFields: rawPayload,
    validationErrors:
      validationErrors && typeof validationErrors === "object"
        ? (validationErrors as Record<string, string[]>)
        : null,
    createdAt:
      createdAt instanceof Date
        ? createdAt.toISOString()
        : typeof createdAt === "string"
          ? createdAt
          : new Date().toISOString(),
    updatedAt:
      updatedAt instanceof Date
        ? updatedAt.toISOString()
        : typeof updatedAt === "string"
          ? updatedAt
          : new Date().toISOString(),
  };
}

function normalizePayloadAgainstSchema(
  schema: z.ZodObject<any>,
  payload: Record<string, unknown>,
): { normalized: Record<string, unknown>; validationErrors: Record<string, string[]> | null } {
  const shape = (schema as any).shape as Record<string, z.ZodTypeAny>;
  const normalized: Record<string, unknown> = { ...payload };
  const fieldErrors: Record<string, string[]> = {};

  for (const [field, fieldSchema] of Object.entries(shape)) {
    if (!(field in payload)) continue;
    const value = payload[field];
    const parsed = fieldSchema.safeParse(value);
    if (parsed.success) {
      normalized[field] = parsed.data;
      continue;
    }
    fieldErrors[field] = parsed.error.issues.map((i) => i.message);
  }

  const schemaParsed = schema.safeParse(normalized);
  if (!schemaParsed.success) {
    for (const issue of schemaParsed.error.issues) {
      const key = String(issue.path[0] ?? "_schema");
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }
  } else {
    Object.assign(normalized, schemaParsed.data);
  }

  return {
    normalized,
    validationErrors: Object.keys(fieldErrors).length ? fieldErrors : null,
  };
}

function getPrimaryIndexField(config: { rowSchema: z.ZodObject<any> } | undefined): string | undefined {
  if (!config) return undefined;
  const shape = (config.rowSchema as any).shape as Record<string, z.ZodTypeAny>;
  for (const [field, fieldSchema] of Object.entries(shape)) {
    const meta = (fieldSchema as unknown as { meta?: () => unknown }).meta?.() as
      | WorksheetFieldMeta
      | undefined;
    if (meta?.db?.index || meta?.db?.unique) return field;
  }
  return undefined;
}

export async function listRows(
  worksheetId: string,
  options: ListRowsOptions = {},
): Promise<{ rows: WorksheetRowResult[]; nextCursor: string | null }> {
  await ensureIndexes(worksheetId);
  const config = getWorksheetConfig(worksheetId);
  const indexField = getPrimaryIndexField(config);
  const collection = getWorksheetCollection(worksheetId);

  const limit = Math.min(options.limit ?? 50, 200);
  const sortOrder = options.sortOrder ?? "desc";
  const sortKey = options.sortBy ?? "createdAt";
  const order = sortOrder === "asc" ? 1 : -1;
  const sort: [string, 1 | -1][] = [[sortKey, order], ["_id", order]];

  let filter: Record<string, unknown> = { ...options.filter };
  if (options.cursor) {
    try {
      const cursorId = new ObjectId(options.cursor);
      filter = {
        ...filter,
        _id: order === -1 ? { $lt: cursorId } : { $gt: cursorId },
      };
    } catch {
      // invalid cursor
    }
  }

  const cursor = collection
    .find(filter as Record<string, unknown>)
    .sort(sort)
    .limit(limit + 1);

  const docs = await cursor.toArray();
  const hasMore = docs.length > limit;
  const slice = hasMore ? docs.slice(0, limit) : docs;
  const last = slice[slice.length - 1];
  const nextCursor = hasMore && last && last._id ? (last._id as ObjectId).toString() : null;

  const rows = slice.map((d) =>
    docToResult(d as unknown as Record<string, unknown>, worksheetId, indexField),
  );
  return { rows, nextCursor };
}

export async function createRow(
  worksheetId: string,
  payload: Record<string, unknown>,
): Promise<WorksheetRowResult> {
  const built = getBuiltRowSchema(worksheetId);
  if (!built) throw new Error("Worksheet not found");

  const parsed = built.schema.safeParse(payload);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(`Validation failed: ${msg}`);
  }

  await ensureIndexes(worksheetId);
  const config = getWorksheetConfig(worksheetId);
  const indexField = getPrimaryIndexField(config);
  const collection = getWorksheetCollection(worksheetId);
  const schemaMeta = (built.schema as unknown as { meta?: () => unknown }).meta?.() as
    | WorksheetSchemaMeta
    | undefined;

  const withComputed = applyPersistedComputed(
    worksheetId,
    built.schema,
    schemaMeta,
    parsed.data,
  );
  const now = new Date();
  const doc = {
    ...withComputed,
    worksheetId,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc as Record<string, unknown>);
  const inserted = await collection.findOne({ _id: result.insertedId });
  return docToResult(
    inserted as unknown as Record<string, unknown>,
    worksheetId,
    indexField,
  );
}

export async function createRowLenient(
  worksheetId: string,
  payload: Record<string, unknown>,
): Promise<WorksheetRowResult> {
  const built = getBuiltRowSchema(worksheetId);
  if (!built) throw new Error("Worksheet not found");

  await ensureIndexes(worksheetId);
  const config = getWorksheetConfig(worksheetId);
  const indexField = getPrimaryIndexField(config);
  const collection = getWorksheetCollection(worksheetId);
  const schemaMeta = (built.schema as unknown as { meta?: () => unknown }).meta?.() as
    | WorksheetSchemaMeta
    | undefined;

  const { normalized, validationErrors } = normalizePayloadAgainstSchema(built.schema, payload);
  const withComputed = applyPersistedComputed(
    worksheetId,
    built.schema,
    schemaMeta,
    normalized,
  );
  const now = new Date();
  const doc = {
    ...withComputed,
    worksheetId,
    validationErrors,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc as Record<string, unknown>);
  const inserted = await collection.findOne({ _id: result.insertedId });
  return docToResult(
    inserted as unknown as Record<string, unknown>,
    worksheetId,
    indexField,
  );
}

export async function updateRow(
  worksheetId: string,
  rowId: string,
  payload: Partial<Record<string, unknown>>,
): Promise<WorksheetRowResult | null> {
  const built = getBuiltRowSchema(worksheetId);
  if (!built) throw new Error("Worksheet not found");

  const collection = getWorksheetCollection(worksheetId);
  const existing = await collection.findOne({ _id: new ObjectId(rowId) } as { _id: ObjectId });
  if (!existing) return null;

  const merged = { ...(existing as unknown as Record<string, unknown>), ...payload };
  delete merged._id;
  delete merged.worksheetId;
  delete merged.createdAt;
  delete merged.updatedAt;

  const parsed = built.schema.safeParse(merged);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(`Validation failed: ${msg}`);
  }

  const schemaMeta = (built.schema as unknown as { meta?: () => unknown }).meta?.() as
    | WorksheetSchemaMeta
    | undefined;
  const withComputed = applyPersistedComputed(
    worksheetId,
    built.schema,
    schemaMeta,
    parsed.data,
  );

  const doc = {
    ...withComputed,
    worksheetId,
    createdAt: existing.createdAt,
    updatedAt: new Date(),
  };

  await collection.replaceOne(
    { _id: new ObjectId(rowId) } as { _id: ObjectId },
    doc as Record<string, unknown>,
  );
  const updated = await collection.findOne({ _id: new ObjectId(rowId) } as { _id: ObjectId });
  const config = getWorksheetConfig(worksheetId);
  const indexField = getPrimaryIndexField(config);
  return docToResult(
    updated as unknown as Record<string, unknown>,
    worksheetId,
    indexField,
  );
}

export async function deleteRow(worksheetId: string, rowId: string): Promise<boolean> {
  const collection = getWorksheetCollection(worksheetId);
  const result = await collection.deleteOne({ _id: new ObjectId(rowId) } as { _id: ObjectId });
  return result.deletedCount > 0;
}

export interface BulkUpdateItem {
  id: string;
  rawPayload: Partial<Record<string, unknown>>;
}

export async function bulkUpdateRows(
  worksheetId: string,
  updates: BulkUpdateItem[],
): Promise<WorksheetRowResult[]> {
  const built = getBuiltRowSchema(worksheetId);
  if (!built) throw new Error("Worksheet not found");

  const results: WorksheetRowResult[] = [];
  for (const u of updates) {
    const updated = await updateRow(worksheetId, u.id, u.rawPayload);
    if (updated) results.push(updated);
  }
  return results;
}
