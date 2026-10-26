import { brandKitDefaults, sanitizeBrandKit } from '@/lib/brandKit';
import { db } from '@/lib/mongodb/db-client';
import { sanitizeGoals } from '@/lib/workspace/projects';
import {
  asStringArray,
  fail,
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
] as const;

export async function GET(_request: Request, { params }: Params) {
  const { response, project } = await requireProjectPermission(
    params.projectId,
    'projects:read',
  );
  if (response || !project)
    return response ?? fail(401, 'Authentication required.');

  const tasks = await db.task.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'asc' },
  });
  return ok({
    project: {
      ...project,
      progress: summarizeTasks(tasks)[project.id] ?? null,
    },
    tasks,
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
  if ('goals' in data) data.goals = sanitizeGoals(data.goals);
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
