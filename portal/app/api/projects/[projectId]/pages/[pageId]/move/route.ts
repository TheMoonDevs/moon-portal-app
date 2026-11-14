import { db } from '@/lib/mongodb/db-client';
import { requirePage } from '@/lib/workspace/pageAccess';
import { descendantIds } from '@/lib/workspace/projectPages';
import { projectPages, readParent } from '@/lib/workspace/projectPageServer';
import {
  fail,
  nowIso,
  ok,
  requireProjectPermission,
} from '@/lib/workspace/server';
import { canSeePage } from '@/lib/workspace/sharing';
import { PROJECT_PAGE_KIND, PROJECT_STATUS } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; pageId: string } };

/**
 * Moves a page, with every page inside it, to another project:
 * `{ projectId, parentId? }`. It lands at the top of that project's pages,
 * or inside `parentId` there. The person must be able to edit both
 * projects, and to open every page that moves, so nobody carries off pages
 * they cannot see.
 */
export async function POST(request: Request, { params }: Params) {
  const { response, user, page, viewer } = await requirePage(
    params,
    'projects:edit',
  );
  if (response) return response;
  if (page.kind !== PROJECT_PAGE_KIND.IDEA)
    return fail(400, 'The objective stays with its project.');

  const body = await request.json().catch(() => ({}));
  const targetId = typeof body.projectId === 'string' ? body.projectId : '';
  if (!targetId) return fail(400, 'Pick the project to move it to.');
  if (targetId === page.projectId)
    return fail(400, 'The page is already in that project.');

  const target = await requireProjectPermission(targetId, 'projects:edit');
  if (target.response || !target.project)
    return target.response ?? fail(404, 'Project not found.');
  if (target.project.status === PROJECT_STATUS.ARCHIVED)
    return fail(400, 'That project is archived.');

  const parent = await readParent(
    target.project.id,
    body.parentId,
    undefined,
    viewer,
  );
  if (parent.error) return fail(400, parent.error);

  const pages = await projectPages(page.projectId);
  const ids = [page.id, ...Array.from(descendantIds(pages, page.id))];
  const hidden = pages.filter(
    (p) => ids.includes(p.id) && !canSeePage(pages, p, viewer),
  );
  if (hidden.length)
    return fail(
      403,
      'Some pages inside it are not shared with you, so it cannot be moved.',
    );

  const now = nowIso();
  await db.projectPage.updateMany({
    where: { id: { in: ids } },
    data: {
      projectId: target.project.id,
      companyId: target.project.companyId,
      updatedAt: now,
    },
  });
  const moved = await db.projectPage.update({
    where: { id: page.id },
    data: { parentId: parent.parentId, updatedById: user.id, updatedAt: now },
  });
  return ok({ page: moved, moved: ids, projectId: target.project.id });
}
