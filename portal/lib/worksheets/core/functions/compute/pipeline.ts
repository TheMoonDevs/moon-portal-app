import {
  type ComputeContext,
  type ComputeKey,
  COMPUTE_FNS,
} from "@/lib/worksheets/functions";

export function executeComputedPipelineSync(
  ctx: ComputeContext,
  pipelineKeys: ComputeKey[] | undefined,
): unknown {
  if (!pipelineKeys?.length) return undefined;

  let value: unknown = ctx.previous;
  for (const key of pipelineKeys) {
    const fn = COMPUTE_FNS[key];
    if (!fn) continue;
    value = fn({ ...ctx, previous: value });
  }
  return value;
}

export async function executeComputedPipeline(
  ctx: ComputeContext,
  pipelineKeys: ComputeKey[] | undefined,
): Promise<unknown> {
  return executeComputedPipelineSync(ctx, pipelineKeys);
}
