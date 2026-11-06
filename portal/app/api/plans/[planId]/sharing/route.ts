import { db } from '@/lib/mongodb/db-client';
import { requirePlan, withTasks } from '@/lib/workspace/planServer';
import { fail, ok } from '@/lib/workspace/server';
import { readSharing } from '@/lib/workspace/sharing';
import { companyMemberIds } from '@/lib/workspace/sharingServer';

export const dynamic = 'force-dynamic';

type Params = { params: { planId: string } };

/**
 * Sets who can open the plan: `{ restricted, userIds }`. Not restricted, it
 * is open to its company (and its project). Only people who may change the
 * plan can change this; they stay on the list themselves.
 */
export async function PUT(request: Request, { params }: Params) {
  const { response, plan, user } = await requirePlan(params.planId, 'edit');
  if (response || !plan || !user)
    return response ?? fail(404, 'Plan not found.');

  const body = await request.json().catch(() => null);
  const { sharing, error } = readSharing(
    body,
    await companyMemberIds(plan.companyId),
    user.id,
  );
  if (error || !sharing) return fail(400, error ?? 'Invalid sharing.');

  const updated = await db.plan.update({
    where: { id: plan.id },
    data: { sharing },
  });
  const [view] = await withTasks([updated]);
  return ok({ plan: view });
}
