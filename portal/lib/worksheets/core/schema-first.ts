import { z } from "zod";
import type { WorksheetConfig, ColumnConfig, ColumnType } from "./types";
import type { WorksheetFieldMeta, WorksheetSchemaMeta } from "./db/zod-meta";
import { executeComputedPipelineSync } from "./functions/compute/pipeline";
import { ACTION_FNS, type ComputeKey } from "@/lib/worksheets/functions";

function titleFromField(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function inferColumnType(fieldSchema: z.ZodTypeAny, field: string): ColumnType {
  const meta = (fieldSchema as unknown as { meta?: () => unknown }).meta?.() as
    | WorksheetFieldMeta
    | undefined;
  const hinted = (meta?.ui as any)?.type as ColumnType | undefined;
  if (hinted) return hinted;
  if ((meta?.options as any)?.type === "__async_select__") return "asyncSelect";
  if (field.toLowerCase().includes("email")) return "email";
  return "text";
}

function applyColumnOrdering(columns: ColumnConfig[]): ColumnConfig[] {
  const ordered = [...columns];
  ordered.sort((a, b) => {
    const ao = (a as any).order ?? Number.MAX_SAFE_INTEGER;
    const bo = (b as any).order ?? Number.MAX_SAFE_INTEGER;
    return ao - bo;
  });

  for (const col of [...ordered]) {
    const before = (col as any).before as string | undefined;
    const after = (col as any).after as string | undefined;
    if (!before && !after) continue;

    const fromIdx = ordered.findIndex((c) => c.field === col.field);
    if (fromIdx < 0) continue;

    const [item] = ordered.splice(fromIdx, 1);
    let toIdx = ordered.length;
    if (before) {
      const idx = ordered.findIndex((c) => c.field === before);
      toIdx = idx >= 0 ? idx : ordered.length;
    } else if (after) {
      const idx = ordered.findIndex((c) => c.field === after);
      toIdx = idx >= 0 ? idx + 1 : ordered.length;
    }
    ordered.splice(toIdx, 0, item);
  }

  return ordered;
}

export function deriveColumns(config: WorksheetConfig): ColumnConfig[] {
  const schema = config.rowSchema as z.ZodObject<any>;
  const shape = (schema as any).shape as Record<string, z.ZodTypeAny>;
  const fields = Object.keys(shape);

  const derived = fields.map((field) => {
    const fieldSchema = shape[field];
    const meta = (fieldSchema as unknown as { meta?: () => unknown }).meta?.() as
      | WorksheetFieldMeta
      | undefined;
    const ui = meta?.ui;
    const type = inferColumnType(fieldSchema, field);
    const staticOptions =
      meta?.options && "staticOptions" in meta.options ? meta.options.staticOptions : undefined;
    return {
      field,
      label: titleFromField(field),
      type,
      valueFormatter: undefined,
      zodSchema: fieldSchema,
      options: type === "enum" ? staticOptions : undefined,
      width: ui?.width,
      pinned: ui?.pinned,
      hidden: ui?.hidden,
      align: ui?.align,
    } as ColumnConfig;
  });

  const meta = (schema as unknown as { meta?: () => unknown }).meta?.() as
    | WorksheetSchemaMeta
    | undefined;
  const uiColumnsMeta = meta?.uiColumns ?? [];

  const uiColumns: ColumnConfig[] = uiColumnsMeta.map((u) => {
    const type: ColumnType = (u.type as ColumnType) || "text";
    const label = u.label ?? titleFromField(u.field);

    if (type === "computed") {
      const zodSchema = z.any().optional().meta({
        ui: {
          width: u.width,
          pinned: u.pinned,
          hidden: u.hidden,
          align: u.align,
        },
      } as WorksheetFieldMeta);
      return {
        field: u.field,
        label,
        type: "computed",
        zodSchema,
        width: u.width,
        pinned: u.pinned,
        hidden: u.hidden,
        align: u.align,
        order: u.order,
        before: u.before,
        after: u.after,
        valueGetter: (row: Record<string, any>, ctx?: { window?: any }) =>
          executeComputedPipelineSync(
            {
              row,
              worksheetId: config.id,
              field: u.field,
              window: ctx?.window,
            },
            (u.computed?.pipeline ?? []) as ComputeKey[],
          ),
      };
    }

    if (type === "actions") {
      const handlerKey = u.action?.handlerKey;
      const handler = handlerKey
        ? ACTION_FNS[handlerKey as keyof typeof ACTION_FNS]
        : undefined;
      const zodSchema = z.any().optional().meta({
        ui: {
          width: u.width,
          pinned: u.pinned,
          hidden: u.hidden,
          align: u.align,
        },
      } as WorksheetFieldMeta);

      return {
        field: u.field,
        label,
        type: "actions",
        zodSchema,
        width: u.width,
        pinned: u.pinned,
        hidden: u.hidden,
        align: u.align,
        order: u.order,
        before: u.before,
        after: u.after,
        actions: handler
          ? [
              {
                id: handlerKey!,
                label,
                action: (row, ctx) =>
                  handler({
                    row,
                    worksheetId: ctx?.worksheetId ?? config.id,
                    selection: ctx?.selection,
                  }),
              },
            ]
          : [],
      };
    }

    const zodSchema = z.any().optional().meta({
      ui: {
        width: u.width,
        pinned: u.pinned,
        hidden: u.hidden,
        align: u.align,
      },
    } as WorksheetFieldMeta);

    return {
      field: u.field,
      label,
      type,
      zodSchema,
      width: u.width,
      pinned: u.pinned,
      hidden: u.hidden,
      align: u.align,
      order: u.order,
      before: u.before,
      after: u.after,
    } as ColumnConfig;
  });

  return applyColumnOrdering(uiColumns.length ? [...derived, ...uiColumns] : derived);
}

export function deriveWorksheetConfigFromSchema(
  schema: z.ZodObject<any>,
): WorksheetConfig {
  const meta = (schema as unknown as { meta?: () => unknown }).meta?.() as
    | WorksheetSchemaMeta
    | undefined;
  if (!meta) {
    throw new Error("Worksheet schema is missing meta with id/name/slug");
  }

  return {
    id: meta.id,
    name: meta.name,
    slug: meta.slug,
    rowSchema: schema,
    serialColumn: meta.serialColumn,
    idColumn: meta.idColumn,
    createdAtColumn: meta.createdAtColumn,
    updatedAtColumn: meta.updatedAtColumn,
  };
}
