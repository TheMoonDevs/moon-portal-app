import type { ComputeContext } from "@/lib/worksheets/functions";

type LeadGenerationRow = {
  score?: number | string | null;
};

type LeadComputeCtx<TPrev = unknown> = Omit<ComputeContext, "row" | "previous"> & {
  row: LeadGenerationRow;
  previous?: TPrev;
};

export const leadGenerationComputes = {
  // Stage 1: normalize raw score into a safe number.
  "lead.score.toNumber": ({ row }: LeadComputeCtx) => {
    const score = Number(row.score);
    return Number.isFinite(score) ? score : 0;
  },
  // Stage 2: classify the score into a business priority band.
  "lead.score.toBand": ({ previous }: LeadComputeCtx<number>) => {
    if ((previous ?? 0) > 80) return "High" as const;
    if ((previous ?? 0) > 50) return "Medium" as const;
    return "Low" as const;
  },
  // Stage 3: produce final UI label from the previous band value.
  "lead.score.toLabel": ({ previous }: LeadComputeCtx<"High" | "Medium" | "Low">) => {
    if (previous === "High") return "High Priority";
    if (previous === "Medium") return "Medium Priority";
    return "Low Priority";
  },
  // Single-step shortcut kept for backwards compatibility.
  "lead.computedPriority": ({ row }: LeadComputeCtx) => {
    const score = Number(row.score);
    if (!score || Number.isNaN(score)) return "Low";
    if (score > 80) return "High";
    if (score > 50) return "Medium";
    return "Low";
  },
} as const;
