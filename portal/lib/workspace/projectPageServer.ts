import { db } from '@/lib/mongodb/db-client';
import { PROJECT_PAGE_KIND, type ProjectPage } from '@/models/workspace';

import { descendantIds } from './projectPages';
import { canSeePage, type SharingViewer, visiblePages } from './sharing';

/**
 * The project's pages (not its objective), oldest first. With a `viewer`,
 * only the pages they may open (see ./sharing).
 */
export async function projectPages(
  projectId: string,
  viewer?: SharingViewer,
): Promise<ProjectPage[]> {
  const pages: ProjectPage[] = await db.projectPage.findMany({
    where: { projectId, kind: PROJECT_PAGE_KIND.IDEA },
    orderBy: { createdAt: 'asc' },
  });
  return viewer ? visiblePages(pages, viewer) : pages;
}

/**
 * The parent a page may sit inside, from an untrusted value: null for the top
 * level, or an error when it is not a page of the project (that the `viewer`
 * can open), or when `pageId` would end up inside itself.
 */
export async function readParent(
  projectId: string,
  value: unknown,
  pageId?: string,
  viewer?: SharingViewer,
): Promise<{ parentId: string | null; error?: string }> {
  const invalid = (error: string) => ({ parentId: null, error });
  if (value === null || value === undefined || value === '')
    return { parentId: null };
  if (typeof value !== 'string') return invalid('That parent is not valid.');
  const all = await projectPages(projectId);
  const parent = all.find((p) => p.id === value);
  if (!parent || (viewer && !canSeePage(all, parent, viewer)))
    return invalid('The parent page is not in this project.');
  if (pageId && (value === pageId || descendantIds(all, pageId).has(value)))
    return invalid('A page cannot go inside itself.');
  return { parentId: value };
}

/**
 * Deletes a page and every page inside it; returns their ids. With a
 * `viewer`, refuses when some page inside is not shared with them, so no one
 * deletes pages they cannot see.
 */
export async function deletePageTree(
  page: ProjectPage,
  viewer?: SharingViewer,
): Promise<{ ids?: string[]; error?: string }> {
  const pages = await projectPages(page.projectId);
  const ids = [page.id, ...Array.from(descendantIds(pages, page.id))];
  if (viewer) {
    const hidden = pages.filter(
      (p) => ids.includes(p.id) && !canSeePage(pages, p, viewer),
    );
    if (hidden.length)
      return {
        error:
          'Some pages inside it are not shared with you, so it cannot be deleted.',
      };
  }
  await db.projectPage.deleteMany({ where: { id: { in: ids } } });
  return { ids };
}
