import { isAllowedInCompany } from '@/lib/permissions/company';
import { requirePlan, stepToTask, withTasks } from '@/lib/workspace/planServer';
import { fail, ok } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

type Params = { params: { planId: string; stepId: string } };

/** Makes a step of the plan into a task in the step's project. */
export async function POST(_request: Request, { params }: Params) {
  const { response, plan, user, access } = await requirePlan(
    params.planId,
    'edit',
  );
  if (response || !plan || !user)
    return response ?? fail(404, 'Plan not found.');
  if (!isAllowedInCompany(user, access, 'tasks:create'))
    return fail(403, 'You cannot add tasks in this company.');

  const result = await stepToTask(plan, params.stepId, user.id);
  if (result.error || !result.plan) return fail(400, result.error!);
  const [view] = await withTasks([result.plan]);
  return ok({ plan: view, task: result.task }, { status: 201 });
}
