import { db } from '@/lib/mongodb/db-client';
import { docToMarkdown, markdownToDoc } from '@/lib/workspace/pageMarkdown';
import {
  ancestorPages,
  asEmoji,
  asPageContent,
  asPageTitle,
  childPages,
} from '@/lib/workspace/projectPages';
import {
  deletePageTree,
  projectPages,
  readParent,
} from '@/lib/workspace/projectPageServer';
import { PROJECT_PAGE_KIND, type ProjectPage } from '@/models/workspace';

import { type Tool, ToolError } from './shared';
import { findProject } from './workspace';

/*
 * A project's pages: Notion-like documents that nest, pages inside pages.
 * Assistants read and write their bodies as Markdown.
 */

const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

const titleOf = (page: Pick<ProjectPage, 'title'>) =>
  page.title?.trim() || 'Untitled';

/** "Handbook / Policies / Leave", the page's place in the tree. */
const pathOf = (pages: ProjectPage[], page: ProjectPage) =>
  [...ancestorPages(pages, page.id), page].map(titleOf).join(' / ');

/** A page by id, exact title or path ("Handbook / Leave"). */
function findPage(pages: ProjectPage[], ref: unknown) {
  const wanted = typeof ref === 'string' ? ref.trim() : '';
  if (!wanted) throw new ToolError('Give the page id or title.');
  const matches = pages.filter(
    (p) =>
      p.id === wanted ||
      same(titleOf(p), wanted) ||
      same(pathOf(pages, p), wanted),
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1)
    throw new ToolError(
      `More than one page is called "${wanted}". Use its id: ${matches
        .map((p) => `${p.id} (${pathOf(pages, p)})`)
        .join(', ')}.`,
    );
  throw new ToolError(
    `No page "${wanted}" in this project. Call list_pages to see them.`,
  );
}

type TreeNode = {
  id: string;
  title: string;
  emoji?: string;
  pages?: TreeNode[];
};

const tree = (pages: ProjectPage[], parentId: string | null): TreeNode[] =>
  childPages(pages, parentId).map((p) => {
    const inside = tree(pages, p.id);
    return {
      id: p.id,
      title: titleOf(p),
      ...(p.emoji && { emoji: p.emoji }),
      ...(inside.length && { pages: inside }),
    };
  });

const pageLink = (origin: string, page: ProjectPage) =>
  `${origin}/projects/${page.projectId}?view=pages&page=${page.id}`;

function pageView(pages: ProjectPage[], page: ProjectPage, origin: string) {
  const parent = pages.find((p) => p.id === page.parentId);
  return {
    id: page.id,
    title: titleOf(page),
    ...(page.emoji && { emoji: page.emoji }),
    path: pathOf(pages, page),
    ...(parent && { parent: { id: parent.id, title: titleOf(parent) } }),
    pagesInside: childPages(pages, page.id).map((p) => ({
      id: p.id,
      title: titleOf(p),
    })),
    updatedAt: page.updatedAt,
    url: pageLink(origin, page),
    content: docToMarkdown(page.content),
  };
}

/** A page body from Markdown, within the size a page may have. */
function body(markdown: string) {
  const content = asPageContent(markdownToDoc(markdown));
  if (!content) throw new ToolError('That page is too long to save.');
  return content;
}

async function parentFor(
  projectId: string,
  pages: ProjectPage[],
  ref: unknown,
  pageId?: string,
) {
  const parentId =
    ref === undefined || ref === null || ref === ''
      ? null
      : findPage(pages, ref).id;
  const checked = await readParent(projectId, parentId, pageId);
  if (checked.error) throw new ToolError(checked.error);
  return checked.parentId;
}

const PROJECT = {
  type: 'string',
  description: 'Project id or name.',
};
const PAGE = {
  type: 'string',
  description: 'Page id, exact title, or path like "Handbook / Leave".',
};

