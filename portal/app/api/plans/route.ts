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
import {
  fail,
  getCompanyAccess,
  getWorkspaceForUser,
  ok,
  requireCompanyPermission,
  requireUser,
} from '@/lib/workspace/server';
import type { Plan } from '@/models/workspace';

export const dynamic = 'force-dynamic';

/**
 * Plans with the projects and people they can name, and what the person
 * may do in each company. `?companyId=` for one company; leave it out (or
 * `all`) for every company they can read tasks in.
 */
export async function GET(request: NextRequest) {
  const asked = request.nextUrl.searchParams.get('companyId');
  const { response, user } = await requireUser();
  if (response || !user)
    return response ?? fail(401, 'Authentication required.');

  let companies: { id: string; name: string; color: string | null }[];
  if (asked && asked !== 'all') {
    const guard = await requireCompanyPermission(asked, 'tasks:read');
    if (guard.response) return guard.response;
    const company = await db.company.findFirst({ where: { id: asked } });
    companies = [
      { id: asked, name: company?.name ?? '', color: company?.color ?? null },
    ];
  } else {
    const workspace = await getWorkspaceForUser(user);
    companies = [];
    for (const w of workspace)
      if (w.permissions.includes('tasks:read'))
        companies.push({
          id: w.company.id,
          name: w.company.name,
          color: w.company.color ?? null,
        });
  }

  const perCompany = await Promise.all(
    companies.map(async (c) => {
      const [plans, choices, teamIds, access]: [
        Plan[],
        Awaited<ReturnType<typeof planChoices>>,
        string[],
        Awaited<ReturnType<typeof getCompanyAccess>>,
      ] = await Promise.all([
        db.plan.findMany({
          where: { companyId: c.id },
          orderBy: { updatedAt: 'desc' },
        }),
        planChoices(c.id),
        teamProjectIds(c.id, user.id),
        getCompanyAccess(user.id, c.id),
      ]);
      return {
        plans,
        choices,
        can: {
          // Plans are ideas: every member can start one.
          create: true,
          editAll: isAllowedInCompany(user, access, 'tasks:edit'),
          deleteAll: isAllowedInCompany(user, access, 'tasks:delete'),
          /** Add tasks in every project, not only the ones they are on. */
          createTasks: isAllowedInCompany(user, access, 'tasks:create'),
          /** Projects they lead or are on: their tasks and plans are theirs. */
          teamProjectIds: teamIds,
        },
      };
    }),
  );

  // People can be in several companies: list each once.
  const people = new Map<
    string,
    (typeof perCompany)[number]['choices']['people'][number]
  >();
  for (const { choices } of perCompany)
    for (const p of choices.people) {
      const seen = people.get(p.id);
      people.set(
        p.id,
        seen
          ? { ...seen, companyIds: [...seen.companyIds, ...p.companyIds] }
          : p,
      );
    }

  const plans = perCompany
    .flatMap((x) => x.plans)
    .sort((a, b) =>
      String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')),
    );
  return ok({
    companies,
    plans: await withTasks(plans),
    projects: perCompany.flatMap((x) => x.choices.projects),
    people: Array.from(people.values()),
    can: Object.fromEntries(companies.map((c, i) => [c.id, perCompany[i].can])),
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

  const { data, error } = await readPlanBody(
    body,
    await planChoices(companyId),
  );
  if (error || !data) return fail(400, error ?? 'Invalid plan.');
  const plan = await createPlan(companyId, user.id, data);
  const [view] = await withTasks([plan]);
  return ok({ plan: view }, { status: 201 });
}
