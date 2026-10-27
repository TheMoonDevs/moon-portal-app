import { brandKitDefaults, sanitizeBrandKit } from '@/lib/brandKit';
import { db } from '@/lib/mongodb/db-client';
import { sanitizeGoals } from '@/lib/workspace/projects';
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
  const [tasks, [stats], people] = await Promise.all([
    db.task.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: 'asc' },
    }),
    withProjectStats([project]),
    getPublicUsers([...(project.leadIds ?? []), ...(project.memberIds ?? [])]),
  ]);
  return ok({
    project: {
      ...stats,
      progress: summarizeTasks(tasks)[project.id] ?? stats.progress,
    },
    tasks,
    people,
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { response, project } = await requireProjectPermission(
    params.projectId,
    'projects:edit',
  );
  if (response || !project)
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

  const updated = await db.project.update({
    where: { id: project.id },
    data: { status: PROJECT_STATUS.ARCHIVED, updatedAt: nowIso() },
  });
  return ok({ project: updated });
}
