import { db } from '@/lib/mongodb/db-client';
import { PROJECT_PAGE_KIND, type ProjectPage } from '@/models/workspace';

import { descendantIds } from './projectPages';

/** The project's pages (not its objective), oldest first. */
export const projectPages = (projectId: string): Promise<ProjectPage[]> =>
  db.projectPage.findMany({
    where: { projectId, kind: PROJECT_PAGE_KIND.IDEA },
    orderBy: { createdAt: 'asc' },
  });

/**
 * The parent a page may sit inside, from an untrusted value: null for the top
 * level, or an error when it is not a page of the project, or when `pageId`
 * would end up inside itself.
 */
export async function readParent(
  projectId: string,
  value: unknown,
  pageId?: string,
): Promise<{ parentId: string | null; error?: string }> {
  const invalid = (error: string) => ({ parentId: null, error });
  if (value === null || value === undefined || value === '')
    return { parentId: null };
  if (typeof value !== 'string') return invalid('That parent is not valid.');
  const pages = await projectPages(projectId);
  if (!pages.some((p) => p.id === value))
    return invalid('The parent page is not in this project.');
  if (pageId && (value === pageId || descendantIds(pages, pageId).has(value)))
    return invalid('A page cannot go inside itself.');
  return { parentId: value };
}

/** Deletes a page and every page inside it; returns their ids. */
export async function deletePageTree(page: ProjectPage) {
  const pages = await projectPages(page.projectId);
  const ids = [page.id, ...Array.from(descendantIds(pages, page.id))];
  await db.projectPage.deleteMany({ where: { id: { in: ids } } });
  return ids;
}
