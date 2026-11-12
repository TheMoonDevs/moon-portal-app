import { db } from '@/lib/mongodb/db-client';
import { requirePage } from '@/lib/workspace/pageAccess';
import { docToMarkdown, markdownToDoc } from '@/lib/workspace/pageMarkdown';
import {
  asEmoji,
  asPageContent,
  asPageTitle,
} from '@/lib/workspace/projectPages';
import { deletePageTree, readParent } from '@/lib/workspace/projectPageServer';
import { fail, nowIso, ok } from '@/lib/workspace/server';
import { PROJECT_PAGE_KIND } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; pageId: string } };

/**
 * The page. With `?format=markdown` it also carries its body as Markdown
 * (`markdown`), the way the app edits it.
 */
export async function GET(request: Request, { params }: Params) {
  const { response, page } = await requirePage(params, 'projects:read');
  if (response) return response;
  const markdown =
    new URL(request.url).searchParams.get('format') === 'markdown';
  return ok({
    page,
    ...(markdown && { markdown: docToMarkdown(page.content) }),
  });
}

/**
 * Saves `{ title?, emoji?, content?, markdown?, parentId? }`: the body as the
 * editor's document (`content`) or as Markdown (`markdown`, from the app). A
 * new parentId moves the page (and the pages inside it) under another page,
 * or to the top when empty. Sharing is changed with PUT …/sharing.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { response, user, page, viewer } = await requirePage(
    params,
    'projects:edit',
  );
  if (response) return response;

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if ('title' in body) data.title = asPageTitle(body.title);
  if ('emoji' in body) data.emoji = asEmoji(body.emoji);
  if ('content' in body || typeof body.markdown === 'string') {
    const content = asPageContent(
      typeof body.markdown === 'string'
        ? markdownToDoc(body.markdown)
        : body.content,
    );
    if (content === undefined) return fail(400, 'That page is not valid.');
    data.content = content;
  }
  if ('parentId' in body && page.kind === PROJECT_PAGE_KIND.IDEA) {
    const parent = await readParent(
      page.projectId,
      body.parentId,
      page.id,
      viewer,
    );
    if (parent.error) return fail(400, parent.error);
    data.parentId = parent.parentId;
  }

  const updated = await db.projectPage.update({
    where: { id: page.id },
    data: { ...data, updatedById: user.id, updatedAt: nowIso() },
  });
  return ok({ page: updated });
}

/**
 * Deletes a page with every page inside it. The objective stays; clear it
 * instead.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const { response, page, viewer } = await requirePage(params, 'projects:edit');
  if (response) return response;
  if (page.kind === PROJECT_PAGE_KIND.OBJECTIVE)
    return fail(400, 'The objective cannot be deleted.');
  const { ids, error } = await deletePageTree(page, viewer);
  if (error) return fail(403, error);
  return ok({ deleted: ids });
}
