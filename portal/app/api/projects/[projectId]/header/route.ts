import type { BrandKit } from '@/lib/brandKit';
import { db } from '@/lib/mongodb/db-client';
import { isAllowedInCompany } from '@/lib/permissions/company';
import {
  fail,
  nowIso,
  ok,
  requireProjectPermission,
} from '@/lib/workspace/server';
import type { Company } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string } };

/**
 * The image at the top of a project's page in the mobile app: one of the
 * brand kit's images (the company's kit for its CORE project), picked by a
 * lead of the project or anyone who may edit it. `image: null` goes back to
 * the kit's own banner.
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

  if (image) {
    const company: Company | null = project.isCore
      ? await db.company.findFirst({ where: { id: project.companyId } })
      : null;
    const kits: (BrandKit | null | undefined)[] = [
      project.brandKit,
      company?.brandKit,
    ];
    const images = kits.flatMap((kit) =>
      (kit?.assets ?? []).filter((a) => a.kind === 'image').map((a) => a.url),
    );
    if (!images.includes(image))
      return fail(400, 'Pick one of the brand kit’s images.');
  }

  const updated = await db.project.update({
    where: { id: project.id },
    data: { headerImage: image, updatedAt: nowIso() },
  });
  return ok({ project: updated });
}
