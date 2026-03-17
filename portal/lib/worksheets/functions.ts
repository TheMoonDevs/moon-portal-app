import { globalActions } from "@/lib/worksheets/global/actions";
import { globalComputes } from "@/lib/worksheets/global/compute";
import { globalOptionsByType } from "@/lib/worksheets/global/options";
import { worksheets } from "@/lib/worksheets/registry";
import type {
  ActionKey,
  ComputeKey,
  OptionsFnKey,
  OptionsTypeKey,
} from "@/lib/worksheets/registry";

type WorksheetBundle = (typeof worksheets)[keyof typeof worksheets];
type WorksheetBundleMapKey = "actions" | "computes" | "options";

const worksheetBundles = Object.values(worksheets) as WorksheetBundle[];

function mergeWorksheetMaps(key: WorksheetBundleMapKey): Record<string, unknown> {
  return Object.assign({}, ...worksheetBundles.map((bundle) => bundle[key]));
}

export type ComputeWindow = {
  allRows: Record<string, unknown>[];
  rowIndex: number;
  sortedBy?: string;
  sortOrder?: "asc" | "desc";
};

export type ComputeContext = {
  row: Record<string, unknown>;
  previous?: unknown;
  worksheetId: string;
  field: string;
  window?: ComputeWindow;
};

export type ComputeFn = (ctx: ComputeContext) => unknown;

export type ActionContext = {
  row: Record<string, unknown>;
  worksheetId?: string;
  selection?: { rowIds: string[] };
};

export type ActionResult =
  | { type: "none" }
  | { type: "patchRow"; patch: Record<string, unknown> };

export type ActionFn = (ctx: ActionContext) => Promise<ActionResult | void>;

export type OptionsContext = {
  worksheetId: string;
  field: string;
};

export type OptionsFn = (
  query: string,
  ctx: OptionsContext,
) => Promise<{ label: string; value: string | number }[]>;

export const ACTION_FNS: Record<string, ActionFn> = {
  ...globalActions,
  ...(mergeWorksheetMaps("actions") as Record<string, ActionFn>),
};

export const COMPUTE_FNS: Record<string, ComputeFn> = {
  ...globalComputes,
  ...(mergeWorksheetMaps("computes") as Record<string, ComputeFn>),
};

export const OPTIONS_FNS: Record<string, OptionsFn> = {
  ...(mergeWorksheetMaps("options") as Record<string, OptionsFn>),
};

export const OPTIONS_TYPE_FNS = globalOptionsByType;

export type { ActionKey, ComputeKey, OptionsFnKey, OptionsTypeKey };
