import { moveProject } from '@/lib/workspace/moveProject';
import {
  fail,
  ok,
  requireCompanyPermission,
  requireProjectPermission,
} from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string } };

/**
 * Moves the project (and its sub-projects) to another company. Needs
 * `projects:edit` where it is now and `projects:create` where it goes.
 */
export async function POST(request: Request, { params }: Params) {
  const { response, project } = await requireProjectPermission(
    params.projectId,
    'projects:edit',
  );
  if (response || !project) return response ?? fail(404, 'Project not found.');
  if (project.isCore)
    return fail(400, "The company's CORE project stays with its company.");

  const body = await request.json().catch(() => ({}));
  const companyId = typeof body.companyId === 'string' ? body.companyId : '';
  if (companyId === project.companyId)
    return fail(400, 'The project is already in that company.');
  const target = await requireCompanyPermission(companyId, 'projects:create');
  if (target.response) return target.response;

  const result = await moveProject(project, companyId);
  return ok(result);
}
