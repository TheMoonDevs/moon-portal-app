import { db } from '@/lib/mongodb/db-client';
import {
  asEmoji,
  asPageContent,
  asPageTitle,
} from '@/lib/workspace/projectPages';
import {
  fail,
  nowIso,
  ok,
  requireProjectPermission,
} from '@/lib/workspace/server';
import { PROJECT_PAGE_KIND, type ProjectPage } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string; pageId: string } };

async function requirePage(params: Params['params'], permission: string) {
  const guard = await requireProjectPermission(params.projectId, permission);
  if (guard.response || !guard.project || !guard.user)
    return {
      response: guard.response ?? fail(401, 'Authentication required.'),
    };
  const page: ProjectPage | null = await db.projectPage.findFirst({
    where: { id: params.pageId, projectId: guard.project.id },
  });
  if (!page) return { response: fail(404, 'Page not found.') };
  return { response: null, user: guard.user, page };
}

export async function GET(_request: Request, { params }: Params) {
  const { response, page } = await requirePage(params, 'projects:read');
  if (response || !page) return response;
  return ok({ page });
}

/** Saves `{ title?, emoji?, content? }`. */
export async function PATCH(request: Request, { params }: Params) {
  const { response, user, page } = await requirePage(params, 'projects:edit');
  if (response || !page || !user) return response;

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if ('title' in body) data.title = asPageTitle(body.title);
  if ('emoji' in body) data.emoji = asEmoji(body.emoji);
  if ('content' in body) {
    const content = asPageContent(body.content);
    if (content === undefined) return fail(400, 'That page is not valid.');
    data.content = content;
  }

  const updated = await db.projectPage.update({
    where: { id: page.id },
    data: { ...data, updatedById: user.id, updatedAt: nowIso() },
  });
  return ok({ page: updated });
}

/** Deletes an idea. The objective stays; clear it instead. */
export async function DELETE(_request: Request, { params }: Params) {
  const { response, page } = await requirePage(params, 'projects:edit');
  if (response || !page) return response;
  if (page.kind === PROJECT_PAGE_KIND.OBJECTIVE)
    return fail(400, 'The objective cannot be deleted.');
  await db.projectPage.delete({ where: { id: page.id } });
  return ok({ deleted: page.id });
}
