import { db } from '@/lib/mongodb/db-client';
import {
  asEmoji,
  asPageContent,
  asPageTitle,
  PAGE_KINDS,
} from '@/lib/workspace/projectPages';
import { readParent } from '@/lib/workspace/projectPageServer';
import {
  fail,
  nowIso,
  ok,
  requireProjectPermission,
} from '@/lib/workspace/server';
import { PROJECT_PAGE_KIND, type ProjectPage } from '@/models/workspace';

export const dynamic = 'force-dynamic';

type Params = { params: { projectId: string } };

/**
 * The project's objective and its pages, most recently edited first. Pages
 * nest through `parentId`.
 */
export async function GET(_request: Request, { params }: Params) {
  const { response, project } = await requireProjectPermission(
    params.projectId,
    'projects:read',
  );
  if (response || !project)
    return response ?? fail(401, 'Authentication required.');

  const pages: ProjectPage[] = await db.projectPage.findMany({
    where: { projectId: project.id },
    orderBy: { updatedAt: 'desc' },
  });
  return ok({
    objective:
      pages.find((p) => p.kind === PROJECT_PAGE_KIND.OBJECTIVE) ?? null,
    pages: pages.filter((p) => p.kind === PROJECT_PAGE_KIND.IDEA),
  });
}

/**
 * Adds a page: `{ kind, title?, emoji?, content?, parentId? }`. A project has
 * one objective, so asking for another returns the one it has; the objective
 * sits outside the page tree.
 */
export async function POST(request: Request, { params }: Params) {
  const { response, user, project } = await requireProjectPermission(
    params.projectId,
    'projects:edit',
  );
  if (response || !user || !project)
    return response ?? fail(401, 'Authentication required.');

  const body = await request.json().catch(() => ({}));
  const kind = body.kind as PROJECT_PAGE_KIND;
  if (!PAGE_KINDS.includes(kind)) return fail(400, 'Unknown page kind.');
  const content = asPageContent(body.content ?? null);
  if (content === undefined) return fail(400, 'That page is not valid.');

  if (kind === PROJECT_PAGE_KIND.OBJECTIVE) {
    const existing = await db.projectPage.findFirst({
      where: { projectId: project.id, kind },
    });
    if (existing) return ok({ page: existing });
  }
  const parent =
    kind === PROJECT_PAGE_KIND.IDEA
      ? await readParent(project.id, body.parentId)
      : { parentId: null };
  if (parent.error) return fail(400, parent.error);

  const now = nowIso();
  const page = await db.projectPage.create({
    data: {
      companyId: project.companyId,
      projectId: project.id,
      kind,
      title: asPageTitle(body.title),
      emoji: asEmoji(body.emoji),
      content,
      parentId: parent.parentId,
      createdById: user.id,
      updatedById: user.id,
      createdAt: now,
      updatedAt: now,
    },
  });
  return ok({ page }, { status: 201 });
}
