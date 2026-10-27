import { db } from '@/lib/mongodb/db-client';
import {
  deletePlan,
  planChoices,
  readPlanBody,
  requirePlan,
  withTasks,
} from '@/lib/workspace/planServer';
import { fail, nowIso, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

type Params = { params: { planId: string } };

export async function GET(_request: Request, { params }: Params) {
  const { response, plan } = await requirePlan(params.planId);
  if (response || !plan) return response ?? fail(404, 'Plan not found.');
  const [view] = await withTasks([plan]);
  return ok({ plan: view });
}

/** Changes the fields given; the rest stay. */
export async function PATCH(request: Request, { params }: Params) {
  const { response, plan } = await requirePlan(params.planId, 'edit');
  if (response || !plan) return response ?? fail(404, 'Plan not found.');

  const body = await request.json().catch(() => ({}));
  const { data, error } = readPlanBody(
    body,
    await planChoices(plan.companyId),
    plan,
  );
  if (error || !data) return fail(400, error ?? 'Invalid plan.');
  const updated = await db.plan.update({
    where: { id: plan.id },
    data: { ...data, updatedAt: nowIso() },
  });
  const [view] = await withTasks([updated]);
  return ok({ plan: view });
}

/** Deletes the plan; tasks made from its steps stay. */
export async function DELETE(_request: Request, { params }: Params) {
  const { response, plan } = await requirePlan(params.planId, 'delete');
  if (response || !plan) return response ?? fail(404, 'Plan not found.');
  await deletePlan(plan);
  return ok({ deleted: plan.id });
}
