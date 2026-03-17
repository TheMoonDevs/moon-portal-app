import type { WorksheetConfig } from "@/lib/worksheets/core/types";
import type { WorksheetFieldMeta } from "@/lib/worksheets/core/db/zod-meta";
import {
  deriveColumns,
  deriveWorksheetConfigFromSchema,
} from "@/lib/worksheets/core/schema-first";
import {
  ACTION_FNS,
  COMPUTE_FNS,
  OPTIONS_FNS,
  OPTIONS_TYPE_FNS,
  type ActionContext,
  type ActionFn,
  type ActionResult,
  type ComputeContext,
  type ComputeFn,
  type OptionsContext,
  type OptionsFn,
} from "@/lib/worksheets/functions";
import { worksheets, type ActionKey, type ComputeKey, type OptionsFnKey } from "@/lib/worksheets/registry";

const baseConfigs: WorksheetConfig[] = Object.values(worksheets).map((worksheet) =>
  deriveWorksheetConfigFromSchema(worksheet.schema),
);

const configRegistry: Record<string, WorksheetConfig> = Object.fromEntries(
  baseConfigs.map((c) => [c.id, c]),
);

const derivedCache = new Map<string, WorksheetConfig>();

function withDerivedColumns(config: WorksheetConfig): WorksheetConfig {
  const cached = derivedCache.get(config.id);
  if (cached) return cached;
  const derived: WorksheetConfig = {
    ...config,
    columns: deriveColumns(config),
  };
  derivedCache.set(config.id, derived);
  return derived;
}

export function getWorksheetConfig(idOrSlug: string): WorksheetConfig | undefined {
  const byId = configRegistry[idOrSlug];
  if (byId) return withDerivedColumns(byId);
  const found = Object.values(configRegistry).find((f) => f.slug === idOrSlug);
  return found ? withDerivedColumns(found) : undefined;
}

export function getAllWorksheetConfigs(): WorksheetConfig[] {
  return Object.values(configRegistry).map((config) => withDerivedColumns(config));
}

export type { ActionContext, ActionFn, ActionResult };
export type { ComputeContext, ComputeFn };
export type { OptionsContext, OptionsFn };
export type { ActionKey, ComputeKey, OptionsFnKey };
export { ACTION_FNS, COMPUTE_FNS, OPTIONS_FNS };

type OptionsResult = { label: string; value: string | number }[];

export interface OptionsRequestParams {
  worksheetId?: string;
  field?: string;
  type?: string;
}

export function getOptionsFetcherByType(
  type: string,
): ((query: string) => Promise<OptionsResult>) | null {
  return OPTIONS_TYPE_FNS[type as keyof typeof OPTIONS_TYPE_FNS] ?? null;
}

export function getOptionsFetcher(
  worksheetId: string,
  field: string,
): ((query: string) => Promise<OptionsResult>) | null {
  const config = getWorksheetConfig(worksheetId);
  if (!config) return null;

  const columns = config.columns ?? deriveColumns(config);
  const column = columns.find((c) => c.field === field);
  if (!column) return null;

  const zodSchema =
    "zodSchema" in column ? (column as { zodSchema?: any }).zodSchema : undefined;
  const meta = (zodSchema as unknown as { meta?: () => unknown } | undefined)?.meta?.() as
    | WorksheetFieldMeta
    | undefined;
  const options = meta?.options;
  if (!options) return null;

  if ("fnKey" in options && options.fnKey) {
    const fn = OPTIONS_FNS[options.fnKey as keyof typeof OPTIONS_FNS];
    if (fn) {
      return async (query: string) =>
        fn(query, {
          worksheetId,
          field,
        });
    }
  }

  if ("staticOptions" in options && options.staticOptions) {
    const base = options.staticOptions;
    return async (query: string) => {
      const q = query.toLowerCase();
      return base.filter((o) => o.label.toLowerCase().includes(q));
    };
  }

  if ("type" in options && options.type) {
    const handler = OPTIONS_TYPE_FNS[options.type as keyof typeof OPTIONS_TYPE_FNS];
    if (handler) return handler;
    return null;
  }

  if ("url" in options && options.url) {
    return async (query: string) => {
      const url = new URL(options.url!);
      const qp = options.queryParam || "query";
      url.searchParams.set(qp, query);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch options");
      const data = await res.json();

      let items: any = data;
      const path = options.itemsPath || "options";
      if (path) {
        const parts = path.split(".").filter(Boolean);
        for (const p of parts) {
          if (items && typeof items === "object" && p in items) {
            items = (items as any)[p];
          } else {
            items = [];
            break;
          }
        }
      }
      if (!Array.isArray(items)) items = [];
      const labelKey = options.labelKey || "label";
      const valueKey = options.valueKey || "value";
      return (items as any[]).map((it) => ({
        label: String((it as any)[labelKey] ?? ""),
        value: (it as any)[valueKey],
      })) as OptionsResult;
    };
  }

  return null;
}

export function resolveOptionsFetcher(
  params: OptionsRequestParams,
): ((query: string) => Promise<OptionsResult>) | null {
  if (params.worksheetId && params.field) {
    return getOptionsFetcher(params.worksheetId, params.field);
  }
  if (params.type) return getOptionsFetcherByType(params.type);
  return null;
}
