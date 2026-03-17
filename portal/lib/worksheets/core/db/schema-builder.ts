import { z } from "zod";
import type { WorksheetConfig } from "../types";
import { getWorksheetCollection } from "./mongo";
import { getWorksheetConfig } from "@/lib/worksheets";
import type { WorksheetFieldMeta } from "./zod-meta";

export interface BuiltRowSchema {
  schema: z.ZodObject<z.ZodRawShape>;
}

export function buildRowSchema(config: WorksheetConfig): BuiltRowSchema {
  const schema = (config.rowSchema as z.ZodObject<any>).passthrough();
  return { schema };
}

const schemaCache = new Map<string, BuiltRowSchema>();

export function getBuiltRowSchema(worksheetId: string): BuiltRowSchema | null {
  const config = getWorksheetConfig(worksheetId);
  if (!config) return null;
  let built = schemaCache.get(worksheetId);
  if (!built) {
    built = buildRowSchema(config);
    schemaCache.set(worksheetId, built);
  }
  return built;
}

export async function ensureIndexes(worksheetId: string): Promise<void> {
  const built = getBuiltRowSchema(worksheetId);
  if (!built) return;

  const config = getWorksheetConfig(worksheetId);
  if (!config) return;

  const collection = getWorksheetCollection(worksheetId);

  await collection
    .createIndex({ createdAt: -1 }, { name: "idx_createdAt" })
    .catch(() => {});

  const shape = (config.rowSchema as any).shape as Record<string, z.ZodTypeAny>;
  for (const [field, fieldSchema] of Object.entries(shape)) {
    const meta = (fieldSchema as unknown as { meta?: () => unknown }).meta?.() as
      | WorksheetFieldMeta
      | undefined;
    const dbMeta = meta?.db;
    if (!dbMeta?.index && !dbMeta?.unique) continue;

    try {
      if (dbMeta.unique) {
        await collection.createIndex(
          { [field]: 1 },
          { unique: true, name: `idx_${field}_unique` },
        );
      } else if (dbMeta.index) {
        await collection.createIndex({ [field]: 1 }, { name: `idx_${field}` });
      }
    } catch {
      // no-op
    }
  }
}
