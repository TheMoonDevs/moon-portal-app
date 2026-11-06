import { db } from '@/lib/mongodb/db-client';
import { requirePage } from '@/lib/workspace/pageAccess';
import { fail, ok } from '@/lib/workspace/server';
import { readSharing } from '@/lib/workspace/sharing';
import { companyMemberIds } from '@/lib/workspace/sharingServer';
import { PROJECT_PAGE_KIND } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; pageId: string } };

/**
 * Sets who can open the page and the pages inside it:
 * `{ restricted, userIds }`. Not restricted, it follows the project. Only
 * people who can edit the project's pages and open this page can change it;
 * they stay on the list themselves.
 */
export async function PUT(request: Request, { params }: Params) {
  const { response, user, page, project } = await requirePage(
    params,
    'projects:edit',
  );
  if (response) return response;
  if (page.kind !== PROJECT_PAGE_KIND.IDEA)
    return fail(400, 'The objective is always open to the whole project.');

  const body = await request.json().catch(() => null);
  const { sharing, error } = readSharing(
    body,
    await companyMemberIds(project.companyId),
    user.id,
  );
  if (error || !sharing) return fail(400, error ?? 'Invalid sharing.');

  const updated = await db.projectPage.update({
    where: { id: page.id },
    data: { sharing },
  });
  return ok({ page: updated });
}
