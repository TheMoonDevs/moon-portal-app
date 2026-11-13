import { db } from '@/lib/mongodb/db-client';
import { isAllowedInCompany } from '@/lib/permissions/company';
import {
  deletePlan,
  planChoices,
  readPlanBody,
  requirePlan,
  stepTasksOf,
  teamProjectIds,
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
  const { data, error } = await readPlanBody(
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

/**
 * Deletes the plan. Tasks made from its steps stay, unless `?withTasks=1`:
 * then the tasks its steps link to go too (the ones the person may delete).
 */
export async function DELETE(request: Request, { params }: Params) {
  const { response, plan, user, access } = await requirePlan(
    params.planId,
    'delete',
  );
  if (response || !plan) return response ?? fail(404, 'Plan not found.');
  const alsoTasks = ['1', 'true'].includes(
    new URL(request.url).searchParams.get('withTasks') ?? '',
  );
  const { tasks, kept } =
    alsoTasks && user
      ? await stepTasksOf(
          plan,
          user.id,
          isAllowedInCompany(user, access, 'tasks:delete'),
          await teamProjectIds(plan.companyId, user.id),
        )
      : { tasks: [], kept: 0 };
  await deletePlan(plan, tasks);
  return ok({ deleted: plan.id, deletedTasks: tasks.length, keptTasks: kept });
}
