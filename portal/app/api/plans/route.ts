import type { NextRequest } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { isAllowedInCompany } from '@/lib/permissions/company';
import {
  createPlan,
  planChoices,
  readPlanBody,
  teamProjectIds,
  withTasks,
} from '@/lib/workspace/planServer';
import { fail, ok, requireCompanyPermission } from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

/**
 * A company's plans (`?companyId=`), with the projects and people a plan
 * can name, and what the person may do with them.
 */
export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId');
  const { response, user, access } = await requireCompanyPermission(
    companyId,
    'tasks:read',
  );
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const [plans, choices, teamIds] = await Promise.all([
    db.plan.findMany({
      where: { companyId },
      orderBy: { updatedAt: 'desc' },
    }),
    planChoices(companyId!),
    teamProjectIds(companyId!, user.id),
  ]);
  return ok({
    plans: await withTasks(plans),
    ...choices,
    can: {
      // Plans are ideas: every member can start one.
      create: true,
      editAll: isAllowedInCompany(user, access, 'tasks:edit'),
      deleteAll: isAllowedInCompany(user, access, 'tasks:delete'),
      /** Add tasks in every project, not only the ones they are on. */
      createTasks: isAllowedInCompany(user, access, 'tasks:create'),
      /** Projects they lead or are on: their tasks and plans are theirs to run. */
      teamProjectIds: teamIds,
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const companyId = typeof body.companyId === 'string' ? body.companyId : '';
  // Any member can start a plan.
  const { response, user } = await requireCompanyPermission(
    companyId,
    'companies:read',
  );
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  const { data, error } = readPlanBody(body, await planChoices(companyId));
  if (error || !data) return fail(400, error ?? 'Invalid plan.');
  const plan = await createPlan(companyId, user.id, data);
  const [view] = await withTasks([plan]);
  return ok({ plan: view }, { status: 201 });
}
