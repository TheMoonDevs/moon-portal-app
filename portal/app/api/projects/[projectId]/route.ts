import { brandKitDefaults, sanitizeBrandKit } from '@/lib/brandKit';
import { db } from '@/lib/mongodb/db-client';
import { fitGoals } from '@/lib/workspace/goalFit';
import { syncGoalSchedules } from '@/lib/workspace/goalSchedules';
import { addDays, sanitizeGoals, toDay } from '@/lib/workspace/projects';
import { withProjectStats } from '@/lib/workspace/projectStats';
import { runDueSchedules } from '@/lib/workspace/schedules';
import {
  asEffort,
  asStringArray,
  checkParent,
  fail,
  getPublicUsers,
  nowIso,
  ok,
  pick,
  requireProjectPermission,
  slugify,
  summarizeTasks,
} from '@/lib/workspace/server';
import { PROJECT_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string } };

const EDITABLE = [
  'name',
  'description',
  'status',
  'color',
  'icon',
  'logo',
  'brandKit',
  'leadIds',
  'memberIds',
  'goals',
  'effort',
  'parentId',
] as const;

export async function GET(_request: Request, { params }: Params) {
  const { response, project } = await requireProjectPermission(
    params.projectId,
    'projects:read',
  );
  if (response || !project)
    return response ?? fail(401, 'Authentication required.');

  await runDueSchedules({ projectId: { in: [project.id] } });
  // This month's finished tasks find their goals before they are counted.
  const tasks = await fitGoals(
    await db.task.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'asc' },
    }),
    addDays(toDay(), -31),
  );
  const [[stats], people, tree] = await Promise.all([
    withProjectStats([project]),
    getPublicUsers([...(project.leadIds ?? []), ...(project.memberIds ?? [])]),
    // The company's projects, for the one above and the ones under it.
    db.project.findMany({
      where: {
        companyId: project.companyId,
        status: { notIn: [PROJECT_STATUS.ARCHIVED] },
      },
      select: {
        companyId: true,
        name: true,
        color: true,
        parentId: true,
        leadIds: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  return ok({
    project: {
      ...stats,
      progress: summarizeTasks(tasks)[project.id] ?? stats.progress,
    },
    tasks,
    people,
    tree,
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { response, project, user } = await requireProjectPermission(
    params.projectId,
    'projects:edit',
  );
  if (response || !project || !user)
    return response ?? fail(401, 'Authentication required.');

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = pick(body, EDITABLE);

  if ('name' in data) {
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) return fail(400, 'Project name is required.');
    data.name = name;
    data.slug = slugify(name);
  }
  if (
    'status' in data &&
    !Object.values(PROJECT_STATUS).includes(data.status as PROJECT_STATUS)
  ) {
    return fail(400, 'Unknown project status.');
  }
  if (project.isCore && data.status === PROJECT_STATUS.ARCHIVED)
    return fail(400, "The company's CORE project can't be archived.");
  if ('brandKit' in data) {
    const kit = sanitizeBrandKit(data.brandKit);
    data.brandKit = kit;
    // A kit fills in the logo when the project has none yet.
    const defaults = brandKitDefaults(kit);
    if (!(data.logo ?? project.logo) && defaults.logo)
      data.logo = defaults.logo;
  }
  if ('goals' in data)
    data.goals = sanitizeGoals(
      data.goals,
      project.goals ?? [],
      project.createdAt
        ? new Date(project.createdAt as string).toISOString().slice(0, 10)
        : null,
    );
  if ('effort' in data) {
    const effort = asEffort(data.effort);
    if (effort === undefined)
      return fail(400, 'Effort is LOW, MEDIUM or HIGH.');
    data.effort = effort;
  }
  if ('parentId' in data) {
    const parent = await checkParent(
      project.companyId,
      project.id,
      data.parentId,
    );
    if (parent.error) return fail(400, parent.error);
    data.parentId = parent.parentId;
  }
  if ('leadIds' in data) data.leadIds = asStringArray(data.leadIds);
  if ('memberIds' in data) data.memberIds = asStringArray(data.memberIds);

  const updated = await db.project.update({
    where: { id: project.id },
    data: { ...data, updatedAt: nowIso() },
  });
  // New goals set up their scheduled tasks; changed ones update them.
  // Goals make their tasks; their people follow the team.
  if ('goals' in data || 'leadIds' in data || 'memberIds' in data)
    await syncGoalSchedules(updated, project.goals ?? [], user.id);
  return ok({ project: updated });
}

/** Archives the project; its tasks and any worklog links stay intact. */
export async function DELETE(_request: Request, { params }: Params) {
  const { response, project } = await requireProjectPermission(
    params.projectId,
    'projects:delete',
  );
  if (response || !project)
    return response ?? fail(401, 'Authentication required.');
  if (project.isCore)
    return fail(400, "The company's CORE project can't be archived.");

  const updated = await db.project.update({
    where: { id: project.id },
    data: { status: PROJECT_STATUS.ARCHIVED, updatedAt: nowIso() },
  });
  return ok({ project: updated });
}
