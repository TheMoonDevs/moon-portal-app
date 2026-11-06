import { db } from '@/lib/mongodb/db-client';
import { PROJECT_PAGE_KIND, type ProjectPage } from '@/models/workspace';

import { fail, requireProjectPermission } from './server';
import { canSeePage, type SharingViewer } from './sharing';
import { sharingViewer } from './sharingServer';

/**
 * The page, when the person holds `permission` in its project and the page
 * (and every page above it) is shared with them. A page that is not shared
 * with them answers as if it did not exist.
 */
export async function requirePage(
  params: { projectId: string; pageId: string },
  permission: string,
): Promise<
  | {
      response: Response;
      user?: never;
      page?: never;
      viewer?: never;
      project?: never;
    }
  | {
      response: null;
      user: { id: string };
      page: ProjectPage;
      viewer: SharingViewer;
      project: { id: string; companyId: string };
    }
> {
  const guard = await requireProjectPermission(params.projectId, permission);
  if (guard.response || !guard.project || !guard.user)
    return {
      response: guard.response ?? fail(401, 'Authentication required.'),
    };
  const page: ProjectPage | null = await db.projectPage.findFirst({
    where: { id: params.pageId, projectId: guard.project.id },
  });
  if (!page) return { response: fail(404, 'Page not found.') };
  const viewer = await sharingViewer(guard.user);
  if (page.kind === PROJECT_PAGE_KIND.IDEA) {
    const pages: ProjectPage[] = await db.projectPage.findMany({
      where: { projectId: guard.project.id, kind: PROJECT_PAGE_KIND.IDEA },
    });
    if (!canSeePage(pages, page, viewer))
      return { response: fail(404, 'Page not found.') };
  }
  return {
    response: null,
    user: guard.user,
    page,
    viewer,
    project: guard.project,
  };
}