export const PAGE_TOOLS: Tool[] = [
  {
    name: 'list_pages',
    title: 'List project pages',
    description:
      "A project's pages as a tree (pages can sit inside pages), with their ids. Read one with get_page.",
    inputSchema: {
      type: 'object',
      properties: { project: PROJECT },
      required: ['project'],
    },
    annotations: { readOnlyHint: true },
    run: async (user, args, { origin }) => {
      const project = await findProject(user, args?.project, 'projects:read');
      const pages = await projectPages(project.id);
      return {
        project: project.name,
        url: `${origin}/projects/${project.id}?view=pages`,
        pages: tree(pages, null),
      };
    },
  },
  {
    name: 'get_page',
    title: 'Read a project page',
    description:
      'A project page with its body as Markdown, where it sits in the tree, and the pages inside it.',
    inputSchema: {
      type: 'object',
      properties: { project: PROJECT, page: PAGE },
      required: ['project', 'page'],
    },
    annotations: { readOnlyHint: true },
    run: async (user, args, { origin }) => {
      const project = await findProject(user, args?.project, 'projects:read');
      const pages = await projectPages(project.id);
      return { page: pageView(pages, findPage(pages, args?.page), origin) };
    },
  },
  {
    name: 'create_page',
    title: 'Create a project page',
    description:
      'Adds a page to a project, at the top or inside another page (parent). Write the body in Markdown: headings, lists, to-dos (- [ ]), quotes, code, bold, italic and links.',
    inputSchema: {
      type: 'object',
      properties: {
        project: PROJECT,
        title: { type: 'string' },
        emoji: { type: 'string', description: 'One emoji for its icon.' },
        content: { type: 'string', description: 'The body, in Markdown.' },
        parent: {
          ...PAGE,
          description: `The page to put it inside (optional). ${PAGE.description}`,
        },
      },
      required: ['project', 'title'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    run: async (user, args, { origin }) => {
      const project = await findProject(user, args?.project, 'projects:edit');
      const pages = await projectPages(project.id);
      const title = asPageTitle(args?.title);
      if (!title) throw new ToolError('Give the page a title.');
      const parentId = await parentFor(project.id, pages, args?.parent);
      const now = new Date().toISOString();
      const page: ProjectPage = await db.projectPage.create({
        data: {
          companyId: project.companyId,
          projectId: project.id,
          kind: PROJECT_PAGE_KIND.IDEA,
          title,
          emoji: asEmoji(args?.emoji) ?? '📄',
          content: body(typeof args?.content === 'string' ? args.content : ''),
          parentId,
          createdById: user.id,
          updatedById: user.id,
          createdAt: now,
          updatedAt: now,
        },
      });
      return { page: pageView([...pages, page], page, origin) };
    },
  },
  {
    name: 'update_page',
    title: 'Change a project page',
    description:
      'Changes a project page: its title, emoji, body (content replaces it, append adds Markdown at the end), or where it sits (parent: another page, or "" for the top; the pages inside it move along).',
    inputSchema: {
      type: 'object',
      properties: {
        project: PROJECT,
        page: PAGE,
        title: { type: 'string' },
        emoji: { type: 'string' },
        content: {
          type: 'string',
          description: 'The whole new body, in Markdown.',
        },
        append: {
          type: 'string',
          description: 'Markdown to add at the end of the body.',
        },
        parent: {
          type: 'string',
          description: 'Move it inside this page; "" moves it to the top.',
        },
      },
      required: ['project', 'page'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    run: async (user, args, { origin }) => {
      const project = await findProject(user, args?.project, 'projects:edit');
      const pages = await projectPages(project.id);
      const page = findPage(pages, args?.page);
      const data: Partial<ProjectPage> = {};
      if (typeof args?.title === 'string') {
        data.title = asPageTitle(args.title);
        if (!data.title) throw new ToolError('A page needs a title.');
      }
      if (args?.emoji !== undefined) data.emoji = asEmoji(args.emoji);
      if (typeof args?.content === 'string') data.content = body(args.content);
      if (typeof args?.append === 'string' && args.append.trim()) {
        const before =
          typeof args?.content === 'string'
            ? args.content
            : docToMarkdown(page.content);
        data.content = body(`${before}\n\n${args.append}`);
      }
      if (args?.parent !== undefined)
        data.parentId = await parentFor(
          project.id,
          pages,
          args.parent,
          page.id,
        );
      if (!Object.keys(data).length)
        throw new ToolError('Say what to change on the page.');
      const updated: ProjectPage = await db.projectPage.update({
        where: { id: page.id },
        data: {
          ...data,
          updatedById: user.id,
          updatedAt: new Date().toISOString(),
        },
      });
      return {
        page: pageView(
          pages.map((p) => (p.id === updated.id ? updated : p)),
          updated,
          origin,
        ),
      };
    },
  },
  {
    name: 'delete_page',
    title: 'Delete a project page',
    description:
      'Deletes a project page and every page inside it. Confirm with the person first.',
    inputSchema: {
      type: 'object',
      properties: { project: PROJECT, page: PAGE },
      required: ['project', 'page'],
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
    run: async (user, args) => {
      const project = await findProject(user, args?.project, 'projects:edit');
      const pages = await projectPages(project.id);
      const page = findPage(pages, args?.page);
      const ids = await deletePageTree(page);
      return {
        deleted: pathOf(pages, page),
        ...(ids.length > 1 && { alsoDeleted: ids.length - 1 }),
      };
    },
  },
];
