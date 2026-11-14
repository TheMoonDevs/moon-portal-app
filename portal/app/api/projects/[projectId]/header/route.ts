import { db } from '@/lib/mongodb/db-client';
import { isAllowedInCompany } from '@/lib/permissions/company';
import {
  fail,
  nowIso,
  ok,
  requireProjectPermission,
} from '@/lib/workspace/server';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string } };

/**
 * The wide image at the top of a project's page (web and mobile): one of
 * the brand kit's images or one uploaded for it, set by a lead of the
 * project or anyone who may edit it. `image: null` goes back to the kit's
 * own banner.
 */
export async function PUT(request: Request, { params }: Params) {
  const { response, project, user, access } = await requireProjectPermission(
    params.projectId,
    'projects:read',
  );
  if (response || !project || !user)
    return response ?? fail(401, 'Authentication required.');
  const lead = (project.leadIds ?? []).includes(user.id);
  if (!lead && !isAllowedInCompany(user, access, 'projects:edit'))
    return fail(403, 'Only the project’s leads can change its header.');

  const body = await request.json().catch(() => ({}));
  const image =
    body.image === null || body.image === ''
      ? null
      : typeof body.image === 'string'
        ? body.image.trim()
        : undefined;
  if (image === undefined) return fail(400, 'image is an image URL or null.');

  // One of the brand kit's images, or one uploaded for the banner.
  if (image && !/^(https?:\/\/|\/)/.test(image))
    return fail(400, 'image is an image URL or null.');

  const updated = await db.project.update({
    where: { id: project.id },
    data: { headerImage: image, updatedAt: nowIso() },
  });
  return ok({ project: updated });
}
